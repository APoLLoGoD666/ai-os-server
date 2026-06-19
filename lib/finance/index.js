'use strict';

// Financial Intelligence Layer — exports only for modules created in this session.
// Do not modify exports for ledger, import, reconciliation, or provenance modules.

module.exports = {
  cashflowEngine: require('./cashflow-engine'),
  spendingIntelligence: require('./spending-intelligence'),
  goalEngine: require('./goal-engine'),
  opportunityEngine: require('./opportunity-engine'),
  financialHealthScore: require('./financial-health-score'),
  dashboardSummary: require('./dashboard-summary'),
};
