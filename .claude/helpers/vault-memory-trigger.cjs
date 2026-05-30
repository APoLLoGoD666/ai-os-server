#!/usr/bin/env node
/**
 * vault-memory-trigger.cjs
 * PostToolUse hook — reads hook JSON from stdin, checks if it was a git push,
 * then fires update-vault-memory.mjs in the background.
 */
'use strict';
const { spawn } = require('child_process');
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  try {
    const hook = JSON.parse(raw);
    const cmd = (hook.tool_input || hook).command || '';
    if (/git\s+push/.test(cmd)) {
      const updater = path.join(__dirname, 'update-vault-memory.mjs');
      spawn(process.execPath, [updater], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {}
  process.exit(0);
});
