'use strict';
// lib/executive/cfo.js — Executive CFO Integration Layer
// Canonical financial authority. Delegates to specialised modules — never bypasses them.
// Contradictions remain visible. Human override always possible. All assumptions disclosed.

const fe          = require('../finance/forecast-engine');
const se          = require('../finance/scenario-engine');
const ds          = require('../finance/decision-support');
const syncHealth  = require('../finance/sync/sync-health');
const syncProv    = require('../finance/sync/sync-provenance');
const tax         = require('../finance/tax');
const recon       = require('../finance/reconciliation-engine');
const healthScore = require('../finance/financial-health-score');

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _cfoConfidence(baseConf, missingVarCount, staleAccountCount) {
    const missingPenalty = Math.min(missingVarCount * 8, 30);
    const stalePenalty   = Math.min(staleAccountCount * 5, 20);
    return Math.max(5, Math.trunc(baseConf) - missingPenalty - stalePenalty);
}

function _optimisticAssumptions(assumptions) {
    return { ...assumptions, _scenario: 'optimistic', _incomeVariant: '+10%', _expenseVariant: '-5%' };
}

function _downsideAssumptions(assumptions) {
    return { ...assumptions, _scenario: 'downside', _incomeVariant: '-10%', _expenseVariant: '+5%' };
}

// Income-sensitivity analysis: vary monthly income by ±20%; measure runway impact
function _computeSensitivity(decision, financialState, baseConf) {
    const income  = Math.trunc(financialState.monthlyIncomeCents  || 0);
    const expense = Math.trunc(financialState.monthlyExpenseCents || 0);
    const reserve = Math.trunc(financialState.reserveCents        || 0);

    const scenLow  = se.createScenario('Income -20%', { monthlyIncomeCents: Math.round(income * 0.8) }, {}, baseConf);
    const scenBase = se.createScenario('Income base', { monthlyIncomeCents: income                  }, {}, baseConf);
    const scenHigh = se.createScenario('Income +20%', { monthlyIncomeCents: Math.round(income * 1.2) }, {}, baseConf);

    return se.identifySensitivity(
        [scenLow, scenBase, scenHigh],
        s => {
            const inc = s.assumptions.monthlyIncomeCents;
            const r   = fe.projectRunway(reserve, inc, expense, baseConf);
            return r.infinite ? 999 : (r.runwayMonths || 0);
        }
    );
}

function _healthWarnings(decisionResult, syncHealthResult, trajectories, staleCount) {
    const warnings = [];

    for (const risk of (decisionResult.majorRisks || [])) {
        warnings.push({ source: 'decision-support', code: risk, severity: 'HIGH', visible: true });
    }

    if (staleCount > 0) {
        warnings.push({
            source:   'sync-health',
            code:     'STALE_SYNC_DATA',
            severity: 'MEDIUM',
            detail:   `${staleCount} account(s) have stale sync data — financial position may be inaccurate`,
            visible:  true,
        });
    }

    if (syncHealthResult && syncHealthResult.critical.length > 0) {
        warnings.push({
            source:        'sync-health',
            code:          'CRITICAL_SYNC_ISSUES',
            severity:      'HIGH',
            criticalCount: syncHealthResult.critical.length,
            visible:       true,
        });
    }

    if (!trajectories.worst.infinite && (trajectories.worst.runwayMonths || 0) < 6) {
        warnings.push({
            source:       'forecast-engine',
            code:         'SHORT_WORST_CASE_RUNWAY',
            severity:     'MEDIUM',
            runwayMonths: trajectories.worst.runwayMonths || 0,
            visible:      true,
        });
    }

    return warnings;
}

