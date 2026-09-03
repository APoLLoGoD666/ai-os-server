'use strict';
// lib/registry/parser.js — Parses markdown registry catalogue into structured entity objects.
// Strategy: compact 7-column rows from catalogue files are primary source;
// 3-column canonical identifiers file fills in any entities the compact parser misses.

const fs   = require('fs');
const path = require('path');

const REGISTRY_DIR = path.join(__dirname, '../../docs/registry');

const CATALOGUE_FILES = [
    '01-Entity-Catalogue-Part1.md',
    '01-Entity-Catalogue-Part2a.md',
    '01-Entity-Catalogue-Part2b.md',
];
const CANONICAL_FILE = '03-Canonical-Identifiers.md';

// Matches compact 7-column catalogue rows
const COMPACT_RE = /^\|\s*(ENT-\d{6})\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/;

// Matches 3-column canonical identifier rows
const CANON_RE = /^\|\s*(ENT-\d{6})\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|$/;

// Matches block headers: ## BLOCK 01 — Civilisation (...)
const BLOCK_RE = /^##\s+BLOCK\s+(\d+)\s+[—–-]/;

// Matches full-attribute section headers: ### ENT-000001 — APEX Civilisation
const FULL_ATTR_HEADER_RE = /^###\s+(ENT-\d{6})\s+[—–-]\s+(.+)/;
// Matches **Family:** CIV | **Type:** ... in full-attribute sections
const FULL_ATTR_META_RE   = /\*\*Family:\*\*\s*([^\s|]+)\s*\|\s*\*\*Type:\*\*\s*([^\s|]+)\s*\|\s*\*\*Status:\*\*\s*([^\s|]+)\s*\|\s*\*\*Confidence:\*\*\s*([^\s|]+)/;
// Matches attribute table row: | Path | value |
const ATTR_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/;

function _makeEntity(id, name, family, type, rawPath, status, confidence, block) {
    return {
        id, name,
        family:     family     || '',
        type:       type       || '',
        path:       rawPath    || '',
        status:     status     || '',
        confidence: confidence || '',
        block:      block      != null ? block : null,
        owner:      null, purpose: null, description: null,
        capabilities: [], archDocs: [], district: null, lifecycle: null,
    };
}

function parseEntities() {
    const entities = new Map();

    // Pass 1: compact rows from catalogue files
    for (const file of CATALOGUE_FILES) {
        const fp = path.join(REGISTRY_DIR, file);
        if (!fs.existsSync(fp)) continue;
        const lines    = fs.readFileSync(fp, 'utf8').split('\n');
        let block      = null;
        let fullId     = null;   // current full-attr entity being parsed
        let fullName   = null;
        let fullFamily = null;
        let fullType   = null;
        let fullStatus = null;
        let fullConf   = null;
        let fullPath   = null;

        for (const line of lines) {
            const bm = line.match(BLOCK_RE);
            if (bm) { block = parseInt(bm[1]); fullId = null; continue; }

            // Full-attribute entity header
            const fh = line.match(FULL_ATTR_HEADER_RE);
            if (fh) {
                fullId = fh[1]; fullName = fh[2].trim();
                fullFamily = null; fullType = null; fullStatus = null; fullConf = null; fullPath = null;
                continue;
            }

            if (fullId) {
                // Family/Type/Status/Confidence inline meta line
                const fm = line.match(FULL_ATTR_META_RE);
                if (fm) {
                    fullFamily = fm[1]; fullType = fm[2]; fullStatus = fm[3]; fullConf = fm[4];
                    continue;
                }
                // Attribute table row
                const ar = line.match(ATTR_ROW_RE);
                if (ar) {
                    const k = ar[1].trim().toLowerCase();
                    const v = ar[2].trim();
                    if (k === 'path')   { fullPath = v; }
                    if (k === 'owner')  { /* store later via enrichment */ }
                }
                // Emit if we have enough info (on next header or end)
                if (fullId && fullName && fullFamily && !entities.has(fullId)) {
                    // Only emit when we've seen the meta line
                    if (fullFamily) {
                        entities.set(fullId, _makeEntity(fullId, fullName, fullFamily, fullType, fullPath, fullStatus, fullConf, block));
                    }
                }
                continue;
            }

            // Compact 7-column row
            const m = line.match(COMPACT_RE);
            if (!m) continue;
            const [, id, name, family, type, rawPath, status, confidence] = m;
            if (!entities.has(id)) {
                entities.set(id, _makeEntity(id, name.trim(), family.trim(), type.trim(), rawPath.trim(), status.trim(), confidence.trim(), block));
            }
        }
    }

    // Pass 2: canonical identifiers — fill in any entities missed by Pass 1
    const cfp = path.join(REGISTRY_DIR, CANONICAL_FILE);
    if (fs.existsSync(cfp)) {
        const lines = fs.readFileSync(cfp, 'utf8').split('\n');
        for (const line of lines) {
            const m = line.match(CANON_RE);
            if (!m) continue;
            const [, id, name, rawPath] = m;
            if (!entities.has(id)) {
                entities.set(id, _makeEntity(id, name.trim(), '', '', rawPath.trim(), '', '', null));
            }
        }
    }

    return entities;
}

module.exports = { parseEntities };
