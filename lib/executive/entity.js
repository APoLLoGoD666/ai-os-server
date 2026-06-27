'use strict';
// lib/executive/entity.js — base class for all 6 APEX Executive Entities

const { getSupabaseClient } = require('../clients');
const sanitizer = require('../memory/sanitizer');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

class ExecutiveEntity {
  constructor({ id, name, systemPrompt, memoryAccess, decisionRights, escalationRules }) {
    this.id               = id;
    this.name             = name;
    this.systemPrompt     = systemPrompt;
    this.memoryAccess     = memoryAccess;     // array of layer numbers this entity can read
    this.decisionRights   = decisionRights;
    this.escalationRules  = escalationRules;
  }

  // Make a decision. Returns { decision, confidence, rationale, escalate, entity }
  async decide(question, context = {}) {
    const gateway       = require('../memory/gateway');
    const modelSelector = require('../models/selector');

    const taskId = `EXEC-${this.id}-${Date.now()}`;
    const relevantMemory = await gateway.getContext({
      taskId,
      description:       question,
      category:          'executive_decision',
      complexity:        'moderate',
      modelFormat:       'claude',
      tokenBudget:       4000,
      requestingEntity:  this.id,
    });

    // Phase 7 — Domain-specific institutional memory (source-prioritised retrieval)
    let domainContext = [];
    try {
      const domainMem = require('./domain-memory');
      domainContext = await domainMem.getDomainContext(this.id, 3);
    } catch {}

    const model  = modelSelector.select('balanced');
    const result = await model.complete(question, {
      ...relevantMemory,
      domain_context: domainContext.map(d => (typeof d.content === 'string' ? d.content : JSON.stringify(d.content)).slice(0, 150)),
      founder_context:  relevantMemory.founder_context || {},
      // WS2/Phase 23C: executive identity delivered outside founder_context so it
      // is NOT stripped by abstractForExternalPrompt (these fields are not PII)
      executive_context: {
        executive_role:  this.name,
        decision_rights: this.decisionRights,
        system_prompt:   this.systemPrompt,
      },
    }, { maxTokens: 1024 });

    const decision     = this._parseDecision(result.content);
    const shouldEscalate = this._shouldEscalate(question, decision);

    await this._logDecision(question, decision, shouldEscalate);

    // B10 fix: record lesson influence for domain_context items used in this decision
    if (domainContext.length) {
      setImmediate(() => {
        const _rfx = require('../memory/reflexion-tracker');
        for (const d of domainContext) {
          const text = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
          if (text) _rfx.recordInfluence(text, taskId, 'executive_decision').catch(() => {});
        }
      });
    }

    return { ...decision, escalate: shouldEscalate, entity: this.id };
  }

  _shouldEscalate(question, decision) {
    for (const rule of this.escalationRules || []) {
      if (rule.condition(question, decision)) return true;
    }
    return (decision.confidence || 1) < 0.6;
  }

  async _logDecision(question, decision, escalated) {
    const { error } = await _sb().from('executive_decisions').insert({
      entity_id:  this.id,
      question:   sanitizer.sanitize(question.slice(0, 500)),
      decision:   sanitizer.sanitize(decision.choice || decision.decision || 'no decision'),
      rationale:  sanitizer.sanitize(decision.rationale || ''),
      confidence: decision.confidence || 0.7,
      escalated,
      created_at: new Date().toISOString(),
    });
    if (error) logger.warn('executive', 'decision log failed', { entity: this.id, error: error.message });
  }

  _parseDecision(content) {
    try {
      const match = content.match(/```json\n([\s\S]+?)\n```/);
      if (match) return JSON.parse(match[1]);
      // Try raw JSON
      const jsonMatch = content.match(/\{[\s\S]+\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    return { choice: content.slice(0, 200), rationale: '', confidence: 0.7 };
  }
}

module.exports = ExecutiveEntity;
