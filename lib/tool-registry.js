'use strict';

const fs = require('fs');
const path = require('path');
const { getConnection, listConnections } = require('./connections');

const TOOLS_DIR = path.join(__dirname, 'tools');
const CACHE_TTL_MS = 60_000;

let _registry = new Map(); // toolName -> { mod, actionKey }
let _schemas = [];         // full schema array
let _cacheTs = 0;
let _cachedSlugs = new Set();

function _loadModules() {
  const registry = new Map();
  const schemas = [];

  let files;
  try {
    files = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith('.js'));
  } catch (err) {
    console.warn('[tool-registry] tools dir not found, no tools loaded:', err.message);
    return { registry, schemas };
  }

  for (const file of files) {
    let mod;
    try {
      mod = require(path.join(TOOLS_DIR, file));
    } catch (err) {
      console.warn('[tool-registry] failed to load', file, err.message);
      continue;
    }

    if (!mod.slug || !mod.actions || typeof mod.actions !== 'object') {
      console.warn('[tool-registry] invalid module shape in', file);
      continue;
    }

    const prefix = mod.slug.replace(/-/g, '_');

    for (const [actionKey, action] of Object.entries(mod.actions)) {
      const toolName = `${prefix}_${actionKey}`;
      registry.set(toolName, { mod, actionKey });
      schemas.push({
        name: toolName,
        description: action.description,
        input_schema: {
          type: 'object',
          properties: action.params,
          required: action.required || [],
        },
      });
    }
  }

  return { registry, schemas };
}

// Load once on startup
(function init() {
  const { registry, schemas } = _loadModules();
  _registry = registry;
  _schemas = schemas;
})();

async function getConnectedSchemas() {
  const now = Date.now();
  if (now - _cacheTs > CACHE_TTL_MS) {
    const connections = await listConnections();
    _cachedSlugs = new Set(
      connections.filter(c => c.status === 'connected').map(c => c.slug)
    );
    _cacheTs = now;
  }

  return _schemas.filter(s => {
    // toolName prefix is slug with hyphens replaced by underscores
    const entry = _registry.get(s.name);
    return entry && _cachedSlugs.has(entry.mod.slug);
  });
}

async function execute(toolName, params) {
  const entry = _registry.get(toolName);
  if (!entry) throw new Error('Unknown tool: ' + toolName);

  const { mod, actionKey } = entry;
  const creds = await getConnection(mod.slug); // throws if not connected

  try {
    return await mod.actions[actionKey].execute(params, creds);
  } catch (err) {
    err.message = `[${mod.slug}/${actionKey}] ${err.message}`;
    throw err;
  }
}

module.exports = { getConnectedSchemas, execute };
