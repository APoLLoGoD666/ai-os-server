'use strict';

const { DB, createPage, updatePage, archivePage, queryDatabase, titleProp, richTextProp, selectProp, dateProp, urlProp, extractProp } = require('./notion-client');

async function createProject(project) {
  const { name, status = 'Planning', priority = 'P2 Medium', phase, domain, client, agentLead, startDate, targetDate, obsidianLink, githubUrl, description } = project;
  return createPage(DB.projects, {
    'Project Name': titleProp(name),
    'Status': selectProp(status),
    'Priority': selectProp(priority),
    ...(phase ? { 'Phase': selectProp(phase) } : {}),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    ...(client ? { 'Client': richTextProp(client) } : {}),
    ...(agentLead ? { 'Agent Lead': richTextProp(agentLead) } : {}),
    ...(startDate ? { 'Start Date': dateProp(startDate) } : {}),
    ...(targetDate ? { 'Target Date': dateProp(targetDate) } : {}),
    ...(obsidianLink ? { 'Obsidian Link': urlProp(obsidianLink) } : {}),
    ...(githubUrl ? { 'GitHub URL': urlProp(githubUrl) } : {}),
    ...(description ? { 'Description': richTextProp(description) } : {}),
  });
}

async function updateProject(pageId, updates) {
  const props = {};
  if (updates.status) props['Status'] = selectProp(updates.status);
  if (updates.phase) props['Phase'] = selectProp(updates.phase);
  if (updates.priority) props['Priority'] = selectProp(updates.priority);
  if (updates.agentLead) props['Agent Lead'] = richTextProp(updates.agentLead);
  if (updates.targetDate !== undefined) props['Target Date'] = dateProp(updates.targetDate);
  if (updates.description) props['Description'] = richTextProp(updates.description);
  return updatePage(pageId, props);
}

async function archiveProject(pageId) {
  return archivePage(pageId);
}

async function getActiveProjects() {
  return queryDatabase(DB.projects, {
    property: 'Status', select: { equals: 'Active' }
  }, [{ property: 'Priority', direction: 'ascending' }]);
}

async function getProjectsByDomain(domain) {
  return queryDatabase(DB.projects, {
    and: [
      { property: 'Domain', select: { equals: domain } },
      { property: 'Status', select: { does_not_equal: 'Completed' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ]
  });
}

async function findProjectByName(name) {
  const result = await queryDatabase(DB.projects, {
    property: 'Project Name', title: { equals: name }
  }, null, 1);
  return result.results[0] || null;
}

async function createFromFeatureRequest(feature) {
  return createProject({
    name: feature.name || feature.title,
    status: 'Planning',
    phase: 'Discovery',
    domain: feature.domain || 'Engineering',
    description: feature.description,
    agentLead: 'engineering-software-architect',
    githubUrl: 'https://github.com/APoLLoGoD666/ai-os-server',
  });
}

function extractProject(page) {
  const p = page.properties;
  return {
    notionId: page.id,
    name: extractProp(p['Project Name']),
    status: extractProp(p['Status']),
    phase: extractProp(p['Phase']),
    priority: extractProp(p['Priority']),
    domain: extractProp(p['Domain']),
    client: extractProp(p['Client']),
    agentLead: extractProp(p['Agent Lead']),
    startDate: extractProp(p['Start Date']),
    targetDate: extractProp(p['Target Date']),
    obsidianLink: extractProp(p['Obsidian Link']),
    githubUrl: extractProp(p['GitHub URL']),
    description: extractProp(p['Description']),
    projectId: extractProp(p['Project ID']),
  };
}

module.exports = { createProject, updateProject, archiveProject, getActiveProjects, getProjectsByDomain, findProjectByName, createFromFeatureRequest, extractProject };
