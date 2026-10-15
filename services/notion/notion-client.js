'use strict';

const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;

// Database IDs — created 2026-06-05
const DB = {
  tasks:             'fcab7a3b-d0dc-4a67-becd-828a1388b42e',
  projects:          'db82be17-3b04-41dd-9833-ae001de4b485',
  clients:           '2ec9f764-c868-4918-84b3-bed28f6da514',
  agentRuns:         'eb7e93eb-05c2-4b62-a099-3081bb2ad29c',
  decisions:         '0d1bc835-6d49-438b-bfac-409b17667848',
  goals:             '94bd576d-a443-4706-a584-02b38052261c',
  meetings:          '07bd83f6-448b-4a38-a5bf-ee5113b9c4b0',
  contentPipeline:   '685b7851-84dc-46b4-b44d-2542712444e8',
  knowledgeRequests: '192e0791-2439-4c77-b8f5-3022f123ab25',
  sopExecutions:     'acf73973-29e3-464e-8c1f-5d944b210ea2',
};

let _client = null;

function getClient() {
  if (!NOTION_API_KEY) throw new Error('NOTION_API_KEY not set');
  if (!_client) _client = new Client({ auth: NOTION_API_KEY, timeoutMs: 30000 });
  return _client;
}

// Circuit breaker — opens after 5 consecutive failures; 60s cooldown; half-open after cooldown
const _cb = { failures: 0, openUntil: 0, state: 'CLOSED' };
const CB_THRESHOLD = 5, CB_COOLDOWN = 60000;

function _cbCheck() {
  if (_cb.state === 'OPEN') {
    if (Date.now() < _cb.openUntil) throw new Error('notion_circuit_open');
    _cb.state = 'HALF_OPEN';
    console.warn('[notion] circuit HALF_OPEN — probing');
  }
}

function _cbSuccess() {
  if (_cb.state !== 'CLOSED') console.warn('[notion] circuit CLOSED — recovered');
  _cb.failures = 0; _cb.state = 'CLOSED';
}

function _cbFailure(err) {
  _cb.failures++;
  if (_cb.state === 'HALF_OPEN' || _cb.failures >= CB_THRESHOLD) {
    _cb.state = 'OPEN';
    _cb.openUntil = Date.now() + CB_COOLDOWN;
    console.warn(`[notion] circuit OPEN for ${CB_COOLDOWN / 1000}s after ${_cb.failures} failures — last: ${err.message}`);
  }
}

// Exponential backoff retry — respects Notion 429 and 5xx
async function withRetry(fn, opts = {}) {
  const { maxRetries = 3, baseDelay = 500 } = opts;
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = err.status === 429 || (err.status >= 500 && err.status < 600);
      if (!isRetryable || i === maxRetries) break;
      const delay = err.headers?.['retry-after']
        ? parseInt(err.headers['retry-after'], 10) * 1000
        : baseDelay * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// Rate limit: 3 req/s max (Notion allows ~3 per second per integration)
const _queue = [];
let _running = 0;
const MAX_CONCURRENT = 3;

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    try { _cbCheck(); } catch (e) { return reject(e); }
    _queue.push({
      fn: () => fn().then(r => { _cbSuccess(); return r; }).catch(e => { _cbFailure(e); throw e; }),
      resolve,
      reject,
    });
    _drain();
  });
}

function _drain() {
  while (_running < MAX_CONCURRENT && _queue.length > 0) {
    const { fn, resolve, reject } = _queue.shift();
    _running++;
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => { _running--; _drain(); });
  }
}

// Core CRUD

async function createPage(databaseId, properties, content = '') {
  return enqueue(() => withRetry(() =>
    getClient().pages.create({
      parent: { database_id: databaseId },
      properties,
      children: content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content } }] } }] : [],
    })
  ));
}

async function updatePage(pageId, properties) {
  return enqueue(() => withRetry(() =>
    getClient().pages.update({ page_id: pageId, properties })
  ));
}

async function archivePage(pageId) {
  return enqueue(() => withRetry(() =>
    getClient().pages.update({ page_id: pageId, archived: true })
  ));
}

async function getPage(pageId) {
  return enqueue(() => withRetry(() =>
    getClient().pages.retrieve({ page_id: pageId })
  ));
}

async function queryDatabase(databaseId, filter = null, sorts = null, pageSize = 100) {
  const params = { database_id: databaseId, page_size: pageSize };
  if (filter) params.filter = filter;
  if (sorts) params.sorts = sorts;
  return enqueue(() => withRetry(() => getClient().databases.query(params)));
}

// Property builders

function titleProp(text) {
  return { title: [{ type: 'text', text: { content: String(text) } }] };
}

function richTextProp(text) {
  if (!text) return { rich_text: [] };
  return { rich_text: [{ type: 'text', text: { content: String(text) } }] };
}

function selectProp(name) {
  if (!name) return { select: null };
  return { select: { name: String(name) } };
}

function dateProp(dateStr) {
  if (!dateStr) return { date: null };
  return { date: { start: String(dateStr) } };
}

function numberProp(n) {
  if (n == null) return { number: null };
  return { number: Number(n) };
}

function urlProp(url) {
  if (!url) return { url: null };
  return { url: String(url) };
}

function emailProp(email) {
  if (!email) return { email: null };
  return { email: String(email) };
}

function phoneProp(phone) {
  if (!phone) return { phone_number: null };
  return { phone_number: String(phone) };
}

// Extract value from a Notion property
function extractProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title': return prop.title?.map(t => t.plain_text).join('') || '';
    case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('') || '';
    case 'select': return prop.select?.name || null;
    case 'multi_select': return prop.multi_select?.map(s => s.name) || [];
    case 'date': return prop.date?.start || null;
    case 'number': return prop.number ?? null;
    case 'url': return prop.url || null;
    case 'email': return prop.email || null;
    case 'phone_number': return prop.phone_number || null;
    case 'checkbox': return prop.checkbox;
    case 'created_time': return prop.created_time;
    case 'last_edited_time': return prop.last_edited_time;
    case 'formula': return prop.formula?.string || prop.formula?.number || null;
    default: return null;
  }
}

module.exports = { DB, getClient, createPage, updatePage, archivePage, getPage, queryDatabase, titleProp, richTextProp, selectProp, dateProp, numberProp, urlProp, emailProp, phoneProp, extractProp };
