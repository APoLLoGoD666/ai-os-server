'use strict';

// Workflow: Lead arrives → Slack alert → Notion client created → Project generated → Agent assigned
// Trigger: POST /api/leads/inbound or manual

const { clients: notionClients, projects: notionProjects, sync: notionSync } = require('../notion');
const { alerts: slackAlerts, briefings: slackBriefings } = require('../slack');

async function processInboundLead(leadData) {
  const { name, email, company, domain, source, budget, notes } = leadData;
  const log = [];
  let notionClientId = null;
  let notionProjectId = null;

  try {
    // 1. Slack alert
    await slackAlerts.alertSuccess('New Lead', `${name}${company ? ` (${company})` : ''} · ${domain || 'Unknown domain'}`).catch(e => log.push(`slack: ${e.message}`));

    // 2. Notion client created
    const clientPage = await notionClients.createLeadFromInbound({ name, email, company, domain, source }).catch(e => { log.push(`notion-client: ${e.message}`); return null; });
    if (clientPage) notionClientId = clientPage.id;

    // 3. Notion project created (linked to client)
    const projectPage = await notionProjects.createProject({
      name: `${name} — Onboarding`,
      status: 'Planning',
      phase: 'Discovery',
      domain: domain || 'Business',
      client: name,
      description: notes || `Inbound lead from ${source || 'unknown'}. Budget: ${budget || 'TBD'}.`,
      agentLead: 'sales-outreach-specialist',
    }).catch(e => { log.push(`notion-project: ${e.message}`); return null; });
    if (projectPage) notionProjectId = projectPage.id;

    // 4. Slack project alert
    await slackBriefings.postProjectUpdate({
      projectName: `${name} — Onboarding`,
      status: 'Planning',
      phase: 'Discovery',
      client: name,
      description: `New lead onboarding project created.`,
    }).catch(e => log.push(`slack-project: ${e.message}`));

    return { ok: true, notionClientId, notionProjectId, log };

  } catch (err) {
    await slackAlerts.alertError('Lead Pipeline', err.message).catch(() => {});
    return { ok: false, error: err.message, log };
  }
}

module.exports = { processInboundLead };
