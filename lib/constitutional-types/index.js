'use strict';

// W1-01 — Constitutional Object Type Foundation
// Document ID: W1-01-INDEX
// Baseline: APEX-CONSTITUTION-v1.0
// Wave: Wave 1 — Constitutional Object Type Introduction
// Date: 2026-07-25
// Authority: I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md §W1-01; IDR-001 (canonical path confirmed)
// Amended: W1-02A (2026-07-25) — DEF-002: collision-detecting _register() replaces Object.assign
//
// This file is the integration registry for all constitutional object types.
// It is populated by W1-02 through W1-15. Until those tasks complete, exports are empty.
// No runtime behaviour. No database dependencies. No side effects.
//
// Type inventory — 83 types across 14 type files:
//
// ─── RT-01 · Identity Runtime ────────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.1; R1-v1.1-canonical.md
// Type file (W1-02): identity-record.js
//   ActorProfile
//   ExternalReference
//   StructuralIdentityRecord
//   SemanticIdentityRecord
//   ReferentialIdentityRecord
//   IdentityConflictRecord
//   IdentityEndRecord
//
// ─── RT-02 · Authority Runtime ───────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.2; R2-v1.0-canonical.md; D6 §4.2–4.7; IDR-002
// Type file (W1-03): authority-certificate.js
//   DelegationRecord
//   AuthorityClaim
//   AuthorityRevocationRecord
//   AuthorityConflictRecord
//   AuthorityScope
//
// ─── RT-05 · Change Runtime ──────────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.5; R5-v1.0-canonical.md; D-3
// Type file (W1-04): change-record.js
//   ChangeRecord
//   HistoricalAnchor
//   FabricFoundingRoot
//   ObjectLifecycleRecord
//
// ─── RT-07 · Historical State Runtime ────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.7/§3.8; R7-v1.1-canonical.md
// Type file (W1-05): historical-state-record.js
//   HistoricalStateRecord
//   ProvenanceChain
//   MemoryLifecycleRecord
//   HistoricalStateQueryResult
//
// ─── RT-08 · Observer Runtime ────────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.8; R8-v1.1-canonical.md; D5 PI-1–PI-12
// Type file (W1-06): observation-record.js
//   ObservationRecord
//   ObserverRegister
//   ObservationChannelRecord
//   ConsequenceObservationRecord
//   ObserverLimitationRecord
//
// ─── RT-09 · Epistemic Runtime ───────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.9; R9-v1.0-canonical.md
// Type file (W1-07): knowledge-record.js
//   EvidenceObject
//   InterpretationRecord
//   BeliefObject
//   KnowledgeClaim
//   KnowledgeState
//   ContradictionRecord
//   RealityGapEntry
//   EpistemicProtocol
//
// ─── RT-10 · Domain Understanding Runtime ────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.10; R10-v1.1-canonical.md
// Type file (W1-08): cum.js
//   DomainUnderstandingModel
//   InferenceProtocol
//   UnderstandingDegradationFlag
//
// ─── RT-11 · Civilizational Understanding Runtime ────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.11; R11-v1.3-canonical.md
// Type file (W1-09): civilizational-decision-proposal.js
//   CivilizationUnderstandingModel
//   DeliberationRecord
//   CausalModel
//   AssumptionRegister
//   StrategicPlan
//   CivilizationCoherenceState
//   CivilizationalDecisionProposal
//
// ─── RT-12 · Decision Runtime ────────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.12; RT12-v1.0-canonical.md
// Type file (W1-10): civilizational-decision.js
//   CivilizationalDecision
//   OpenActionRegisterEntry
//   DecisionArchiveRecord
//   CivilizationalDecisionChainRecord
//   ComplianceVerificationRecord
//
// ─── RT-13 + RT-14 · Projection and Consequence Runtimes ─────────────────────
// Constitutional authority: A0-v1.1.1 §3.13–3.14; R13-v1.0-canonical.md; R14-v1.0-canonical.md; D5
// Type files (W1-11): effect-expectation-record.js; consequence-observation-record.js
//   ActionProjection
//   EffectExpectationRecord
//   IrreversibilityClassificationRecord
//   ProjectionResponsibilityRecord
//   ProjectionBoundaryCrossingRecord
//   ObservedConsequenceRecord
//   CausalModelDivergenceRecord
//   OpenActionRegisterTerminalStatusRecord
//   ReflectionTriggerRecord
//
// ─── RT-06 · Coherence Runtime ───────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.6; R6-v1.1.1-canonical.md
// Type file (W1-12): coherence-violation-record.js
//   CoherenceViolationRecord
//   CoherenceResolutionEvent
//   CoherenceConflictRecord
//   CUMDegradationRecord
//   DomainCoherenceStatus
//
// ─── RT-03 + RT-04 · Kernel and Audit Runtimes ───────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.3–3.4; R3-v1.0-canonical.md; R4-v1.0-canonical.md; D-4; D6 AIR-5
// Type files (W1-13): kernel-record.js; audit-record.js
//   RejectionRecord
//   AccountabilityRecord
//   RollbackProvenanceRecord
//   SuspensionNotice
//   KernelOperationManifest
//   ConstitutionalAuditRecord
//   ConstitutionalComplianceAttestation
//   ConstitutionalViolationRecord
//   AuditScope
//   PreservationAuditRecord
//
// ─── RT-15 · Domain Runtime ──────────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.15; R15-v1.0-canonical.md
// Type file (W1-14): domain-profile.js
//   DomainProfile
//   DomainAuthorityRecord
//   DomainActorProfileRegistry
//   DomainKnowledgeChain
//   DomainCoherenceAssessment
//   DomainFailureModeRecord
//   CrossDomainRelationshipRecord
//
// ─── RT-16 · Amendment Runtime ───────────────────────────────────────────────
// Constitutional authority: A0-v1.1.1 §3.16; R16-v1.0-canonical.md; D7 Part 12
// Errata: C0-ERRATA-016A (D7 Part 12 canonical; D7 §6.1 superseded)
// Type file (W1-15): amendment-proposal.js
//   AmendmentProposal
//   AmendmentRegistry
//   RatifiedAmendmentRecord
//   AmendmentRejectionRecord
//
// ─── W1-16 · Integration Validation ─────────────────────────────────────────
// W1-16 validates full population of this registry. No new types.
// Prerequisite: W1-02 through W1-15 complete.