function _detectContradictions(decisionResult, syncHealthResult, trajectories, taxResult) {
    const contradictions = [];

    // PROCEED + critical sync health → data quality concern
    if (
        (decisionResult.recommendation === 'PROCEED' || decisionResult.recommendation === 'PROCEED_WITH_CARE') &&
        syncHealthResult && syncHealthResult.critical.length > 0
    ) {
        contradictions.push({
            type:        'DATA_QUALITY_VS_RECOMMENDATION',
            description: 'Recommendation is PROCEED but sync health has critical issues — data may be unreliable',
            evidenceA:   { source: 'decision-support', value: decisionResult.recommendation },
            evidenceB:   { source: 'sync-health', criticalCount: syncHealthResult.critical.length },
            severity:    'HIGH',
            visible:     true,
            silentlySuppressed: false,
        });
    }

    // Affordable under base but worst-case shows runway < 3 months
    if (
        decisionResult.affordable &&
        !trajectories.worst.infinite &&
        (trajectories.worst.runwayMonths || 0) < 3
    ) {
        contradictions.push({
            type:        'AFFORDABILITY_VS_WORST_CASE',
            description: 'Decision appears affordable under base assumptions but worst-case trajectory shows runway < 3 months',
            evidenceA:   { source: 'decision-support', value: 'affordable' },
            evidenceB:   { source: 'forecast-engine', worstCaseRunwayMonths: trajectories.worst.runwayMonths || 0 },
            severity:    'MEDIUM',
            visible:     true,
            silentlySuppressed: false,
        });
    }

    // Missing assumptions but a definite non-INSUFFICIENT_DATA recommendation was reached
    if (
        decisionResult.missingVariables.length > 0 &&
        decisionResult.recommendation !== 'INSUFFICIENT_DATA'
    ) {
        contradictions.push({
            type:        'MISSING_DATA_VS_DEFINITE_RECOMMENDATION',
            description: 'Definite recommendation made despite missing variables — outcome may change with complete data',
            evidenceA:   { source: 'decision-support', recommendation: decisionResult.recommendation },
            evidenceB:   { source: 'input-data', missingVariables: decisionResult.missingVariables },
            severity:    'LOW',
            visible:     true,
            silentlySuppressed: false,
        });
    }

    // Best vs worst scenario diverge by more than 24 months of runway
    const bestRunway  = trajectories.best.infinite  ? 999 : (trajectories.best.runwayMonths  || 0);
    const worstRunway = trajectories.worst.infinite ? 999 : (trajectories.worst.runwayMonths || 0);
    if (bestRunway - worstRunway > 24) {
        contradictions.push({
            type:        'SCENARIO_DIVERGENCE',
            description: 'Best and worst-case scenarios diverge by more than 24 months — high outcome uncertainty',
            evidenceA:   { source: 'forecast-engine', scenario: 'best',  runwayMonths: bestRunway  === 999 ? 'infinite' : bestRunway },
            evidenceB:   { source: 'forecast-engine', scenario: 'worst', runwayMonths: worstRunway },
            severity:    'MEDIUM',
            visible:     true,
            silentlySuppressed: false,
        });
    }

    return contradictions;
}

function _evidenceSources(financialState, options) {
    const sources = ['forecast-engine', 'decision-support', 'scenario-engine'];
    if (financialState.accounts)    sources.push('sync-health');
    if (options.taxParams)          sources.push('tax-exposure-engine');
    if (financialState.statement)   sources.push('reconciliation-engine');
    return sources.map(s => ({ module: s, visible: true }));
}

function _rationale(decisionResult, trajectories) {
    const parts = [];
    if (decisionResult.affordable)  parts.push('Expenditure falls within available resources.');
    if (!decisionResult.affordable) parts.push('Expenditure exceeds available resources.');
    if (trajectories.expected.infinite) parts.push('Expected trajectory: accumulating (income exceeds expenses).');
    if (!trajectories.expected.infinite) parts.push(`Expected runway: ${trajectories.expected.runwayMonths || 0} months.`);
    if ((decisionResult.majorRisks || []).length > 0) parts.push(`Active risks: ${decisionResult.majorRisks.join(', ')}.`);
    return parts.join(' ');
}

