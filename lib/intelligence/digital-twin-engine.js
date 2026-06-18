'use strict';
// lib/intelligence/digital-twin-engine.js
// Simulates decisions, projects, investments, acquisitions, and hiring scenarios.
// Returns expected outcomes, risks, confidence, and recommended path.

const logger = require('../logger');

function _baseContext() {
  const gateway = require('../memory/gateway');
  return gateway.getContext({
    taskId:          `twin-${Date.now()}`,
    description:     'digital twin simulation',
    category:        'simulation',
    complexity:      'moderate',
    modelFormat:     'claude',
    tokenBudget:     4000,
    requestingEntity: 'digital_twin',
  }).catch(() => ({}));
}

async function _simulate(type, subject, params, contextHint) {
  const modelSelector = require('../models/selector');
  const model = modelSelector.select('balanced');
  const ctx = await _baseContext();

  const rawFounderCtx = ctx.founder_context || {};
  // WS6/Phase 23: abstract before sending to external API — no raw PII leaves system
  const { abstractForExternalPrompt } = require('../founder/privacy-guard');
  const founderCtx = abstractForExternalPrompt(rawFounderCtx) || rawFounderCtx;
  const lessons = (ctx.lessons || []).slice(0, 4).map(l => `- ${typeof l.content === 'string' ? l.content.slice(0, 150) : ''}`).join('\n');

  const founderSummary = [
    founderCtx.alignment_guidance,
    founderCtx.peak_state_prompt,
    founderCtx.abstracted_behavioral_guidance?.length
      ? founderCtx.abstracted_behavioral_guidance.slice(0, 3).map(g => `• ${g}`).join('\n') : null,
    founderCtx.relevant_values?.length ? `Values: ${founderCtx.relevant_values.slice(0,3).join(', ')}` : null,
  ].filter(Boolean).join('\n') || '(no founder alignment available)';

  const prompt = `You are the APEX Digital Twin — a simulation engine for Alex's personal AI OS.

Founder alignment:
${founderSummary}
${lessons ? `Relevant lessons:\n${lessons}\n` : ''}

SIMULATION TYPE: ${type.toUpperCase()}
SUBJECT: ${subject}
PARAMETERS: ${JSON.stringify(params)}

${contextHint}

Simulate this scenario and return JSON:
{
  "expected_outcomes": [{ "outcome": string, "probability": number 0-1, "timeline": string }],
  "risks": [{ "risk": string, "severity": "low" | "medium" | "high" | "critical", "mitigation": string }],
  "confidence": number 0-1 (confidence in this simulation),
  "recommended_path": string (2-3 sentences: what to do and why),
  "decision": "proceed" | "modify" | "defer" | "reject",
  "key_assumptions": string[]
}`;

  try {
    const result = await model.complete(prompt, { task: { description: prompt } }, { maxTokens: 1500 });
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { type, subject, params, simulation: parsed, simulatedAt: new Date().toISOString() };
    }
    throw new Error('No JSON in response');
  } catch (e) {
    logger.warn('digital-twin', `${type} simulation failed`, { error: e.message });
    return {
      type, subject, params, simulatedAt: new Date().toISOString(),
      simulation: {
        expected_outcomes: [],
        risks: [{ risk: 'Simulation failed', severity: 'medium', mitigation: 'Retry or manual assessment' }],
        confidence: 0.3,
        recommended_path: 'Insufficient data for confident simulation.',
        decision: 'defer',
        key_assumptions: [],
      },
    };
  }
}

// Simulate a specific decision (e.g. "Should we add voice streaming to the dashboard?")
async function simulateDecision(question, options = {}) {
  return _simulate(
    'decision',
    question,
    options,
    `Simulate the decision: "${question}". Consider both choosing to proceed and choosing not to.
Options provided: ${JSON.stringify(options)}
Focus on: impact on APEX capability, cost implications, time investment, second-order effects.`
  );
}

// Simulate a project (e.g. "Build a mobile app client")
async function simulateProject(projectName, specs = {}) {
  return _simulate(
    'project',
    projectName,
    specs,
    `Simulate executing this project: "${projectName}".
Specs: ${JSON.stringify(specs)}
Estimate: effort (hours/weeks), cost (API/infra), probability of success, capability impact, risk of scope creep.`
  );
}

// Simulate an investment (e.g. "Upgrade to Claude Opus 4.7 for all pipeline tasks")
async function simulateInvestment(investmentDescription, financials = {}) {
  return _simulate(
    'investment',
    investmentDescription,
    financials,
    `Simulate this investment decision: "${investmentDescription}".
Financial parameters: ${JSON.stringify(financials)}
Estimate: ROI timeline, monthly cost delta, capability uplift, break-even point.
APEX context: bootstrapped, no external funding, $30/month API budget target.`
  );
}

// Simulate an acquisition (e.g. "Integrate a third-party API service")
async function simulateAcquisition(targetDescription, terms = {}) {
  return _simulate(
    'acquisition',
    targetDescription,
    terms,
    `Simulate acquiring/integrating: "${targetDescription}".
Terms/details: ${JSON.stringify(terms)}
Estimate: integration complexity, lock-in risk, capability gain, ongoing cost, alternatives.`
  );
}

// Simulate a hiring/agent decision (e.g. "Add a dedicated Research Agent to the pipeline")
async function simulateHiring(roleDescription, context = {}) {
  return _simulate(
    'hiring',
    roleDescription,
    context,
    `Simulate adding this role/agent to APEX: "${roleDescription}".
Context: ${JSON.stringify(context)}
Estimate: capability uplift, pipeline impact, cost (API tokens/month), complexity added, risk of failure.
Consider: existing agent pipeline, orchestrator load, memory impact.`
  );
}

module.exports = {
  simulateDecision,
  simulateProject,
  simulateInvestment,
  simulateAcquisition,
  simulateHiring,
};
