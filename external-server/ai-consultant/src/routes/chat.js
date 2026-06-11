import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../lib/prompt.js';
import { ALLOWED_UPLOADS, TEXT_INLINE_MAX_BYTES, readUploadBytes } from '../lib/uploads.js';
import { getTool, getToolDefinitionsForAnthropic } from '../lib/tools.js';
import { log } from '../lib/log.js';

// Constructed at module load — throws on boot if ANTHROPIC_API_KEY is missing.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const chatRouter = Router();

// Safety cap on consecutive tool-use rounds within a single user turn.
const MAX_TOOL_ROUNDS = 8;

// ============================================================================
// Validation.
// ============================================================================

function validateAttachments(attachments) {
  if (attachments === undefined) return null;
  if (!Array.isArray(attachments)) return 'attachments must be an array if present';
  for (const a of attachments) {
    if (!a || typeof a.id !== 'string') return 'each attachment must have id: string';
  }
  return null;
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return 'each message must have role: "user"|"assistant" and content: string';
    }
    const attErr = validateAttachments(m.attachments);
    if (attErr) return attErr;
  }
  if (messages[0].role !== 'user') return 'first message must have role: "user"';
  return null;
}

// ============================================================================
// Wire-shape → Anthropic message conversion (attachments → image blocks).
// ============================================================================

function attachmentToBlock(a) {
  const meta = readUploadBytes(a.id);
  if (!meta) {
    return {
      type: 'text',
      text: `[attachment ${a.id} unavailable — server was restarted or upload expired]`,
    };
  }
  const spec = ALLOWED_UPLOADS[meta.mimeType];
  if (spec?.kind === 'image' || spec?.kind === 'pdf') {
    return {
      type: spec.kind === 'image' ? 'image' : 'document',
      source: {
        type: 'base64',
        media_type: meta.mimeType,
        data: meta.bytes.toString('base64'),
      },
    };
  }
  if (spec?.kind === 'text') {
    const truncated = meta.bytes.length > TEXT_INLINE_MAX_BYTES;
    const slice = truncated ? meta.bytes.subarray(0, TEXT_INLINE_MAX_BYTES) : meta.bytes;
    const note = truncated
      ? ` (truncated to ${Math.floor(TEXT_INLINE_MAX_BYTES / 1024)} KB of ${Math.floor(meta.bytes.length / 1024)} KB)`
      : '';
    return {
      type: 'text',
      text: `[Attached file: ${meta.filename} (${meta.mimeType})${note}]\n\n${slice.toString('utf8')}`,
    };
  }
  return {
    type: 'text',
    text: `[attachment "${meta.filename}" of type ${meta.mimeType} is not yet supported in chat]`,
  };
}

function toAnthropicMessage(m) {
  const attachments = m.attachments || [];
  if (attachments.length === 0) {
    return { role: m.role, content: m.content };
  }
  const blocks = attachments.map(attachmentToBlock);
  if (m.content) blocks.push({ type: 'text', text: m.content });
  return { role: m.role, content: blocks };
}

// ============================================================================
// One Anthropic round — streams text deltas, collects tool_use blocks.
// ============================================================================

function handleBlockStart(state, event, ctx) {
  const cb = event.content_block;
  const block = { ...cb };
  if (cb.type === 'text') block.text = '';
  else if (cb.type === 'thinking') block.thinking = '';
  else if (cb.type === 'tool_use') {
    block.input = {};
    state.toolJsonBuf.set(event.index, '');
    // Surface the tool-use block to the client the moment the model commits
    // to it, before its (potentially large) JSON input has finished
    // streaming. The client renders the tool-runs card on tool_intent and
    // the eventual tool_start becomes a no-op for the same toolUseId — so
    // the user doesn't see a frozen gap during input streaming for tools
    // with big payloads (generate_report's report body in particular).
    ctx?.write?.({
      type: 'tool_intent',
      tool: cb.name,
      toolUseId: cb.id,
    });
  }
  state.blocks[event.index] = block;
}

