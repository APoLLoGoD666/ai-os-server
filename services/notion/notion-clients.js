'use strict';

const { DB, createPage, updatePage, queryDatabase, titleProp, richTextProp, selectProp, urlProp, emailProp, phoneProp, numberProp, extractProp } = require('./notion-client');

async function createClient(client) {
  const { name, status = 'Lead', type = 'Business', email, phone, company, domain, monthlyValue, totalValue, agentLead, obsidianLink, notes } = client;
  return createPage(DB.clients, {
    'Client Name': titleProp(name),
    'Status': selectProp(status),
    'Type': selectProp(type),
    ...(email ? { 'Email': emailProp(email) } : {}),
    ...(phone ? { 'Phone': phoneProp(phone) } : {}),
    ...(company ? { 'Company': richTextProp(company) } : {}),
    ...(domain ? { 'Domain': richTextProp(domain) } : {}),
    ...(monthlyValue != null ? { 'Monthly Value': numberProp(monthlyValue) } : {}),
    ...(totalValue != null ? { 'Total Value': numberProp(totalValue) } : {}),
    ...(agentLead ? { 'Agent Lead': richTextProp(agentLead) } : {}),
    ...(obsidianLink ? { 'Obsidian Link': urlProp(obsidianLink) } : {}),
    ...(notes ? { 'Notes': richTextProp(notes) } : {}),
  });
}

async function updateClient(pageId, updates) {
  const props = {};
  if (updates.status) props['Status'] = selectProp(updates.status);
  if (updates.monthlyValue != null) props['Monthly Value'] = numberProp(updates.monthlyValue);
  if (updates.totalValue != null) props['Total Value'] = numberProp(updates.totalValue);
  if (updates.notes) props['Notes'] = richTextProp(updates.notes);
  if (updates.agentLead) props['Agent Lead'] = richTextProp(updates.agentLead);
  return updatePage(pageId, props);
}

async function activateClient(pageId) {
  return updatePage(pageId, { 'Status': selectProp('Active') });
}

async function getActiveClients() {
  return queryDatabase(DB.clients, {
    property: 'Status', select: { equals: 'Active' }
  });
}

async function getLeads() {
  return queryDatabase(DB.clients, {
    property: 'Status', select: { equals: 'Lead' }
  });
}

async function findClientByName(name) {
  const result = await queryDatabase(DB.clients, {
    property: 'Client Name', title: { contains: name }
  }, null, 1);
  return result.results[0] || null;
}

// Called when a new lead arrives — creates client + triggers downstream
async function createLeadFromInbound(data) {
  const { name, email, company, domain, source } = data;
  return createClient({
    name,
    email,
    company,
    domain,
    status: 'Lead',
    notes: `Source: ${source || 'inbound'}. Created ${new Date().toISOString().slice(0, 10)}.`,
    agentLead: 'sales-outreach-specialist',
  });
}

function extractClient(page) {
  const p = page.properties;
  return {
    notionId: page.id,
    name: extractProp(p['Client Name']),
    status: extractProp(p['Status']),
    type: extractProp(p['Type']),
    email: extractProp(p['Email']),
    phone: extractProp(p['Phone']),
    company: extractProp(p['Company']),
    domain: extractProp(p['Domain']),
    monthlyValue: extractProp(p['Monthly Value']),
    totalValue: extractProp(p['Total Value']),
    agentLead: extractProp(p['Agent Lead']),
    obsidianLink: extractProp(p['Obsidian Link']),
    notes: extractProp(p['Notes']),
    clientId: extractProp(p['Client ID']),
  };
}

module.exports = { createClient, updateClient, activateClient, getActiveClients, getLeads, findClientByName, createLeadFromInbound, extractClient };
