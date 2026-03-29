/**
 * Base Agent — the archetype all specialized agents inherit from.
 *
 * Uses the Anthropic Claude API with tool-use loop.
 * Logs every step to the SSE activity feed so the dashboard shows live progress.
 *
 * Usage:
 *   class MyAgent extends BaseAgent {
 *     constructor() { super('MyAgent', MODEL, tools, toolExecutors); }
 *   }
 *   await agent.run(systemPrompt, userMessage, context);
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../utils/logger');

// Default model — haiku for most tasks (12x cheaper than sonnet, handles emails/scoring/updates well).
// Sonnet for complex tasks (estimates, proposals, contracts) — override in subclass.
// Opus only for chat assistant where quality matters most.
const DEFAULT_MODEL = process.env.AGENT_MODEL || 'claude-3-5-haiku-20241022';
const MAX_ITERATIONS = 20;

class BaseAgent {
  /**
   * @param {string} name          - Display name for logging
   * @param {string} model         - Anthropic model ID
   * @param {Array}  toolDefs      - Anthropic-format tool definitions
   * @param {Object} toolExecutors - Map of tool name → async function(args, context)
   */
  constructor(name, model = DEFAULT_MODEL, toolDefs = [], toolExecutors = {}) {
    this.name          = name;
    this.model         = model;
    this.toolDefs      = toolDefs;
    this.toolExecutors = toolExecutors;
    this.client        = null; // lazy init
  }

  getClient() {
    if (!this.client) {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  /**
   * Run the agent loop.
   * @param {string} systemPrompt
   * @param {string} userMessage
   * @param {Object} context       - Arbitrary context passed to tool executors
   * @returns {string}             - Final text response
   */
  async run(systemPrompt, userMessage, context = {}) {
    logger.agent(this.name, `Starting — ${userMessage.slice(0, 80)}…`);

    const messages = [{ role: 'user', content: userMessage }];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      let response;
      try {
        response = await this.getClient().messages.create({
          model:      this.model,
          max_tokens: 4096,
          system:     systemPrompt,
          tools:      this.toolDefs,
          messages,
        });
      } catch (err) {
        logger.error(this.name, `API error: ${err.message}`);
        throw err;
      }

      messages.push({ role: 'assistant', content: response.content });

      // If no tool calls → we're done
      if (response.stop_reason === 'end_turn') {
        const text = response.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('');
        logger.success(this.name, `Done — ${text.slice(0, 100)}…`);
        return text;
      }

      // Process tool_use blocks
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      if (toolUseBlocks.length === 0) {
        // Shouldn't happen but guard against infinite loop
        break;
      }

      const toolResults = [];
      for (const block of toolUseBlocks) {
        logger.info(this.name, `→ ${block.name}`, { args: block.input });
        let result;
        try {
          const executor = this.toolExecutors[block.name];
          if (!executor) throw new Error(`Unknown tool: ${block.name}`);
          result = await executor(block.input, context);
          logger.info(this.name, `← ${block.name}: ${String(result).slice(0, 120)}`);
        } catch (err) {
          result = `Error: ${err.message}`;
          logger.error(this.name, `Tool ${block.name} failed: ${err.message}`);
        }
        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     String(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    logger.warn(this.name, 'Reached max iterations without end_turn');
    return '';
  }
}

module.exports = { BaseAgent, DEFAULT_MODEL };
