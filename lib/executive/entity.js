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

    const relevantMemory = await gateway.getContext({
      taskId:            `EXEC-${this.id}-${Date.now()}`,
      description:       question,
      category:          'executive_decision',
      complexity:        'moderate',
      modelFormat:       'claude',
      tokenBudget:       4000,
      requestingEntity:  this.id,
    });

    const model  = modelSelector.select('balanced');
    const result = await model.complete(question, {
      ...relevantMemory,
      founder_context: {
        ...(relevantMemory.founder_context || {}),
        executive_role:   this.name,
        decision_rights:  this.decisionRights,
        system_prompt:    this.systemPrompt,
      },
    }, { maxTokens: 1024 });

    const decision     = this._parseDecision(result.content);
    const shouldEscalate = this._shouldEscalate(question, decision);

    await this._logDecision(question, decision, shouldEscalate);
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