// ─── W1-02A · Collision-Detecting Registry (DEF-002) ─────────────────────────
// Replaces Object.assign flat-merge. Throws on:
//   - duplicate export name     (same JS key exported from two type files)
//   - duplicate constitutional type name (CONSTITUTIONAL.type collision)
//   - duplicate D8 canonical type number (D8 §4.1 canonical uniqueness)
//   - duplicate runtime ownership (same RUNTIME_ID in two source files)
// Constitutional basis: D8 §4.1; D8 TI-1 (Translation Invariance);
//                       W1-GATE-A DEF-002; W1-02A-CANONICAL-PATTERN-REMEDIATION.md
// ─────────────────────────────────────────────────────────────────────────────

const _registered   = {};
const _seenNames    = new Map(); // export name         → source file
const _seenTypeIds  = new Map(); // CONSTITUTIONAL.type → source file
const _seenD8Types  = new Map(); // d8_canonical_type   → CONSTITUTIONAL.type
const _seenRuntimes = new Map(); // RUNTIME_ID          → source file

function _register(sourceFile, runtimeId, typesMap) {
  if (_seenRuntimes.has(runtimeId)) {
    throw new Error(
      `[Constitutional Registry] Runtime ownership collision: '${runtimeId}' ` +
      `(${sourceFile}) already owned by '${_seenRuntimes.get(runtimeId)}'`
    );
  }
  _seenRuntimes.set(runtimeId, sourceFile);

  for (const [exportName, typeObj] of Object.entries(typesMap)) {
    if (!typeObj || typeof typeObj !== 'object' || !typeObj.CONSTITUTIONAL) {
      throw new Error(
        `[Constitutional Registry] '${exportName}' from '${sourceFile}' missing CONSTITUTIONAL block`
      );
    }
    const c = typeObj.CONSTITUTIONAL;

    if (_seenNames.has(exportName)) {
      throw new Error(
        `[Constitutional Registry] Export name collision: '${exportName}' ` +
        `(${sourceFile}) already registered from '${_seenNames.get(exportName)}'`
      );
    }

    if (_seenTypeIds.has(c.type)) {
      throw new Error(
        `[Constitutional Registry] Constitutional type collision: '${c.type}' ` +
        `(${sourceFile}) already registered from '${_seenTypeIds.get(c.type)}'`
      );
    }

    if (c.d8_canonical_type !== null && c.d8_canonical_type !== undefined) {
      if (_seenD8Types.has(c.d8_canonical_type)) {
        throw new Error(
          `[Constitutional Registry] D8 canonical type number ${c.d8_canonical_type} ` +
          `claimed by '${c.type}' (${sourceFile}) — already assigned to '${_seenD8Types.get(c.d8_canonical_type)}'`
        );
      }
      _seenD8Types.set(c.d8_canonical_type, c.type);
    }

    _seenNames.set(exportName, sourceFile);
    _seenTypeIds.set(c.type, sourceFile);
    _registered[exportName] = typeObj;
  }
}

