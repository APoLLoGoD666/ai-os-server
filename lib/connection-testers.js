'use strict';
const https = require('https');

function _req(options, body = null) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        const req = https.request({ ...options, timeout: 6000 }, (res) => {
            res.resume();
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, latencyMs: Date.now() - t0 });
        });
        req.on('error', () => resolve({ ok: false, latencyMs: Date.now() - t0 }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, latencyMs: 6000, error: 'timeout' }); });
        if (body) req.write(body);
        req.end();
    });
}

const TESTERS = {
    // AI
    anthropic:   (k) => _req({ hostname:'api.anthropic.com', path:'/v1/models', headers:{'x-api-key':k,'anthropic-version':'2023-06-01'} }),
    openai:      (k) => _req({ hostname:'api.openai.com',    path:'/v1/models', headers:{'Authorization':'Bearer '+k} }),
    huggingface: (k) => _req({ hostname:'huggingface.co',    path:'/api/whoami', headers:{'Authorization':'Bearer '+k} }),

    // Finance
    stripe:      (k) => _req({ hostname:'api.stripe.com',    path:'/v1/balance', headers:{'Authorization':'Bearer '+k} }),
    wise:        (k) => _req({ hostname:'api.transferwise.com', path:'/v1/profiles', headers:{'Authorization':'Bearer '+k} }),

    // Dev
    github:      (k) => _req({ hostname:'api.github.com',   path:'/user', headers:{'Authorization':'token '+k,'User-Agent':'APEX'} }),
    gitlab:      (k) => _req({ hostname:'gitlab.com',        path:'/api/v4/user', headers:{'PRIVATE-TOKEN':k} }),
    vercel:      (k) => _req({ hostname:'api.vercel.com',    path:'/v2/user', headers:{'Authorization':'Bearer '+k} }),
    netlify:     (k) => _req({ hostname:'api.netlify.com',   path:'/api/v1/user', headers:{'Authorization':'Bearer '+k} }),
    supabase:    (k) => _req({ hostname:'api.supabase.com',  path:'/v1/projects', headers:{'Authorization':'Bearer '+k} }),

    // Communication
    slack:       (k) => _req({ hostname:'slack.com',         path:'/api/auth.test', method:'POST', headers:{'Authorization':'Bearer '+k,'Content-Type':'application/json'} }),
    discord:     (k) => _req({ hostname:'discord.com',       path:'/api/v10/users/@me', headers:{'Authorization':'Bot '+k} }),
    twilio:      (k) => { const [sid, token] = k.split(':'); return _req({ hostname:'api.twilio.com', path:'/2010-04-01/Accounts/'+sid+'.json', headers:{'Authorization':'Basic '+Buffer.from(sid+':'+token).toString('base64')} }); },

    // Email
    sendgrid:    (k) => _req({ hostname:'api.sendgrid.com',  path:'/v3/user/account', headers:{'Authorization':'Bearer '+k} }),
    mailchimp:   (k) => { const dc = (k.split('-')[1])||'us1'; return _req({ hostname:dc+'.api.mailchimp.com', path:'/3.0/ping', headers:{'Authorization':'apikey '+k} }); },

    // Workspace
    notion:      (k) => _req({ hostname:'api.notion.com',    path:'/v1/users/me', headers:{'Authorization':'Bearer '+k,'Notion-Version':'2022-06-28'} }),
    airtable:    (k) => _req({ hostname:'api.airtable.com',  path:'/v0/meta/whoami', headers:{'Authorization':'Bearer '+k} }),

    // Project Mgmt
    clickup:     (k) => _req({ hostname:'api.clickup.com',   path:'/api/v2/user', headers:{'Authorization':k} }),
    linear:      (k) => _req({ hostname:'api.linear.app',    path:'/graphql', method:'POST', headers:{'Authorization':k,'Content-Type':'application/json'} }, '{"query":"{viewer{id}}"}'),
    todoist:     (k) => _req({ hostname:'api.todoist.com',   path:'/rest/v2/projects', headers:{'Authorization':'Bearer '+k} }),

    // CRM / Support
    zendesk:     (k) => { const [sub,token] = k.split('|'); return _req({ hostname:sub+'.zendesk.com', path:'/api/v2/users/me.json', headers:{'Authorization':'Bearer '+token} }); },

    // Analytics
    datadog:     (k) => { const [api,app] = k.split(':'); return _req({ hostname:'api.datadoghq.com', path:'/api/v1/validate', headers:{'DD-API-KEY':api,'DD-APPLICATION-KEY':app||''} }); },
    mixpanel:    (k) => _req({ hostname:'mixpanel.com',      path:'/api/2.0/engage', headers:{'Authorization':'Basic '+Buffer.from(k+':').toString('base64')} }),

    // E-commerce
    shopify:     (k) => { const [shop,token] = k.split('|'); return _req({ hostname:shop+'.myshopify.com', path:'/admin/api/2024-01/shop.json', headers:{'X-Shopify-Access-Token':token} }); },

    // Cloud
    cloudflare:  (k) => _req({ hostname:'api.cloudflare.com', path:'/client/v4/user/tokens/verify', headers:{'Authorization':'Bearer '+k} }),
};

async function testConnection(slug, apiKey) {
    const tester = TESTERS[slug];
    if (!tester) return { ok: true, latencyMs: 0, detail: 'connectivity not testable for this provider' };
    try {
        const result = await tester(apiKey);
        return result;
    } catch (e) {
        return { ok: false, latencyMs: 0, error: e.message };
    }
}

module.exports = { testConnection };