function handleBlockDelta(state, event, ctx) {
  const block = state.blocks[event.index];
  const d = event.delta;
  if (!block || !d) return;
  if (d.type === 'text_delta') {
    block.text += d.text;
    ctx.write({ type: 'delta', text: d.text });
  } else if (d.type === 'thinking_delta') {
    block.thinking += d.thinking;
  } else if (d.type === 'input_json_delta') {
    state.toolJsonBuf.set(event.index, (state.toolJsonBuf.get(event.index) || '') + d.partial_json);
  }
}

function handleBlockStop(state, event, ctx) {
  const block = state.blocks[event.index];
  if (!block) return;
  if (block.type === 'text') {
    // Signal that this text block is finished so the client can stop
    // suppressing the "still working" indicator. The client uses this to tell
    // "text actively streaming" apart from "text block done, waiting for the
    // next thing" (typically a tool_use that hasn't surfaced as tool_start
    // yet). Without it, the user sees a frozen moment between the last delta
    // and tool_start.
    ctx?.write?.({ type: 'text_stop' });
    return;
  }
  if (block.type !== 'tool_use') return;
  const raw = state.toolJsonBuf.get(event.index) || '';
  try {
    block.input = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('[chat] failed to parse tool input JSON:', err.message, raw);
    block.input = {};
  }
}

function handleMessageStart(state, event) {
  if (event.message?.usage) Object.assign(state.usage, event.message.usage);
}

function handleMessageDelta(state, event) {
  if (event.delta?.stop_reason) state.stopReason = event.delta.stop_reason;
  if (event.usage) Object.assign(state.usage, event.usage);
}

const EVENT_HANDLERS = {
  message_start: handleMessageStart,
  message_delta: handleMessageDelta,
  content_block_start: handleBlockStart,
  content_block_delta: handleBlockDelta,
  content_block_stop: handleBlockStop,
};

async function runOneRound({ client, messages, tools, ctx }) {
  const stream = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL,
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools,
    messages,
    stream: true,
  });

  const state = {
    blocks: [],
    toolJsonBuf: new Map(),
    stopReason: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };

  for await (const event of stream) {
    const handler = EVENT_HANDLERS[event.type];
    if (handler) handler(state, event, ctx);
  }

  return {
    blocks: state.blocks.filter(Boolean),
    stopReason: state.stopReason,
    usage: state.usage,
  };
}

// ============================================================================
// Tool execution. Each tool can emit progress events; we tag them with the
// tool's name + tool_use_id and forward to the NDJSON channel.
// ============================================================================

async function executeToolUse({ toolUse, ctx }) {
  const tool = getTool(toolUse.name);
  log.tool('start', { tool: toolUse.name, id: toolUse.id });
  ctx.write({
    type: 'tool_start',
    tool: toolUse.name,
    toolUseId: toolUse.id,
    input: toolUse.input,
  });

  if (!tool) {
    const message = `Unknown tool: ${toolUse.name}`;
    log.warn('unknown tool', { tool: toolUse.name });
    ctx.write({ type: 'tool_end', tool: toolUse.name, toolUseId: toolUse.id, ok: false, error: message });
    return { tool_use_id: toolUse.id, content: message, is_error: true };
  }

  const emit = (evt) => {
    ctx.write({ ...evt, tool: toolUse.name, toolUseId: toolUse.id });
  };

  const started = Date.now();
  try {
    const result = await tool.run({ input: toolUse.input, emit });
    log.tool('end ok', { tool: toolUse.name, id: toolUse.id, ms: Date.now() - started });
    ctx.write({ type: 'tool_end', tool: toolUse.name, toolUseId: toolUse.id, ok: true });
    return {
      tool_use_id: toolUse.id,
      content: JSON.stringify(result),
      is_error: false,
    };
  } catch (err) {
    log.warn('tool failed', { tool: toolUse.name, id: toolUse.id, ms: Date.now() - started, err: err?.message });
    const message = err?.message || String(err);
    ctx.write({ type: 'tool_end', tool: toolUse.name, toolUseId: toolUse.id, ok: false, error: message });
    return {
      tool_use_id: toolUse.id,
      content: `Tool error: ${message}`,
      is_error: true,
    };
  }
}

