'use strict';
// lib/health/index.js — APEX autonomous health defence module

const monitor         = require('./monitor');
const anomalyDetector = require('./anomaly-detector');
const containment     = require('./containment');

module.exports = { monitor, anomalyDetector, containment };
