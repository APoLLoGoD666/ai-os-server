'use strict';

module.exports = {
  canonicalEventBuilder: require('./canonical-event-builder'),
  documentClassifier:    require('./document-classifier'),
  duplicateDetector:     require('./duplicate-detector'),
  importBatchManager:    require('./import-batch-manager'),
  importParser:          require('./import-parser'),
  importValidator:       require('./import-validator'),
};