// ============================================================================
// POST /api/v1/ai-consultant/chat
// Body:  { messages: [{ role, content, attachments? }, ...] }
// Response: NDJSON event stream
//   {"type":"delta","text":"..."}
//   {"type":"tool_start","tool":"...","toolUseId":"...","input":{...}}
//   {"type":"tool_progress","tool":"...","toolUseId":"...","message":"..."}
//   {"type":"tool_end","tool":"...","toolUseId":"...","ok":bool,"error"?:"..."}
//   {"type":"done","stopReason":"...","usage":{...}}
//   {"type":"error","code":"...","message":"..."}
// ============================================================================

chatRouter.post('/', async (req, res) => {
  const validationError = validateMessages(req.body?.messages);
  if (validationError) {
    return res
      .status(400)
      .json({ error: { code: 'invalid_request', message: validationError } });
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const ctx = {
    write: (obj) => {
      if (!res.writableEnded) res.write(JSON.stringify(obj) + '\n');
    },
  };

  let messages = req.body.messages.map(toAnthropicMessage);
  const tools = getToolDefinitionsForAnthropic();

  let stopReason = null;
  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const roundStart = Date.now();
      const result = await runOneRound({ client: anthropic, messages, tools, ctx });
      const roundMs = Date.now() - roundStart;
      stopReason = result.stopReason;
      // Sum usage across rounds.
      usage.input_tokens += result.usage.input_tokens || 0;
      usage.output_tokens += result.usage.output_tokens || 0;
      usage.cache_creation_input_tokens += result.usage.cache_creation_input_tokens || 0;
      usage.cache_read_input_tokens += result.usage.cache_read_input_tokens || 0;

      const toolUses = result.blocks.filter((b) => b.type === 'tool_use');
      const textBlocks = result.blocks.filter((b) => b.type === 'text');

      // Per-round timing. Splits model-side latency (this log line's `ms`)
      // from server-side tool-execution latency (the existing `log.tool`
      // start/end pair around executeToolUse). For tool-using rounds the
      // round's `ms` includes both the AI's text deltas AND the JSON
      // streaming of the tool_use block's `input` — which is where a verbose
      // tool input (e.g. `relatedResearch.papers[]` on generate_report) adds
      // wall-clock time before the server ever sees the tool handler.
      log.chat('round done', {
        round,
        ms: roundMs,
        stopReason,
        outputTokens: result.usage.output_tokens || 0,
        inputTokens: result.usage.input_tokens || 0,
        cacheReadTokens: result.usage.cache_read_input_tokens || 0,
        toolUses: toolUses.map((t) => t.name),
        textBlocks: textBlocks.length,
      });

      if (stopReason !== 'tool_use' || toolUses.length === 0) {
        break;
      }

      // Append the assistant turn (with tool_use blocks) and the corresponding
      // tool_result user turn, then loop. Filter out thinking blocks with empty
      // text — Opus 4.7 omits thinking content by default (`display: "omitted"`),
      // and Anthropic 400s if we send empty thinking blocks back on the next
      // round ("each thinking block must contain thinking").
      const replayBlocks = result.blocks.filter(
        (b) => b.type !== 'thinking' || (b.thinking && b.thinking.length > 0),
      );
      messages.push({ role: 'assistant', content: replayBlocks });

      const toolResults = [];
      for (const t of toolUses) {
        const r = await executeToolUse({ toolUse: t, ctx });
        toolResults.push({ type: 'tool_result', ...r });
      }
      messages.push({ role: 'user', content: toolResults });

      if (round === MAX_TOOL_ROUNDS - 1) {
        ctx.write({
          type: 'error',
          code: 'tool_loop_cap',
          message: `Reached the ${MAX_TOOL_ROUNDS}-round tool-use cap.`,
        });
      }
    }

    ctx.write({ type: 'done', stopReason, usage });
    res.end();
  } catch (err) {
    log.warn('anthropic loop error', { err: err?.message || String(err), status: err?.status });
    const code = err?.status === 429 ? 'rate_limited' : err?.code || 'anthropic_error';
    ctx.write({
      type: 'error',
      code,
      message: err?.message || 'Anthropic API error',
    });
    res.end();
  }
});