// ─── W1-02 · RT-01 Identity Runtime (COMPLETE) ───────────────────────────────
const identity = require('./identity-record');
_register('identity-record.js', identity.RUNTIME_ID, identity.TYPES);

// ─── W1-03 · RT-02 Authority Runtime (COMPLETE) ──────────────────────────────
const authority = require('./authority-certificate');
_register('authority-certificate.js', authority.RUNTIME_ID, authority.TYPES);

// ─── W1-04 · RT-05 Reality Fabric Runtime (COMPLETE) ─────────────────────────
const change = require('./change-record');
_register('change-record.js', change.RUNTIME_ID, change.TYPES);

// ─── W1-05 · RT-07 Memory Runtime (COMPLETE) ─────────────────────────────────
const memory = require('./historical-state-record');
_register('historical-state-record.js', memory.RUNTIME_ID, memory.TYPES);

// ─── W1-06 · RT-08 Observer Runtime (COMPLETE) ───────────────────────────────
// IDR-003 RESOLVED 2026-07-26 — Option A: ConsequenceObservationRecord owned by RT-08
const observation = require('./observation-record');
_register('observation-record.js', observation.RUNTIME_ID, observation.TYPES);

// ─── W1-07 · RT-09 Knowledge Runtime (COMPLETE) ──────────────────────────────
// DKS enum: R9 RS-10.5 governs (ACTIVE/UNCERTAIN/CONTESTED/DEGRADED); wave plan discrepancy noted
const knowledge = require('./knowledge-record');
_register('knowledge-record.js', knowledge.RUNTIME_ID, knowledge.TYPES);

// ─── W1-08 · RT-10 Intelligence Runtime (COMPLETE) ───────────────────────────
// C-1: task authorization calls RT-10 "Learning Runtime"; R10-v1.1 canonical name
//      is "Intelligence Runtime" (A0 §3.11); R-series governs
// C-2: task authorization specifies learning-record.js; wave plan says cum.js;
//      operative task instruction governs for file name
// C-3: wave plan cites A0 §3.10; correct seat is §3.11 (R10-v1.1 RS-01)
const learning = require('./learning-record');
_register('learning-record.js', learning.RUNTIME_ID, learning.TYPES);

// ─── W1-12 · RT-06 Coherence Runtime (COMPLETE) ──────────────────────────────
const coherence = require('./coherence-violation-record');
_register('coherence-violation-record.js', coherence.RUNTIME_ID, coherence.TYPES);

// ─── W1-13 · RT-03 Constitutional Enforcement Kernel Runtime (COMPLETE) ───────
const kernel = require('./kernel-record');
_register('kernel-record.js', kernel.RUNTIME_ID, kernel.TYPES);

// ─── W1-13 · RT-04 Constitutional Governance Audit Runtime (COMPLETE) ─────────
const audit = require('./audit-record');
_register('audit-record.js', audit.RUNTIME_ID, audit.TYPES);

