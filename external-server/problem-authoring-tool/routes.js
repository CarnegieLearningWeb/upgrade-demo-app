import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { TOOLS } from './tools.js'
import { SYSTEM_PROMPT } from './prompt.js'

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 1000

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function isRetryableError(err) {
  const status = err.status
  if (status === 429 || status === 529 || status === 503) return true
  return (err.message || '').toLowerCase().includes('overloaded')
}

function handleStreamEvent(event, state, res) {
  if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
    state.currentToolUse = {
      id: event.content_block.id,
      name: event.content_block.name,
      inputJSON: '',
    }
    res.write(`data: ${JSON.stringify({
      type: 'tool_start',
      name: event.content_block.name,
    })}\n\n`)
    return
  }

  if (event.type === 'content_block_delta') {
    if (event.delta?.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`)
    } else if (event.delta?.type === 'input_json_delta' && state.currentToolUse) {
      state.currentToolUse.inputJSON += event.delta.partial_json
    }
    return
  }

  if (event.type === 'content_block_stop' && state.currentToolUse) {
    let input = {}
    try { input = JSON.parse(state.currentToolUse.inputJSON) } catch { input = {} }
    res.write(`data: ${JSON.stringify({
      type: 'tool_use',
      id: state.currentToolUse.id,
      name: state.currentToolUse.name,
      input,
    })}\n\n`)
    state.currentToolUse = null
    return
  }

  if (event.type === 'message_delta' && event.delta?.stop_reason) {
    state.stopReason = event.delta.stop_reason
  }
}

export function createProblemAuthoringToolRouter({ auth } = {}) {
  const router = express.Router()

  router.post('/chat', auth, async (req, res) => {
    const { messages } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let contentSent = false
      const resTracker = {
        write(data) { contentSent = true; return res.write(data) },
      }

      try {
        const stream = anthropicClient.messages.stream({
          model: process.env.ANTHROPIC_MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        })

        const state = { currentToolUse: null, stopReason: 'end_turn' }
        for await (const event of stream) {
          handleStreamEvent(event, state, resTracker)
        }

        res.write(`data: ${JSON.stringify({ type: 'done', stop_reason: state.stopReason })}\n\n`)
        res.end()
        return
      } catch (err) {
        const canRetry = !contentSent && isRetryableError(err) && attempt < MAX_RETRIES

        if (canRetry) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt)
          console.warn(
            `Retryable API error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message}. ` +
            `Retrying in ${delay}ms...`,
          )
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        console.error('Claude API error:', err.message)
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
        res.end()
        return
      }
    }
  })

  return router
}
