'use strict';
// INDEPENDENT EVIDENCE CHAIN VERIFIER
// Purpose: Phase 3 forensic certification for audit
// CRITICAL: This file must NOT import any production code.
// It implements its own sha256 and canonicalize independently.
// A bug in governance.js cannot cause this verifier to pass.

const { createHash } = require('crypto');
const https = require('https');

// ── Independent sha256 (Node built-in, not governance.js) ────────────────────
function sha256(str) {
    return createHash('sha256').update(String(str)).digest('hex');
}

// ── Independent canonical serializer (NOT imported from governance.js) ───────
// Implements RFC 8785 JCS-like approach: sorted keys at all levels, compact.
function canonicalize(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
        if (!isFinite(v)) throw new Error('Non-finite number in evidence payload: ' + v);
        return String(v);
    }
    if (typeof v === 'string') {
        // Use JSON.stringify for proper escape handling
        return JSON.stringify(v);
    }
    if (Array.isArray(v)) {
        return '[' + v.map(canonicalize).join(',') + ']';
    }
    if (typeof v === 'object') {
        const sorted = Object.keys(v).sort();
        const pairs = sorted.map(k => JSON.stringify(k) + ':' + canonicalize(v[k]));
        return '{' + pairs.join(',') + '}';
    }
    throw new Error('Unhandled type: ' + typeof v);
}

