'use strict';
// lib/models/providers/anthropic.js — Claude provider (current primary)

const Anthropic = require('@anthropic-ai/sdk');
const { ModelInterface, ModelResult } = require('../interface');
const vault = require('../../secrets/vault');

class AnthropicModel extends ModelInterface {
  constructor(modelId, config) {
    super({ modelId, provider: 'anthropic', ...config });
    this._client = null;  // lazy init — vault may not be ready at require time
  }

  _getClient() {
    if (!this._client) {
      this._client = new Anthropic({ apiKey: vault.get('ANTHROPIC_API_KEY') });
    }
    return this._client;
  }

  _adaptContext(contextPackage) {
    const rawFounder = contextPackage?.founder_context || {};
    // Phase 23A: abstract before injecting into external API — no raw PII leaves system
    const { abstractForExternalPrompt } = require('../../founder/privacy-guard');
    const founder = abstractForExternalPrompt(rawFounder) || rawFounder;
    // Phase 23C/WS2: executive_context carries role identity and is NOT abstracted (not PII)
    const exec = contextPackage?.executive_context || {};
    const lessons = contextPackage?.lessons || [];
    const constraints = contextPackage?.constraints || {};

    const systemParts = [
      exec.system_prompt || 'You are APEX, Alex\'s personal AI operating system.',
      exec.executive_role   ? `Role: ${exec.executive_role}` : '',
      exec.decision_rights  ? `Decision authority: ${JSON.stringify(exec.decision_rights).slice(0, 200)}` : '',
      founder.identity             ? `Operator: ${founder.identity}` : '',
      founder.alignment_guidance   ? founder.alignment_guidance : '',
      founder.relevant_values?.length ? `Values: ${founder.relevant_values.slice(0, 3).join(', ')}` : '',
      constraints.cost_cap_usd
        ? `Cost cap: $${constraints.cost_cap_usd}/run. Deployment: ${constraints.deployment_policy || 'staged'}.` : '',
      lessons.length
        ? `Key lessons:\n${lessons.slice(0, 5).map(l => `- ${l.content}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const hist = contextPackage?.historical_context?.similar_tasks || [];
    const userParts = [
      `Task: ${contextPackage?.task?.description || ''}`,
      contextPackage?.project_context
        ? `Project: ${contextPackage.project_context.active_project} | Phase: ${contextPackage.project_context.current_phase}` : '',
      hist.length
        ? `Similar past tasks:\n${hist.map(t => `- ${t.description} (${t.outcome}, ${t.days_ago}d ago)`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    return {
      system:   systemParts,
      messages: [{ role: 'user', content: userParts }],
    };
  }

  async complete(taskDescription, contextPackage, options = {}) {
    const adapted = this._adaptContext(contextPackage);
    const start   = Date.now();

    const response = await this._getClient().messages.create({
      model:      this.modelId,
      max_tokens: options.maxTokens || 4096,
      system:     adapted.system,
      messages:   adapted.messages,
      ...(options.tools ? { tools: options.tools } : {}),
    });

    return new ModelResult({
      content:      response.content[0]?.text || '',
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason:   response.stop_reason,
      modelId:      this.modelId,
      provider:     'anthropic',
      durationMs:   Date.now() - start,
    });
  }

  async * stream(taskDescription, contextPackage, options = {}) {
    const adapted = this._adaptContext(contextPackage);
    const stream  = this._getClient().messages.stream({
      model:      this.modelId,
      max_tokens: options.maxTokens || 4096,
      system:     adapted.system,
      messages:   adapted.messages,
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  async ping() {
    try {
      const r = await this._getClient().messages.create({
        model: this.modelId, max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return r.stop_reason === 'end_turn';
    } catch { return false; }
  }
}

module.exports = AnthropicModel;
