'use strict';

// Financial Intelligence Layer — full export of all finance modules.

module.exports = {
  cashflowEngine:        require('./cashflow-engine'),
  spendingIntelligence:  require('./spending-intelligence'),
  goalEngine:            require('./goal-engine'),
  opportunityEngine:     require('./opportunity-engine'),
  financialHealthScore:  require('./financial-health-score'),
  dashboardSummary:      require('./dashboard-summary'),
  forecastEngine:        require('./forecast-engine'),
  decisionSupport:       require('./decision-support'),
  financialRetrieval:    require('./financial-retrieval'),
  transactionProvenance: require('./transaction-provenance'),
  importBatchRegistry:   require('./import-batch-registry'),
  duplicateDetector:     require('./duplicate-detector'),
  reconciliationEngine:  require('./reconciliation-engine'),
  scenarioEngine:        require('./scenario-engine'),
  import:                require('./import'),
  sync:                  require('./sync'),
  tax:                   require('./tax'),
};
