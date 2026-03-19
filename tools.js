// Claude API tool definitions for the AI assistant.
// Each entry follows Anthropic's tool format: { name, description, input_schema }.

module.exports.TOOLS = [
  {
    name: 'get_problem_state',
    description: 'Read the current document structure, rules, and code. Use this after making changes to verify the result or plan next steps. Returns { problem, rules, code }.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'insert_block',
    description: 'Insert a new block at a given position in the document. Returns the auto-assigned blockId. For tables: always omit content (a default 2×2 table is created), then use modify_table to add rows/columns to the desired size.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['paragraph', 'heading1', 'heading2', 'heading3', 'bulletList', 'orderedList', 'choiceList', 'table'],
          description: 'The block type to insert.',
        },
        position: {
          type: 'number',
          description: '0-based index among top-level blocks. 0 = before the first block.',
        },
        content: {
          type: 'array',
          description: 'Optional ProseMirror JSON content array. For paragraph/heading: inline nodes. For lists: listItem or choiceItem nodes. For tables: tableRow nodes. If omitted, a default empty block is created.',
        },
        attrs: {
          type: 'object',
          description: 'Optional block-level attributes: textColor (hex), textAlign (left|center|right|justify), blockIndent (0-5).',
        },
      },
      required: ['type', 'position'],
    },
  },
  {
    name: 'update_block_content',
    description: 'Replace the content of an existing paragraph, heading, or list block. Does not work on tables (use update_table_cell instead).',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the target block.',
        },
        content: {
          type: 'array',
          description: 'New ProseMirror JSON content array. For paragraph/heading: inline nodes. For lists: listItem or choiceItem nodes.',
        },
      },
      required: ['blockId', 'content'],
    },
  },
  {
    name: 'update_table_cell',
    description: 'Replace the inline content of a single table cell.',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the table block.',
        },
        row: {
          type: 'number',
          description: '0-based row index.',
        },
        column: {
          type: 'number',
          description: '0-based column index.',
        },
        content: {
          type: 'array',
          description: 'ProseMirror JSON inline content array for the cell.',
        },
      },
      required: ['blockId', 'row', 'column', 'content'],
    },
  },
  {
    name: 'delete_block',
    description: 'Remove a top-level block from the document. Also removes any rules associated with widgets inside the block.',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the block to delete.',
        },
      },
      required: ['blockId'],
    },
  },
  {
    name: 'move_block',
    description: 'Move a top-level block to a new position in the document.',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the block to move.',
        },
        position: {
          type: 'number',
          description: 'Target 0-based index. 0 = before the first block.',
        },
      },
      required: ['blockId', 'position'],
    },
  },
  {
    name: 'set_block_formatting',
    description: 'Set visual formatting attributes on a block. Only provided attributes are changed.',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the target block.',
        },
        textColor: {
          type: 'string',
          enum: ['#1f2225', '#657587', '#9ea4aa', '#0400ff', '#0064ff', '#00bae5', '#00ca85', '#c400ff', '#ef052a', '#ff9200', '#864d00', '#d4a600'],
          description: 'Hex color from the supported palette.',
        },
        textAlign: {
          type: 'string',
          enum: ['left', 'center', 'right', 'justify'],
        },
        blockIndent: {
          type: 'number',
          description: 'Indentation level, 0-5.',
        },
      },
      required: ['blockId'],
    },
  },
  {
    name: 'set_list_layout',
    description: 'Set the visual layout of a list block (bulletList, orderedList, or choiceList).',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the list block.',
        },
        layout: {
          type: 'string',
          enum: ['stacked', 'inline', 'grid'],
        },
        gridColumns: {
          type: 'number',
          enum: [2, 3, 4],
          description: 'Required when layout is "grid".',
        },
      },
      required: ['blockId', 'layout'],
    },
  },
  {
    name: 'configure_widget',
    description: 'Set properties on an inline widget (textField or buttonToken). Only provide the properties relevant to the widget type.',
    input_schema: {
      type: 'object',
      properties: {
        widgetId: {
          type: 'string',
          description: 'UUID of the widget.',
        },
        width: {
          type: 'string',
          enum: ['small', 'medium', 'large'],
          description: 'Text field width. Only valid for textField widgets.',
        },
        buttonText: {
          type: 'string',
          description: 'Display text. Only valid for buttonToken widgets.',
        },
        buttonColor: {
          type: 'string',
          enum: ['primary', 'secondary', 'tertiary', 'danger'],
          description: 'Button color. Only valid for buttonToken widgets.',
        },
      },
      required: ['widgetId'],
    },
  },
  {
    name: 'modify_table',
    description: 'Change the structure or border visibility of a table. Operations are applied in order: add first, then remove. Min size 2×2, max 16×16.',
    input_schema: {
      type: 'object',
      properties: {
        blockId: {
          type: 'string',
          description: 'UUID of the table block.',
        },
        addRows: {
          type: 'number',
          description: 'Number of rows to append at the bottom.',
        },
        removeRows: {
          type: 'number',
          description: 'Number of rows to remove from the bottom.',
        },
        addColumns: {
          type: 'number',
          description: 'Number of columns to append at the right.',
        },
        removeColumns: {
          type: 'number',
          description: 'Number of columns to remove from the right.',
        },
        hideBorders: {
          type: 'boolean',
          description: 'Toggle cell border visibility.',
        },
      },
      required: ['blockId'],
    },
  },
  {
    name: 'add_rule',
    description: 'Add a correct answer rule, try-again hint rule, or button action to a widget.',
    input_schema: {
      type: 'object',
      properties: {
        widgetId: {
          type: 'string',
          description: 'UUID of the target widget (textField, choiceList, or buttonToken).',
        },
        category: {
          type: 'string',
          enum: ['correct', 'hint', 'action'],
        },
        type: {
          type: 'string',
          description: 'Function name (e.g. "isExactMatch", "isChoiceMatch", or any user-defined rule function).',
        },
        args: {
          type: 'array',
          description: 'Argument values passed to the function after the target parameter. Each value must be a string, number, or boolean.',
          items: {},
        },
        hint: {
          type: 'string',
          description: 'Hint message. Required for category "hint", ignored for "correct" and "action".',
        },
      },
      required: ['widgetId', 'category', 'type'],
    },
  },
  {
    name: 'update_rule',
    description: 'Modify an existing rule\'s function, arguments, or hint message.',
    input_schema: {
      type: 'object',
      properties: {
        widgetId: {
          type: 'string',
          description: 'UUID of the widget.',
        },
        category: {
          type: 'string',
          enum: ['correct', 'hint', 'action'],
        },
        ruleId: {
          type: 'string',
          description: 'UUID of the rule to update.',
        },
        type: {
          type: 'string',
          description: 'New function name.',
        },
        args: {
          type: 'array',
          description: 'New argument values.',
          items: {},
        },
        hint: {
          type: 'string',
          description: 'New hint message (hint rules only).',
        },
      },
      required: ['widgetId', 'category', 'ruleId'],
    },
  },
  {
    name: 'delete_rule',
    description: 'Remove a rule from a widget.',
    input_schema: {
      type: 'object',
      properties: {
        widgetId: {
          type: 'string',
          description: 'UUID of the widget.',
        },
        category: {
          type: 'string',
          enum: ['correct', 'hint', 'action'],
        },
        ruleId: {
          type: 'string',
          description: 'UUID of the rule to delete.',
        },
      },
      required: ['widgetId', 'category', 'ruleId'],
    },
  },
  {
    name: 'replace_code',
    description: 'Replace the full evaluation code source and save it. Returns detected rule functions on success, or an error for syntax errors. Runtime errors are allowed (code is saved anyway).',
    input_schema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The complete new JavaScript source code.',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'replace_document',
    description: 'Replace the entire document content. Use for creating a problem from scratch or major restructuring. WARNING: clears all existing rules since widget IDs are reassigned. After this call, use get_problem_state to learn the new IDs before adding rules.',
    input_schema: {
      type: 'object',
      properties: {
        doc: {
          type: 'object',
          description: 'Full ProseMirror document JSON: { type: "doc", content: [...] }. IDs may be omitted — they are auto-assigned.',
        },
      },
      required: ['doc'],
    },
  },
]
