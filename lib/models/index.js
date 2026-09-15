'use strict';
// lib/models/index.js — unified export for Model Abstraction Layer

const registry     = require('./registry');
const { ModelInterface, ModelResult } = require('./interface');
const selector     = require('./selector');
const outputCapture = require('./output-capture');
const feedback     = require('./feedback');

module.exports = {
  registry,
  ModelInterface,
  ModelResult,
  selector,
  outputCapture,
  feedback,
  // Convenience shorthand
  select: selector.select,
};
