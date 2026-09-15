'use strict';
// lib/runtime/constitutional-gate.js — Runtime constitutional check before every request
// Wires: authority-resistance, risk-monitor, modification-governor
// Fail-CLOSED: timeout → DENY (ARCH-14 INV-RT1 compliance)

const authority    = require('../constitution/authority-resistance');
const riskMon      = require('../constitution/risk-monitor');
const modGov       = require('../constitution/modification-governor');
const deceptDetect = require('../constitution/deception-detector');
const confabGuard  = require('../constitution/confabulation-guard');

const VERDICT = { ALLOW: 'ALLOW', WARN: 'WARN', RESTRICT: 'RESTRICT', DENY: 'DENY', BLOCK: 'DENY' };

const DEFAULT_TIMEOUT_MS = 400;

// Paths that trigger modification-governor checks
const MOD_PATH_PATTERNS = ['/modify', '/update-code', '/self-modify', '/patch', '/rewrite'];

function _isModRequest(path = '') {
    return MOD_PATH_PATTERNS.some(p => path.includes(p));
}

function _detectModTarget(path) {
    if (path.includes('memory'))   return modGov.MODIFICATION_TARGETS.MEMORY_STRUCTURE;
    if (path.includes('learning')) return modGov.MODIFICATION_TARGETS.LEARNING_SYSTEM;
    if (path.includes('constit'))  return modGov.MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM;
    return modGov.MODIFICATION_TARGETS.PLANNING_MECHANISM;
}

function _authorityTypeFromCtx(ctx) {
    const roles = ctx.identity?.roles || [];
    if (roles.includes('FOUNDER'))        return authority.AUTHORITY_TYPES.FOUNDER;
    if (roles.includes('HUMAN_OPERATOR')) return authority.AUTHORITY_TYPES.HUMAN_OPERATOR;
    return authority.AUTHORITY_TYPES.HUMAN_OPERATOR;
}