// ── Supabase query helper (direct HTTPS, no supabase-js) ─────────────────────
function query(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const options = {
            hostname: 'api.supabase.com',
            path: '/v1/projects/devmtexqjstappalqbeg/database/query',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_PAT}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch (e) { reject(new Error('JSON parse error: ' + d.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Main verification logic ───────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('INDEPENDENT EVIDENCE CHAIN VERIFIER');
    console.log('No production code imported. Independent implementation.');
    console.log('Date:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════\n');

    const rows = await query(
        `SELECT id, sequence, chain_id, content_hash, block_hash, previous_hash,
                payload_version, canonical_payload, payload, created_at
         FROM evidence_blocks
         ORDER BY chain_id, sequence`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
        console.log('RESULT: No evidence_blocks rows found.');
        return;
    }

    console.log(`Total records found: ${rows.length}\n`);

    // Group by chain_id
    const chains = {};
    for (const row of rows) {
        if (!chains[row.chain_id]) chains[row.chain_id] = [];
        chains[row.chain_id].push(row);
    }

    let totalValid = 0;
    let totalRepairable = 0;
    let totalCorrupted = 0;
    const results = [];

    for (const [chainId, blocks] of Object.entries(chains)) {
        console.log(`─── Chain: "${chainId}" (${blocks.length} block(s)) ─────────────────`);
        let prevHash = '0000000000000000';

        for (const block of blocks) {
            const result = {
                id: block.id,
                chain: chainId,
                seq: block.sequence,
                version: block.payload_version,
                issues: [],
                classification: null,
            };

            console.log(`\nBlock seq=${block.sequence}, id=${block.id}`);
            console.log(`  payload_version  : ${block.payload_version}`);
            console.log(`  stored prev_hash : ${block.previous_hash}`);
            console.log(`  expected prev    : ${prevHash}`);
            console.log(`  prev_hash_match  : ${block.previous_hash === prevHash}`);

            // ── Check 1: previous_hash linkage ────────────────────────────
            if (block.previous_hash !== prevHash) {
                result.issues.push(`CHAIN BREAK: expected prev=${prevHash} got ${block.previous_hash}`);
            }

            // ── Check 2: canonical_payload exists ─────────────────────────
            if (!block.canonical_payload) {
                console.log(`  canonical_payload: NULL`);
                result.issues.push('canonical_payload is NULL');
            } else {
                console.log(`  canonical_payload: ${block.canonical_payload}`);

                // ── Check 3: content_hash matches canonical_payload ────────
                const recomputed = sha256(block.canonical_payload);
                const contentMatch = recomputed === block.content_hash;
                console.log(`  stored content_h : ${block.content_hash}`);
                console.log(`  recomputed c_h   : ${recomputed}`);
                console.log(`  content_hash_ok  : ${contentMatch}`);

                if (!contentMatch) {
                    result.issues.push(`HASH MISMATCH: sha256(canonical)=${recomputed} != stored=${block.content_hash}`);
                }

                // ── Check 4: verify canonical_payload is self-consistent ───
                // Re-parse the JSON and re-canonicalize — should be identical
                try {
                    const parsed = JSON.parse(block.canonical_payload);
                    const reCanon = canonicalize(parsed);
                    const selfConsistent = reCanon === block.canonical_payload;
                    console.log(`  self-consistent  : ${selfConsistent}`);
                    if (!selfConsistent) {
                        result.issues.push(`CANON NOT STABLE: re-canonicalize gives different string`);
                        console.log(`  re-canonicalized : ${reCanon}`);
                    }
                } catch (e) {
                    result.issues.push(`CANONICAL_PAYLOAD NOT VALID JSON: ${e.message}`);
                }
            }

            // ── Check 5: block_hash derivation ────────────────────────────
            const expectedBlockHash = sha256(block.previous_hash + block.content_hash + block.sequence);
            const blockHashOk = expectedBlockHash === block.block_hash;
            console.log(`  stored block_h   : ${block.block_hash}`);
            console.log(`  recomputed b_h   : ${expectedBlockHash}`);
            console.log(`  block_hash_ok    : ${blockHashOk}`);

            if (!blockHashOk) {
                result.issues.push(`BLOCK_HASH MISMATCH: expected=${expectedBlockHash} got=${block.block_hash}`);
            }

            // ── Check 6: JSONB payload naive hash (to show it would fail) ──
            if (block.payload && block.canonical_payload) {
                const payloadStr = JSON.stringify(block.payload);
                const naiveHash = sha256(payloadStr);
                const naiveOk = naiveHash === block.content_hash;
                console.log(`  JSONB naive hash : ${naiveHash}`);
                console.log(`  naive would pass : ${naiveOk} (expected false for v1 records)`);
                if (block.payload_version === 1 && naiveOk) {
                    result.issues.push('WARNING: naive JSONB hash matches — key ordering may coincidentally match');
                }
            }

            // ── Classification ────────────────────────────────────────────
            const hasHashIssue = result.issues.some(i =>
                i.includes('HASH MISMATCH') || i.includes('BLOCK_HASH MISMATCH') ||
                i.includes('CHAIN BREAK')
            );
            const hasNullCanon = result.issues.some(i => i.includes('canonical_payload is NULL'));
            const hasFakeHash = block.content_hash === 'abc' || block.block_hash === 'def';

            if (hasFakeHash) {
                result.classification = 'CORRUPTED';
            } else if (result.issues.length === 0) {
                result.classification = 'VALID';
                totalValid++;
            } else if (hasNullCanon && !hasHashIssue) {
                result.classification = 'REPAIRABLE';
                totalRepairable++;
            } else {
                result.classification = 'CORRUPTED';
                totalCorrupted++;
            }

            console.log(`\n  CLASSIFICATION: ${result.classification}`);
            if (result.issues.length > 0) {
                result.issues.forEach(i => console.log(`    ISSUE: ${i}`));
            }

            results.push(result);
            prevHash = block.block_hash; // advance chain
        }
        console.log();
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════');
    console.log('CHAIN VERIFICATION SUMMARY');
    console.log(`  Total blocks    : ${rows.length}`);
    console.log(`  Valid           : ${totalValid}`);
    console.log(`  Repairable      : ${totalRepairable}`);
    console.log(`  Corrupted       : ${totalCorrupted}`);
    console.log();

    const mainChain = chains['main'] || [];
    const mainValid = results.filter(r => r.chain === 'main' && r.classification === 'VALID').length;
    console.log(`  main chain total: ${mainChain.length}`);
    console.log(`  main chain valid: ${mainValid}`);
    console.log();

    const allMainValid = mainChain.length > 0 && mainValid === mainChain.length;
    console.log('RD-01 CLAIM: "evidence chain is externally verifiable"');
    console.log('RESULT:', allMainValid
        ? '✓ VERIFIED — all main chain blocks pass independent verification'
        : '✗ NOT VERIFIED — see issues above'
    );

    return { total: rows.length, valid: totalValid, repairable: totalRepairable, corrupted: totalCorrupted, results };
}

main().catch(e => { console.error('VERIFIER ERROR:', e.message); process.exit(1); });
