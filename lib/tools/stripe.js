'use strict';
const https = require('https');

function _request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = data;
          try { msg = JSON.parse(data).error?.message || data; } catch (_) {}
          return reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
        }
        try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function _stripe(apiKey, method, path, body) {
  const options = {
    hostname: 'api.stripe.com',
    path,
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
    },
  };
  return _request(options, body || undefined);
}

module.exports = {
  slug: 'stripe',
  actions: {
    get_balance: {
      description: 'Get the current Stripe account balance.',
      params: {},
      required: [],
      readOnly: true,
      async execute(params, creds) {
        const r = await _stripe(creds.apiKey, 'GET', '/v1/balance');
        return {
          available: r.available.map((b) => ({ currency: b.currency, amount: b.amount / 100 })),
          pending: r.pending.map((b) => ({ currency: b.currency, amount: b.amount / 100 })),
        };
      },
    },
    list_customers: {
      description: 'List Stripe customers, optionally filtered by email.',
      params: {
        email: { type: 'string', description: 'Filter by email address.' },
      },
      required: [],
      readOnly: true,
      async execute(params, creds) {
        let path = '/v1/customers?limit=20';
        if (params.email) path += `&email=${encodeURIComponent(params.email)}`;
        const r = await _stripe(creds.apiKey, 'GET', path);
        return {
          customers: r.data.map((c) => ({
            id: c.id,
            email: c.email,
            name: c.name,
            created: new Date(c.created * 1000).toISOString(),
          })),
        };
      },
    },
    create_invoice_item: {
      description: 'Create a Stripe invoice line item for a customer.',
      params: {
        customer_id: { type: 'string', description: 'Stripe customer ID.' },
        amount: { type: 'integer', description: 'Amount in pence/cents.' },
        currency: { type: 'string', description: '3-letter currency code (e.g. gbp).' },
        description: { type: 'string', description: 'Line item description.' },
      },
      required: ['customer_id', 'amount', 'currency'],
      readOnly: false,
      async execute(params, creds) {
        const body = `customer=${params.customer_id}&amount=${params.amount}&currency=${params.currency}&description=${encodeURIComponent(params.description || '')}`;
        const r = await _stripe(creds.apiKey, 'POST', '/v1/invoiceitems', body);
        return { id: r.id, amount: r.amount, currency: r.currency };
      },
    },
  },
};
