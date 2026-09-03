'use strict';

// Tax Intelligence Layer — Phase 44
// INFORMATIONAL ONLY. Not legal or tax advice.

module.exports = {
  expenseClassifier: require('./expense-classifier'),
  taxExposureEngine: require('./tax-exposure-engine'),
  deductionOpportunityEngine: require('./deduction-opportunity-engine'),
  evidenceCompleteness: require('./evidence-completeness'),
  yearEndReadiness: require('./year-end-readiness'),
  complianceReview: require('./compliance-review'),
};
