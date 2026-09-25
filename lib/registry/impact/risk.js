'use strict';

const CRITICAL_FAMILIES = new Set(['GOV', 'CIV']);

function classifyRisk(rootEntity, directEntities, allAffected) {
    if (CRITICAL_FAMILIES.has(rootEntity.family)) return 'CRITICAL';
    if (directEntities.some(e => e && CRITICAL_FAMILIES.has(e.family))) return 'CRITICAL';
    if (directEntities.some(e => e && e.family === 'CAPABILITY' && e.criticality === 'CRITICAL')) return 'CRITICAL';
    if (allAffected.length > 50) return 'CRITICAL';
    if (directEntities.length > 10) return 'HIGH';
    if (directEntities.some(e => e && e.status === 'ACTIVE' && ['SERVICE', 'MIDDLEWARE', 'API'].includes(e.type))) return 'HIGH';
    if (directEntities.some(e => e && e.family === 'CAPABILITY' && e.criticality === 'HIGH')) return 'HIGH';
    if (directEntities.length > 3 || allAffected.length > 20) return 'MEDIUM';
    return 'LOW';
}

module.exports = { classifyRisk };
