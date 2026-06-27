'use strict';
require('dotenv').config({ path: '.env' });
const fs   = require('fs');
const path = require('path');

const EPISODES_DIR = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS/12 Memory/Episodes/';
const GOALS_DIR    = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS/System/Goals/';

const episodes = [
  { id:'shadow-001', objective:"[SHADOW] Implement rate limiting middleware for API endpoints", success:true,  failedStage:null, complexity:'moderate', cost:0.023, durationMs:52000,  timestamp:'2026-06-06T10:00:00.000Z', keywords:['rate','limit','api'],        synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-002', objective:"[SHADOW] Add pagination to user activity feed query",           success:true,  failedStage:null, complexity:'simple',   cost:0.008, durationMs:18000,  timestamp:'2026-06-06T10:15:00.000Z', keywords:['pagination','query'],        synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-003', objective:"[SHADOW] Refactor invoice PDF generation to use templates",     success:true,  failedStage:null, complexity:'complex',  cost:0.071, durationMs:98000,  timestamp:'2026-06-06T10:30:00.000Z', keywords:['invoice','pdf','template'],  synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-004', objective:"[SHADOW] Set up nightly backup cron job for Supabase data",     success:true,  failedStage:null, complexity:'moderate', cost:0.019, durationMs:42000,  timestamp:'2026-06-06T10:45:00.000Z', keywords:['backup','cron','supabase'],   synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-005', objective:"[SHADOW] Build email digest scheduler with retry logic",        success:true,  failedStage:null, complexity:'moderate', cost:0.034, durationMs:61000,  timestamp:'2026-06-06T11:00:00.000Z', keywords:['email','digest','retry'],    synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-006', objective:"[SHADOW] Add role-based access control to admin routes",        success:true,  failedStage:null, complexity:'complex',  cost:0.055, durationMs:87000,  timestamp:'2026-06-06T11:15:00.000Z', keywords:['rbac','auth','admin'],       synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-007', objective:"[SHADOW] Implement WebSocket reconnection with exponential backoff", success:true, failedStage:null, complexity:'moderate', cost:0.028, durationMs:55000, timestamp:'2026-06-06T11:30:00.000Z', keywords:['websocket','reconnect'],  synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-008', objective:"[SHADOW] Create Postgres index on email_threads sender column", success:true,  failedStage:null, complexity:'simple',   cost:0.006, durationMs:12000,  timestamp:'2026-06-06T11:45:00.000Z', keywords:['postgres','index','email'],  synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-009', objective:"[SHADOW] Extract invoice line items into separate database table", success:true, failedStage:null, complexity:'complex', cost:0.082, durationMs:115000, timestamp:'2026-06-06T12:00:00.000Z', keywords:['invoice','database','table'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-010', objective:"[SHADOW] Deploy health check endpoint returning service status JSON", success:true, failedStage:null, complexity:'simple', cost:0.007, durationMs:16000, timestamp:'2026-06-06T12:15:00.000Z', keywords:['health','deploy','endpoint'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-011', objective:"[SHADOW] Migrate sessions from Redis to Postgres with zero downtime", success:false, failedStage:'DEVELOPER', failureReason:'Migration rollback triggered: row locking exceeded timeout', complexity:'critical', cost:0.091, durationMs:145000, timestamp:'2026-06-06T12:30:00.000Z', keywords:['migration','redis','postgres'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-012', objective:"[SHADOW] Build real-time dashboard widget for active user count", success:false, failedStage:'DEVELOPER', failureReason:'WebSocket broadcast caused memory spike', complexity:'moderate', cost:0.042, durationMs:73000, timestamp:'2026-06-06T12:45:00.000Z', keywords:['realtime','dashboard','websocket'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-013', objective:"[SHADOW] Add full-text search index on Supabase invoices table", success:false, failedStage:'REVIEWER', failureReason:'Reviewer flagged missing RLS policy on new GIN index', complexity:'moderate', cost:0.038, durationMs:67000, timestamp:'2026-06-06T13:00:00.000Z', keywords:['search','index','supabase','rls'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-014', objective:"[SHADOW] Implement two-factor authentication via TOTP",          success:false, failedStage:'DEVELOPER', failureReason:'TOTP secret storage not encrypted at rest', complexity:'complex', cost:0.067, durationMs:102000, timestamp:'2026-06-06T13:15:00.000Z', keywords:['2fa','totp','auth','security'], synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-015', objective:"[SHADOW] Refactor agent orchestrator to support parallel stage execution", success:false, failedStage:'DEVELOPER', failureReason:'Race condition in shared state between parallel agents', complexity:'critical', cost:0.103, durationMs:158000, timestamp:'2026-06-06T13:30:00.000Z', keywords:['orchestrator','parallel','agent'], synthetic:true, dataset_id:'shadow', removable:true },
];

const goals = [
  { id:'shadow-goal-001', objective:"[SHADOW] Reduce API p95 latency below 200ms",                status:'in_progress', priority:'high',     createdAt:'2026-06-06T09:00:00.000Z', synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-goal-002', objective:"[SHADOW] Achieve 99.5% uptime SLA for billing service",     status:'completed',   priority:'critical',  createdAt:'2026-06-06T09:00:00.000Z', completedAt:'2026-06-06T15:00:00.000Z', synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-goal-003', objective:"[SHADOW] Migrate all email threads to new storage schema",   status:'completed',   priority:'high',      createdAt:'2026-06-06T09:00:00.000Z', completedAt:'2026-06-06T14:30:00.000Z', synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-goal-004', objective:"[SHADOW] Implement audit logging for all admin actions",     status:'blocked',     priority:'medium',    createdAt:'2026-06-06T09:00:00.000Z', blockedReason:'Security review pending legal approval', synthetic:true, dataset_id:'shadow', removable:true },
  { id:'shadow-goal-005', objective:"[SHADOW] Deploy zero-downtime rolling update pipeline",      status:'pending',     priority:'medium',    createdAt:'2026-06-06T09:00:00.000Z', synthetic:true, dataset_id:'shadow', removable:true },
];

let t = Date.now();
for (const ep of episodes) {
  fs.writeFileSync(path.join(EPISODES_DIR, 'ep-' + ep.id + '.json'), JSON.stringify(ep, null, 2));
}
const epMs = Date.now() - t;

t = Date.now();
for (const g of goals) {
  fs.writeFileSync(path.join(GOALS_DIR, 'goal-' + g.id + '.json'), JSON.stringify(g, null, 2));
}
const goalMs = Date.now() - t;

const mem = require('./agent-system/episodic-memory');
const gt  = require('./agent-system/goal-tracker');
const t2 = Date.now();
const epCount  = mem.episodeCount();
const goalObjs = gt.getGoals();
const loadMs = Date.now() - t2;

console.log(JSON.stringify({
  episodesWritten: episodes.length,
  goalsWritten: goals.length,
  epWriteMs: epMs,
  goalWriteMs: goalMs,
  avgEpWriteMs: +(epMs/episodes.length).toFixed(2),
  postIngestEpisodeCount: epCount,
  postIngestGoalCount: goalObjs.length,
  moduleLoadMs: loadMs,
}));
