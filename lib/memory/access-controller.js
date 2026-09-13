'use strict';
// lib/memory/access-controller.js — layer-level access control for the Memory Gateway

const logger = require('../logger');

// Maps entity identifiers to their access class
const ENTITY_CLASSES = {
  'orchestrator':          'SYSTEM',
  'consolidation_engine':  'SYSTEM',
  'reflector_agent':       'AGENT',
  'architect_agent':       'AGENT',
  'developer_agent':       'AGENT',
  'researcher_agent':      'AGENT',
  'reviewer_agent':        'AGENT',
  'api_client':            'AGENT',
  'founder':               'FOUNDER',
  'cso':                   'COUNCIL',
  'cio':                   'COUNCIL',
  'cfo':                   'COUNCIL',
  'cto':                   'COUNCIL',
  'coo':                   'COUNCIL',
  'cgo':                   'COUNCIL',
  'cro':                   'COUNCIL',
  'feedback_engine':       'SYSTEM',
  // Runtime system entities — must be SYSTEM so they can write to restricted layers (5, 11)
  'civilization_runtime':  'SYSTEM',
  'civilization-kernel':   'SYSTEM',
  'cron':                  'SYSTEM',
  'ministry':              'SYSTEM',
  'system':                'SYSTEM',
  'tool':                  'SYSTEM',
  'chat-context':          'SYSTEM',
  'agent_completion':      'SYSTEM',
};

// Layer-specific permission overrides. Unlisted layers use DEFAULT_PERMISSIONS.
const LAYER_PERMISSIONS = {
  0:  { FOUNDER: ['READ','WRITE','DELETE'], COUNCIL: ['READ'],                    SYSTEM: ['READ'],               AGENT: []             },
  5:  { FOUNDER: ['READ','WRITE','DELETE'], COUNCIL: ['READ','WRITE','SUMMARIZE'], SYSTEM: ['READ','WRITE'],       AGENT: []             },
  10: { FOUNDER: ['READ','WRITE'],          COUNCIL: ['READ','SUMMARIZE'],         SYSTEM: ['READ','WRITE'],       AGENT: ['READ','WRITE'] },
  11: { FOUNDER: ['READ','WRITE','DELETE'], COUNCIL: ['READ','WRITE'],             SYSTEM: ['READ','WRITE'],       AGENT: ['READ']       },
};

const DEFAULT_PERMISSIONS = {
  FOUNDER: ['READ','WRITE','SUMMARIZE','DELETE'],
  COUNCIL: ['READ','WRITE','SUMMARIZE'],
  SYSTEM:  ['READ','WRITE'],
  AGENT:   ['READ','WRITE'],
};

// Elevated rights that only specific entities hold regardless of class
const ELEVATED_RIGHTS = {
  'FOUNDER_WRITE': ['founder', 'stop_hook'],
};

class AccessDeniedError extends Error {
  constructor(msg) { super(msg); this.name = 'AccessDeniedError'; }
}

class AccessController {
  // Throws AccessDeniedError if any layer denies the operation.
  check(entityId, layers, operation) {
    const cls = ENTITY_CLASSES[entityId] || 'AGENT';
    for (const layer of layers) {
      const perms = LAYER_PERMISSIONS[layer] || DEFAULT_PERMISSIONS;
      const allowed = perms[cls] || [];
      if (!allowed.includes(operation)) {
        logger.warn('access-controller', 'denied', { entityId, cls, layer, operation });
        throw new AccessDeniedError(`${cls} (${entityId}) cannot ${operation} layer ${layer}`);
      }
    }
  }

  checkElevated(entityId, right) {
    const holders = ELEVATED_RIGHTS[right] || [];
    if (!holders.includes(entityId)) {
      logger.warn('access-controller', 'elevated right denied', { entityId, right });
      throw new AccessDeniedError(`${entityId} does not hold elevated right: ${right}`);
    }
  }
}

module.exports = AccessController;