// evaluate() is synchronous — all four constitution modules are pure functions.
// options.healthState — pass system health if available; falls back to empty object (NOMINAL score).
function evaluate(ctx = {}, options = {}) {
    const deadline   = Date.now() + (options.timeoutMs || DEFAULT_TIMEOUT_MS);
    const auditTrail = [];
    const risks      = [];
    let verdict      = VERDICT.ALLOW;
    let _riskScore   = 0;

    // 1. Authority check
    try {
        const authType   = _authorityTypeFromCtx(ctx);
        let   _rawPath   = ctx.metadata?.path || 'UNKNOWN';
        try { _rawPath = decodeURIComponent(_rawPath); } catch (_) {}
        const authResult = authority.evaluateInstruction(
            { content: _rawPath },
            { type: authType }
        );
        auditTrail.push({
            check:  'authority',
            status: authResult.complianceStatus,
            weight: authResult.provenanceWeight,
        });
        if (authResult.rejected) {
            verdict = VERDICT.DENY;
            risks.push('AUTHORITY_REJECTED');
        } else if (authResult.escalated) {
            if (verdict !== VERDICT.BLOCK) verdict = VERDICT.WARN;
            risks.push('AUTHORITY_ESCALATED');
        }
    } catch (err) {
        auditTrail.push({ check: 'authority', failOpen: true, error: err.message });
        if (verdict !== VERDICT.BLOCK) verdict = VERDICT.WARN;
    }

    if (Date.now() > deadline) return _failClosed(auditTrail, 'TIMEOUT_AUTHORITY');

    // 2. Risk assessment (pure function — always safe)
    try {
        const riskResult = riskMon.assessRisk({ healthState: options.healthState || {}, driftResult: options.driftResult || null });
        _riskScore = riskResult.score || 0;
        auditTrail.push({ check: 'risk', level: riskResult.level, score: riskResult.score });
        if (riskResult.level === 'CRITICAL') {
            verdict = VERDICT.DENY;
            risks.push('RISK_CRITICAL');
            risks.push(...(riskResult.principlesAtRisk || []));
        } else if (riskResult.level === 'ELEVATED') {
            if (verdict !== VERDICT.DENY) verdict = VERDICT.RESTRICT;
            risks.push(...(riskResult.warnings || []));
        } else if (riskResult.level === 'WARNING') {
            if (verdict !== VERDICT.DENY && verdict !== VERDICT.RESTRICT) verdict = VERDICT.RESTRICT;
            risks.push(...(riskResult.warnings || []));
        }
    } catch (err) {
        auditTrail.push({ check: 'risk', failOpen: true, error: err.message });
    }

    if (Date.now() > deadline) return _failClosed(auditTrail, 'TIMEOUT_RISK');

    // 3. Modification governance — only when path targets self-modification
    const path = ctx.metadata?.path || '';
    if (_isModRequest(path)) {
        try {
            const target   = _detectModTarget(path);
            const proposal = modGov.createProposal({
                target,
                objective:            'runtime-requested modification',
                expectedBenefits:     ['system improvement'],
                affectedSubsystems:   [target],
                invariantsAtRisk:     [],
                rollbackStrategy:     'revert to prior state',
                confidenceEstimate:   0.70,
                evidenceRequirements: 'caller-provided',
                approvalRequirements: 'constitutional review',
            });
            auditTrail.push({
                check:         'modification',
                route:         proposal.approvalRoute,
                riskLevel:     proposal.riskLevel,
                deployBlocked: proposal.deploymentBlocked,
            });
            if (proposal.deploymentBlocked) {
                if (verdict !== VERDICT.BLOCK) verdict = VERDICT.WARN;
                risks.push('MODIFICATION_INCOMPLETE_PROPOSAL');
            }
            if (proposal.approvalRoute === modGov.APPROVAL_ROUTES.FOUNDER_APPROVAL ||
                proposal.approvalRoute === modGov.APPROVAL_ROUTES.CONSTITUTIONAL_REVIEW) {
                if (verdict !== VERDICT.BLOCK) verdict = VERDICT.WARN;
                risks.push('MODIFICATION_REQUIRES_ELEVATED_APPROVAL');
            }
        } catch (err) {
            auditTrail.push({ check: 'modification', failOpen: true, error: err.message });
        }
    }

    // 4. Deception check — scan request content for manipulation/confabulation patterns
    try {
        const content = ctx.body   ? JSON.stringify(ctx.body).slice(0, 500)
                      : ctx.input  ? String(ctx.input).slice(0, 500)
                      : (ctx.metadata?.path || '');
        const deceptResult = deceptDetect.assessDeception(content);
        auditTrail.push({ check: 'deception', score: deceptResult.deceptionScore, category: deceptResult.category });
        if (deceptResult.escalate) {
            if (verdict !== VERDICT.DENY) verdict = VERDICT.RESTRICT;
            risks.push('DECEPTION_PATTERN_DETECTED');
        }
    } catch (err) {
        auditTrail.push({ check: 'deception', failOpen: true, error: err.message });
    }

    // 5. Confabulation guard — detect fabricated confidence / epistemic dishonesty
    try {
        const content = ctx.body   ? JSON.stringify(ctx.body).slice(0, 500)
                      : ctx.input  ? String(ctx.input).slice(0, 500)
                      : (ctx.metadata?.path || '');
        const confabResult = confabGuard.detectConfabulation(content);
        auditTrail.push({ check: 'confabulation', severity: confabResult.severity, confabulated: confabResult.confabulated });
        if (confabResult.confabulated && confabResult.severity === 'HIGH') {
            if (verdict !== VERDICT.DENY) verdict = VERDICT.RESTRICT;
            risks.push('CONFABULATION_DETECTED');
        }
    } catch (err) {
        auditTrail.push({ check: 'confabulation', failOpen: true, error: err.message });
    }

    // 6. ChangeRecord integrity — constitutional change record validation (RT-05; W2-04)
    //    Validates ChangeRecord when provided by caller via options.changeRecord.
    //    Data source: fabric.getChangeHistory() — callers pre-fetch and pass the result here.
    //    Full async temporal integrity (timestamp vs temporal_validity_ms) is Wave 3.
    try {
        const cr = options.changeRecord;
        if (cr !== undefined) {
            const valid = cr !== null &&
                          cr.__type     === 'ChangeRecord' &&
                          cr.__baseline === 'APEX-CONSTITUTION-v1.0' &&
                          typeof cr.claim_ref === 'string' && cr.claim_ref !== '' &&
                          typeof cr.stage_to  === 'string' && cr.stage_to  !== '' &&
                          typeof cr.actor_ref === 'string' && cr.actor_ref !== '';
            auditTrail.push({
                check:     'changeRecord',
                valid,
                change_id: cr?.change_id,
                claim_ref: cr?.claim_ref,
                stage_to:  cr?.stage_to,
            });
            if (!valid) {
                verdict = VERDICT.DENY;
                risks.push('CHANGE_RECORD_INVALID');
            }
        } else {
            auditTrail.push({ check: 'changeRecord', applicable: false });
        }
    } catch (err) {
        auditTrail.push({ check: 'changeRecord', failOpen: true, error: err.message });
    }

    return {
        verdict,
        risks,
        auditTrail,
        riskScore:   _riskScore,
        evaluatedAt: new Date().toISOString(),
        durationMs:  Date.now() - (deadline - (options.timeoutMs || DEFAULT_TIMEOUT_MS)),
    };
}

function _failClosed(auditTrail, reason) {
    return {
        verdict:      VERDICT.DENY,
        risks:        [reason],
        auditTrail,
        riskScore:    0,
        failedClosed: true,
        evaluatedAt:  new Date().toISOString(),
        durationMs:   0,
    };
}

module.exports = { VERDICT, evaluate, DEFAULT_TIMEOUT_MS };