// ─── W1-14 · RT-15 Domain Runtime (COMPLETE) ─────────────────────────────────
const domain = require('./domain-profile');
_register('domain-profile.js', domain.RUNTIME_ID, domain.TYPES);

// ─── W1-09 · RT-11 Civilization Intelligence Runtime (COMPLETE) ───────────────
// D-1: wave plan cites A0 §3.11; correct constitutional seat is §3.12 (R11-v1.3 RS-01);
//      same off-by-one artifact as W1-04 W1-07 W1-08 W1-12 W1-14; R-series governs
// D-2: wave plan 7-type scope includes CDP (RS-10 Item 3 managed object; RT-12 handoff)
//      and defers CUMDegradationState and CollectiveIntelligenceContributionRecord
const civilization = require('./civilizational-decision-proposal');
_register('civilizational-decision-proposal.js', civilization.RUNTIME_ID, civilization.TYPES);

// ─── W1-10 · RT-12 Decision Runtime (COMPLETE) ───────────────────────────────
// D-1: wave plan cites A0 §3.12; correct constitutional seat is §3.13 (RT12-v1.0 RS-01);
//      same off-by-one artifact as W1-04 W1-07 W1-08 W1-09 W1-12 W1-14; R-series governs
// D-2: wave plan 5-type scope includes ComplianceVerificationRecord; not in A0 §3.13
//      Owned Objects but grounded in A1 §5.1 AIR-2/Compliance + PAIR 43/VC-5; implemented
// D-3: wave plan uses "ComplianceVerificationRecord"; RT12 RS-09 says "ComplianceDeterminationRecord";
//      wave plan governs for export name
const decision = require('./civilizational-decision');
_register('civilizational-decision.js', decision.RUNTIME_ID, decision.TYPES);

// ─── W1-11 · RT-13 Action Runtime (COMPLETE) ─────────────────────────────────
// D-1: index.js stub cites "A0-v1.1.1 §3.13–3.14" for RT-13/RT-14; correct seats are
//      RT-13 §3.14 and RT-14 §3.15 (R13-v1.0 RS-01; R14-v1.0 RS-01); same off-by-one
//      artifact as W1-04 W1-07 W1-08 W1-09 W1-10 W1-12 W1-14; R-series governs;
//      CONSTITUTIONAL blocks in each file cite correct section numbers
// D-2: wave plan specifies "consequence-observation-record.js" for RT-14;
//      ConsequenceObservationRecord is RT-08 owned (W1-06 observation-record.js);
//      RT-14 implemented as "observed-consequence-record.js" to reflect RT-14 ownership
//      and avoid type-space confusion with RT-08; no constitutional prohibition; TYPE A
// D-3: wave plan names RT-13 "Action Projection Runtime"; A0 §3.14 canonical name is
//      "Action Runtime" (R13-v1.0-canonical.md RS-12 Conflict C-1); A0 governs; TYPE C
// D-4: wave plan names RT-14 "Reality Feedback Runtime"; A0 §3.15 canonical name is
//      "Reflection Runtime" (R14-v1.0-canonical.md RS-12 Conflict C-1); A0 governs; TYPE C
const action = require('./effect-expectation-record');
_register('effect-expectation-record.js', action.RUNTIME_ID, action.TYPES);

// ─── W1-11 · RT-14 Reflection Runtime (COMPLETE) ─────────────────────────────
const reflection = require('./observed-consequence-record');
_register('observed-consequence-record.js', reflection.RUNTIME_ID, reflection.TYPES);

// ─── W1-15 · RT-16 Amendment Runtime (COMPLETE) ──────────────────────────────
// D-1: index.js stub cites "A0-v1.1.1 §3.16" for RT-16; correct constitutional
//      seat is §3.17 (R16-v1.0-canonical.md RS-01); same off-by-one artifact as
//      W1-04 W1-07 W1-08 W1-09 W1-10 W1-11 W1-12 W1-14; R-series governs;
//      CONSTITUTIONAL blocks in amendment-proposal.js cite §3.17
const amendment = require('./amendment-proposal');
_register('amendment-proposal.js', amendment.RUNTIME_ID, amendment.TYPES);

module.exports = Object.assign({}, _registered);
