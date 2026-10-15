'use strict';
const { getSupabaseClient } = require('./clients');
const crypto = require('./credential-crypto');
const logger = require('./logger');

function _sb() { return getSupabaseClient(); }

// ── Status ───────────────────────────────────────────────────────────────────

async function getConnectionBySlug(slug) {
    const { data } = await _sb().from('tool_connections').select('*').eq('slug', slug).maybeSingle();
    return data || null;
}

async function listConnections() {
    const { data, error } = await _sb()
        .from('tool_connections')
        .select('slug,display_name,auth_type,status,connected_at,last_tested_at,last_error')
        .order('slug');
    if (error) { logger.warn('connections', 'listConnections failed', { error: error.message }); return []; }
    return data || [];
}

async function upsertConnection(slug, displayName, authType) {
    const { error } = await _sb().from('tool_connections').upsert(
        { slug, display_name: displayName, auth_type: authType, updated_at: new Date().toISOString() },
        { onConflict: 'slug' }
    );
    if (error) throw new Error(error.message);
}

async function setConnectionStatus(slug, status, lastError = null) {
    const update = { status, updated_at: new Date().toISOString() };
    if (status === 'connected') update.connected_at = new Date().toISOString();
    if (lastError !== null) update.last_error = lastError;
    await _sb().from('tool_connections').update(update).eq('slug', slug);
}

// ── Credentials ──────────────────────────────────────────────────────────────

async function saveCredential(slug, credentialType, plaintextValue, expiresAt = null) {
    const { ciphertext, iv, authTag } = crypto.encrypt(plaintextValue);
    const conn = await getConnectionBySlug(slug);
    if (!conn) throw new Error(`No connection row for slug: ${slug}`);
    const row = {
        connection_id:   conn.id,
        credential_type: credentialType,
        encrypted_value: ciphertext,
        iv,
        auth_tag:        authTag,
        expires_at:      expiresAt,
        updated_at:      new Date().toISOString(),
    };
    const { error } = await _sb().from('tool_credentials')
        .upsert(row, { onConflict: 'connection_id,credential_type' });
    if (error) throw new Error(error.message);
}

async function getCredential(slug, credentialType) {
    const conn = await getConnectionBySlug(slug);
    if (!conn) return null;
    const { data, error } = await _sb().from('tool_credentials')
        .select('encrypted_value,iv,auth_tag')
        .eq('connection_id', conn.id)
        .eq('credential_type', credentialType)
        .maybeSingle();
    if (error || !data) return null;
    try {
        return crypto.decrypt({ ciphertext: data.encrypted_value, iv: data.iv, authTag: data.auth_tag });
    } catch (e) {
        logger.warn('connections', 'decrypt failed', { slug, error: e.message });
        return null;
    }
}

async function deleteCredentials(slug) {
    const conn = await getConnectionBySlug(slug);
    if (!conn) return;
    await _sb().from('tool_credentials').delete().eq('connection_id', conn.id);
    await setConnectionStatus(slug, 'disconnected', null);
}

// ── Agent-facing getConnection ───────────────────────────────────────────────

async function getConnection(slug) {
    const conn = await getConnectionBySlug(slug);
    if (!conn || conn.status !== 'connected') {
        throw new Error(`${slug} is not connected. Go to Tools → ${slug} → Connect.`);
    }
    const apiKey = await getCredential(slug, 'api_key');
    const connStr = await getCredential(slug, 'connection_string');
    return { connected: true, apiKey, connectionString: connStr };
}

module.exports = {
    getConnectionBySlug,
    listConnections,
    upsertConnection,
    setConnectionStatus,
    saveCredential,
    getCredential,
    deleteCredentials,
    getConnection,
};