function _executiveSummary({ action, recommendation, affordable, confidence, healthWarnings, contradictions, rationale, requestedBy }) {
    const lines = [];
    lines.push(`Action: ${action || 'Unspecified'}.`);
    lines.push(`Recommendation: ${recommendation} (confidence: ${confidence}%).`);
    if (!affordable)              lines.push('Finding: proposed expenditure not currently affordable.');
    if (contradictions.length > 0) lines.push(`${contradictions.length} contradiction(s) identified — human review required.`);
    if (healthWarnings.length > 0) lines.push(`${healthWarnings.length} health warning(s) active.`);
    if (rationale)                lines.push(`Rationale: ${rationale}`);
    if (requestedBy)              lines.push(`Requested by: ${requestedBy}.`);

    return {
        text:                lines.join(' '),
        lines,
        humanReviewRequired: contradictions.length > 0 || confidence < 50 || recommendation === 'INSUFFICIENT_DATA',
        allEvidenceVisible:  true,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Full decision evaluation: integrates decision-support, forecast, scenarios, sync-health, tax
// decision: { action, amount|amountCents, frequency, assumptions, requestedBy, rationale }
// financialState: { reserveCents, monthlyIncomeCents, monthlyExpenseCents, accounts?, syncHistory? }
// options: { baseConfidence, projectionMonths, incomeVarianceBps, expenseVarianceBps, taxParams }
function evaluateDecision(decision = {}, financialState = {}, options = {}) {
    // Raw (possibly null/undefined) values — passed to ds.analyzeDecision so it can
    // accurately detect missing data. Working values (defaulted) used for calculations.
    const rawAmountCents = decision.amountCents ?? decision.amount;
    const rawFrequency   = decision.frequency;
    const amountCents    = Math.trunc(rawAmountCents ?? 0);
    const frequency      = rawFrequency || 'ONCE';
    const baseConf       = options.baseConfidence || 80;

    // Core affordability and recommendation via decision-support
    // Passes raw values so _detectMissingVars sees null/undefined correctly
    const decisionResult = ds.analyzeDecision(
        { action: decision.action || null, amountCents: rawAmountCents,
          frequency: rawFrequency, assumptions: decision.assumptions || {},
          baseConfidence: baseConf },
        { reserveCents:        financialState.reserveCents,
          monthlyIncomeCents:  financialState.monthlyIncomeCents,
          monthlyExpenseCents: financialState.monthlyExpenseCents }
    );

    // Trajectory projections: best / expected / worst
    const trajectories = fe.projectTrajectories({
        reserveCents:        financialState.reserveCents        || 0,
        monthlyIncomeCents:  financialState.monthlyIncomeCents  || 0,
        monthlyExpenseCents: financialState.monthlyExpenseCents || 0,
        months:              options.projectionMonths  || 12,
        incomeVarianceBps:   options.incomeVarianceBps  || 1000,
        expenseVarianceBps:  options.expenseVarianceBps || 500,
        baseConfidence:      baseConf,
    });

    // Three explicit scenario branches
    const baseScenario       = se.createScenario('Base Case',  decision.assumptions || {}, {}, baseConf);
    const optimisticScenario = se.branchScenario(baseScenario, _optimisticAssumptions(decision.assumptions || {}), 'Optimistic');
    const downsideScenario   = se.branchScenario(baseScenario, _downsideAssumptions(decision.assumptions   || {}), 'Downside');

    // Assumption sensitivity (income variance → runway impact)
    const assumptionSensitivity = _computeSensitivity(decision, financialState, baseConf);

    // Sync health (optional)
    const accounts         = financialState.accounts || [];
    const syncHealthResult = accounts.length > 0
        ? syncHealth.getHealthReport(accounts, { syncHistory: financialState.syncHistory || [] })
        : null;
    const staleCount = accounts.length > 0
        ? syncHealth.detectStaleAccounts(accounts).staleCount
        : 0;

    // Tax implications (optional — needs taxParams)
    let taxImplications = null;
    if (options.taxParams) {
        try {
            const tp = options.taxParams;
            if (tp.brackets && tp.jurisdictionLabel) {
                taxImplications = tax.taxExposureEngine.estimateIncomeTaxExposure({
                    grossIncomeCents:         String(tp.grossIncomeCents         || '0'),
                    estimatedDeductionsCents: String(tp.estimatedDeductionsCents || '0'),
                    brackets:                 tp.brackets,
                    personalAllowanceCents:   String(tp.personalAllowanceCents   || '0'),
                    jurisdictionLabel:        tp.jurisdictionLabel,
                    missingItems:             tp.missingItems || [],
                });
            } else {
                taxImplications = { disclaimer: tax.taxExposureEngine.DISCLAIMER, reason: 'MISSING_TAX_PARAMS' };
            }
        } catch (e) {
            taxImplications = { error: e.message, disclaimer: tax.taxExposureEngine.DISCLAIMER };
        }
    }

    // CFO-level confidence: degrades with missing data and stale sync
    const confidence = _cfoConfidence(baseConf, decisionResult.missingVariables.length, staleCount);

    // Health warnings and contradictions
    const healthWarnings = _healthWarnings(decisionResult, syncHealthResult, trajectories, staleCount);
    const contradictions = _detectContradictions(decisionResult, syncHealthResult, trajectories, taxImplications);

    // Evidence sources
    const evidenceSources = _evidenceSources(financialState, options);

    // Executive summary
    const executiveSummary = _executiveSummary({
        action:          decision.action || 'Unspecified',
        recommendation:  decisionResult.recommendation,
        affordable:      decisionResult.affordable,
        confidence,
        healthWarnings,
        contradictions,
        rationale:       decision.rationale || null,
        requestedBy:     decision.requestedBy || null,
    });

    return {
        evaluatedAt:              new Date().toISOString(),
        requestedBy:              decision.requestedBy || null,
        action:                   decision.action      || null,
        rationale:                decision.rationale   || null,

        affordability: {
            affordable:     decisionResult.affordable,
            amountCents,
            frequency,
        },
        runwayImpact:             decisionResult.projectedImpact,
        projectedOutcome:         trajectories.expected,

        scenarios: {
            optimistic: { scenario: optimisticScenario, trajectory: trajectories.best },
            base:       { scenario: baseScenario,       trajectory: trajectories.expected },
            downside:   { scenario: downsideScenario,   trajectory: trajectories.worst },
        },

        recommendation:           decisionResult.recommendation,
        recommendationConfidence:  confidence,
        recommendationRationale:   _rationale(decisionResult, trajectories),

        majorAssumptions:          decision.assumptions          || {},
        missingAssumptions:        decisionResult.missingVariables,
        assumptionSensitivity,

        evidenceSources,
        taxImplications,

        healthWarnings,
        contradictions,
        majorRisks:                decisionResult.majorRisks,

        syncHealth:                syncHealthResult,

        humanOverridePossible:    true,
        humanOverrideNote:        'This analysis is advisory. Human judgement supersedes all automated recommendations.',
        allEvidenceVisible:       true,
        silentSuppression:        false,

        executiveSummary,

        isProjection:             true,
        confidence,
    };
}

// Daily snapshot: runway, sync health, stale accounts, net position
function dailyFinancialBriefing(financialState = {}, options = {}) {
    const reserve  = Math.trunc(financialState.reserveCents        || 0);
    const income   = Math.trunc(financialState.monthlyIncomeCents  || 0);
    const expense  = Math.trunc(financialState.monthlyExpenseCents || 0);
    const baseConf = options.baseConfidence || 80;

    const runway  = fe.projectRunway(reserve, income, expense, baseConf);
    const accounts = financialState.accounts || [];

    const syncHealthResult = accounts.length > 0
        ? syncHealth.getHealthReport(accounts, { syncHistory: financialState.syncHistory || [] })
        : null;

    const staleData = accounts.length > 0
        ? syncHealth.detectStaleAccounts(accounts, options.staleThresholdMs)
        : { staleCount: 0, staleAccounts: [] };

    const dataQualityWarnings = [];
    if (staleData.staleCount > 0)
        dataQualityWarnings.push(`${staleData.staleCount} account(s) have stale sync data`);
    if (syncHealthResult && syncHealthResult.critical.length > 0)
        dataQualityWarnings.push(`${syncHealthResult.critical.length} account(s) in critical sync state`);

    const confidence = _cfoConfidence(baseConf, 0, staleData.staleCount);

    return {
        generatedAt:        new Date().toISOString(),
        reserveCents:       reserve,
        monthlyIncomeCents: income,
        monthlyExpenseCents: expense,
        monthlyNetCents:    income - expense,
        runway,
        syncHealth:         syncHealthResult,
        staleData,
        dataQualityWarnings,
        confidence,
        humanReviewRequired: dataQualityWarnings.length > 0,
        allEvidenceVisible:  true,
    };
}

// Capital allocation: efficiency ratios, emergency fund coverage, allocation recommendations
function capitalAllocationReview(financialState = {}, options = {}) {
    const reserve  = Math.trunc(financialState.reserveCents        || 0);
    const income   = Math.trunc(financialState.monthlyIncomeCents  || 0);
    const expense  = Math.trunc(financialState.monthlyExpenseCents || 0);
    const baseConf = options.baseConfidence || 80;

    const emergencyFund = fe.modelEmergencyDepletion(reserve, expense, baseConf);
    const runway        = fe.projectRunway(reserve, income, expense, baseConf);
    const net           = income - expense;

    const savingsRateBps = income > 0 ? Math.floor((net * 10000) / income) : 0;
    const expenseRateBps = income > 0 ? Math.floor((expense * 10000) / income) : 10000;

    const recommendations = [];
    if (!emergencyFund.infinite && (emergencyFund.monthsToDepletion || 0) < 3)
        recommendations.push({ code: 'BUILD_EMERGENCY_FUND', detail: 'Emergency fund covers < 3 months of expenses' });
    if (savingsRateBps < 1000)
        recommendations.push({ code: 'INCREASE_SAVINGS_RATE', detail: 'Savings rate below 10% of income' });
    if (net < 0)
        recommendations.push({ code: 'REDUCE_EXPENSE_BURDEN', detail: 'Expenses exceed income — capital depleting' });

    const missingData = [];
    if (financialState.reserveCents        === undefined) missingData.push('reserveCents');
    if (financialState.monthlyIncomeCents  === undefined) missingData.push('monthlyIncomeCents');
    if (financialState.monthlyExpenseCents === undefined) missingData.push('monthlyExpenseCents');

    return {
        generatedAt:          new Date().toISOString(),
        reserveCents:         reserve,
        monthlyIncomeCents:   income,
        monthlyExpenseCents:  expense,
        monthlyNetCents:      net,
        savingsRateBps,
        expenseRateBps,
        emergencyFundCoverage: emergencyFund,
        runway,
        recommendations,
        missingData,
        confidence:           _cfoConfidence(baseConf, missingData.length, 0),
        isProjection:         true,
        allEvidenceVisible:   true,
    };
}

// Comprehensive financial health: health score + sync status + runway
function financialHealthReview(financialState = {}, options = {}) {
    const reserve  = Math.trunc(financialState.reserveCents        || 0);
    const income   = Math.trunc(financialState.monthlyIncomeCents  || 0);
    const expense  = Math.trunc(financialState.monthlyExpenseCents || 0);
    const baseConf = options.baseConfidence || 80;

    const scoreResult = healthScore.computeHealthScore({
        liquidBalanceCents:     String(reserve),
        avgMonthlyOutflowCents: String(expense),
        monthlySummaries:       financialState.monthlySummaries    || [],
        savingsTxns:            financialState.savingsTxns         || [],
        trendResult:            financialState.trendResult         || {},
        anomalies:              financialState.anomalies           || [],
        goalsSummary:           financialState.goalsSummary        || {},
        upcomingObligations:    financialState.upcomingObligations || [],
        unknownFields:          options.unknownFields              || [],
    });

    const runway = fe.projectRunway(reserve, income, expense, baseConf);

    const accounts         = financialState.accounts || [];
    const syncHealthResult = accounts.length > 0
        ? syncHealth.getHealthReport(accounts, { syncHistory: financialState.syncHistory || [] })
        : null;

    return {
        generatedAt:        new Date().toISOString(),
        healthScore:        scoreResult.healthScore,
        confidence:         scoreResult.confidence,
        subscores:          scoreResult.subscores,
        strengths:          scoreResult.strengths,
        concerns:           scoreResult.concerns,
        unknowns:           scoreResult.unknowns,
        runway,
        syncHealth:         syncHealthResult,
        humanReviewRequired: scoreResult.concerns.length > 0,
        allEvidenceVisible: true,
    };
}

// Tax exposure review: income tax, self-employment, and YTD snapshot
// taxParams: { grossIncomeCents, estimatedDeductionsCents, brackets, personalAllowanceCents,
//              jurisdictionLabel, missingItems, selfEmployedIncomeCents, allowableExpensesCents,
//              monthlyIncomes, yearLabel }
function taxExposureReview(taxParams = {}, options = {}) {
    const results  = {};
    const warnings = [];

    if (taxParams.brackets && taxParams.jurisdictionLabel) {
        try {
            results.incomeTaxExposure = tax.taxExposureEngine.estimateIncomeTaxExposure({
                grossIncomeCents:         String(taxParams.grossIncomeCents         || '0'),
                estimatedDeductionsCents: String(taxParams.estimatedDeductionsCents || '0'),
                brackets:                 taxParams.brackets,
                personalAllowanceCents:   String(taxParams.personalAllowanceCents   || '0'),
                jurisdictionLabel:        taxParams.jurisdictionLabel,
                missingItems:             taxParams.missingItems || [],
            });
        } catch (e) {
            results.incomeTaxExposure = { error: e.message };
            warnings.push(`Income tax computation failed: ${e.message}`);
        }
    } else {
        results.incomeTaxExposure = null;
        warnings.push('Tax brackets and jurisdictionLabel required for income tax exposure — not computed');
    }

    if (taxParams.selfEmployedIncomeCents && taxParams.jurisdictionLabel) {
        try {
            results.selfEmploymentExposure = tax.taxExposureEngine.estimateSelfEmploymentExposure({
                selfEmployedIncomeCents: String(taxParams.selfEmployedIncomeCents),
                allowableExpensesCents:  String(taxParams.allowableExpensesCents || '0'),
                jurisdictionLabel:       taxParams.jurisdictionLabel,
                missingItems:            taxParams.missingItems || [],
            });
        } catch (e) {
            results.selfEmploymentExposure = { error: e.message };
        }
    }

    if (taxParams.monthlyIncomes && taxParams.yearLabel) {
        results.ytdSnapshot = tax.taxExposureEngine.ytdExposureSnapshot(
            taxParams.monthlyIncomes, taxParams.yearLabel
        );
    }

    return {
        generatedAt:          new Date().toISOString(),
        ...results,
        warnings,
        disclaimer:           tax.taxExposureEngine.DISCLAIMER,
        humanReviewRequired:  true,
        allAssumptionsVisible: true,
    };
}

// Full executive report: aggregates all five reviews
function generateExecutiveReport(financialState = {}, options = {}) {
    const daily   = dailyFinancialBriefing(financialState, options);
    const health  = financialHealthReview(financialState, options);
    const capital = capitalAllocationReview(financialState, options);
    const taxRev  = options.taxParams ? taxExposureReview(options.taxParams, options) : null;

    // Collect cross-module residual uncertainties
    const residualUncertainties = [];
    for (const u of (health.unknowns || []))
        residualUncertainties.push({ source: 'health-score', item: u });
    if (daily.staleData.staleCount > 0)
        residualUncertainties.push({ source: 'sync-health', item: `${daily.staleData.staleCount} stale account(s)` });
    if (capital.missingData.length > 0)
        residualUncertainties.push({ source: 'capital-review', item: capital.missingData.join(', ') });
    if (taxRev && taxRev.warnings.length > 0)
        for (const w of taxRev.warnings)
            residualUncertainties.push({ source: 'tax-review', item: w });

    // Areas needing executive attention
    const executiveReviewAreas = [];
    if (health.concerns.length > 0)
        executiveReviewAreas.push({ area: 'financial-health', reason: health.concerns.join('; ') });
    if (daily.staleData.staleCount > 0)
        executiveReviewAreas.push({ area: 'data-sync', reason: `${daily.staleData.staleCount} account(s) have stale data` });
    if (capital.recommendations.length > 0)
        executiveReviewAreas.push({ area: 'capital-allocation', reason: capital.recommendations.map(r => r.code).join(', ') });
    if (taxRev && taxRev.humanReviewRequired)
        executiveReviewAreas.push({ area: 'tax-exposure', reason: 'All tax estimates require professional review' });

    return {
        generatedAt:           new Date().toISOString(),
        daily,
        health,
        capital,
        taxExposure:           taxRev,
        residualUncertainties,
        executiveReviewAreas,
        humanReviewRequired:   executiveReviewAreas.length > 0,
        allEvidenceVisible:    true,
        silentSuppression:     false,
    };
}

module.exports = {
    evaluateDecision,
    dailyFinancialBriefing,
    capitalAllocationReview,
    financialHealthReview,
    taxExposureReview,
    generateExecutiveReport,
};
