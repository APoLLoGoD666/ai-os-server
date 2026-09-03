'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/domain-profile.js
// Task: W1-14 — RT-15 Domain Runtime Type Definitions
// Runtime: RT-15 — Domain Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-26
// Authority: R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16;
//            D6 §2.4 (cross-domain relationships); D6 Part 9 §9.2–§9.7 (coherence dimensions);
//            D6 Part 10 (eight Domain Failure Modes DF-1 through DF-8);
//            D6 AIR-1 through AIR-5 (authority independence requirements);
//            RS-12 C-2 (confirmed drafting error: A0 §3.16 "six" failure modes — D6 Part 10 governs: eight);
//            I1-SEQUENCING §W1-14
//
// NOTE: Wave plan W1-14 cites A0-v1.1.1 §3.15 for RT-15 constitutional seat.
// R15-v1.0-canonical.md RS-01 frontmatter specifies §3.16 as correct seat.
// CONSTITUTIONAL blocks use §3.16 (correct); discrepancy documented here
// following precedent from W1-04 (§3.5→§3.6) and W1-12 (§3.6→§3.7).
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── CROSS-RUNTIME OWNERSHIP BOUNDARIES ──────────────────────────────────────
// RT-15 DOES NOT own:
//   - ActorProfile objects (RT-01 owns) — DomainActorProfileRegistry holds refs only
//   - Base authority grant objects (RT-02 owns) — DomainAuthorityRecord holds refs only
//   - DomainUnderstandingModel (RT-10 owns) — RT-15 reads, does not create
//   - CivilizationUnderstandingModel (RT-11 owns) — RT-15 routes to RT-11, does not own
//   - AIR-4 / AIR-5 authority independence records (not RT-15)
// RT-15 owns ONLY: per-domain instance state and relationship records (RS-07)
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainProfile
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// RT15-INV-1 (DomainProfile is the per-instance root object — one per domain)
//
// Root constitutional object for each of the 12 domain instances
// (DOM-000001 through DOM-000012). Holds the domain's reality context,
// internal representation, and cross-runtime status references. Never deleted.
// ─────────────────────────────────────────────────────────────────────────────

const DomainProfile = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainProfile',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; RT15-INV-1 (per-instance root; one per domain)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: per RT15-INV-1 and RS-07 deletion_policy
    deletion_policy:      'PROHIBITED',
    // Status references updated on domain state changes — not immutable
    structural_immutable: false,
    invariants: ['RT15-INV-1'],
    constitutional_note: 'NEVER DELETED (RT15-INV-1; RS-07). One per domain instance — exactly 12 exist for DOM-000001 through DOM-000012. authority_record_ref references the domain\'s DomainAuthorityRecord (RT-15 owned). knowledge_status and projection_status are cross-runtime status summaries; the underlying objects are owned by RT-10 and RT-13/RT-14 respectively. last_updated_at updated on any state change.',
  }),

  SCHEMA: Object.freeze({

    domain_profile_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainProfile "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainProfile',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier (DOM-000001 through DOM-000012)"; A0-v1.1.1 §3.16',
      description: 'Constitutional domain identifier. One of: DOM-000001 through DOM-000012.',
    }),

    domain_name: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain name"',
      description: 'Human-readable name for this domain',
    }),

    reality_context: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "reality context"; D2 Layer 1',
      description: 'Constitutional reality context for this domain — the external reality segment this domain governs per D2 Layer 1',
    }),

    internal_representation: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "internal representation"',
      description: 'RT-15 internal representation of this domain\'s current state',
    }),

    authority_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority record reference"; RT15-INV-3',
      description: 'DomainAuthorityRecord.dar_id for this domain\'s authority record (RT-15 owned). Not the RT-02 base authority grant — reference only.',
    }),

    knowledge_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "knowledge status"; RT-10 cross-runtime reference',
      description: 'Current knowledge status for this domain. Cross-runtime status summary — underlying DomainUnderstandingModel is owned by RT-10.',
    }),

    projection_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "projection status"; RT-13/RT-14 cross-runtime reference',
      description: 'Current projection/consequence status for this domain. Cross-runtime status summary — underlying projection objects are owned by RT-13/RT-14.',
    }),

    last_updated_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "last updated timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent update to this DomainProfile',
    }),

  }),

  validate(data) {
    return _validate('DomainProfile', DomainProfile.SCHEMA, data);
  },

  create(data) {
    return _create('DomainProfile', DomainProfile.SCHEMA, DomainProfile.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainAuthorityRecord
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// D6 AIR-1 through AIR-5 (authority independence requirements);
// RT15-INV-3 (domain authority assignments must be current and complete)
//
// Holds domain-level authority assignments across five AIR authority roles.
// Each array contains string references to authority holder identifiers —
// these reference RT-02 base authority grant objects (RT-02 owns);
// DomainAuthorityRecord holds domain assignment references ONLY, not the
// underlying base authority objects.
// ─────────────────────────────────────────────────────────────────────────────

const DomainAuthorityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainAuthorityRecord',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; D6 AIR-1 through AIR-5 (authority independence requirements); RT15-INV-3',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Authority assignments updated as domain governance evolves
    structural_immutable: false,
    invariants: ['RT15-INV-3'],
    constitutional_note: 'NEVER DELETED. RT-15 holds DOMAIN ASSIGNMENT REFERENCES — not base authority grant objects. Base authority grants are RT-02 property (RT-02 owns). The five AIR authority holder arrays reference identifiers that correspond to D6 AIR-1 through AIR-5 authority roles. air_compliance_status synthesizes compliance across all five AIR requirements. last_updated_at updated on any assignment change (RT15-INV-3).',
  }),

  SCHEMA: Object.freeze({

    dar_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainAuthorityRecord "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainAuthorityRecord',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier"; RT15-INV-3',
      description: 'Constitutional domain identifier this DomainAuthorityRecord governs',
    }),

    // CONSTITUTIONALLY REQUIRED: five AIR authority holder arrays (D6 AIR-1 through AIR-5)
    // Each array holds string references — RT-02 owns base authority grants; these are refs only

    air_1_authority_holders: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority holder arrays"; D6 AIR-1 (authority independence requirement 1)',
      description: 'String references to D6 AIR-1 authority holders for this domain. References only — RT-02 owns base authority grants.',
    }),

    air_2_authority_holders: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority holder arrays"; D6 AIR-2 (authority independence requirement 2)',
      description: 'String references to D6 AIR-2 authority holders for this domain. References only — RT-02 owns base authority grants.',
    }),

    air_3_authority_holders: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority holder arrays"; D6 AIR-3 (authority independence requirement 3)',
      description: 'String references to D6 AIR-3 authority holders for this domain. References only — RT-02 owns base authority grants.',
    }),

    air_4_authority_holders: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority holder arrays"; D6 AIR-4 (authority independence requirement 4)',
      description: 'String references to D6 AIR-4 authority holders for this domain. References only — RT-02 owns base authority grants.',
    }),

    air_5_authority_holders: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "authority holder arrays"; D6 AIR-5 (audit independence requirement)',
      description: 'String references to D6 AIR-5 audit authority holders for this domain. AIR-5 is the audit independence requirement — these holders must operate independently of RT-03 gate processing. References only — RT-02 owns base authority grants.',
    }),

    air_compliance_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "AIR compliance status"; D6 AIR-1 through AIR-5',
      description: 'Synthesized compliance status across D6 AIR-1 through AIR-5 for this domain',
    }),

    last_updated_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "last updated timestamp"; D2 Layer 6; RT15-INV-3',
      description: 'ISO 8601 timestamp of the most recent authority assignment update for this domain (RT15-INV-3)',
    }),

  }),

  validate(data) {
    return _validate('DomainAuthorityRecord', DomainAuthorityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('DomainAuthorityRecord', DomainAuthorityRecord.SCHEMA, DomainAuthorityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainActorProfileRegistry
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// R1-v1.1-canonical.md RS-07 RT01-OWN-01 (ActorProfile owned by RT-01);
// RS-07.2 (RT-15 explicitly does NOT own ActorProfile)
//
// Registry of actor profile references for actors operating within a domain.
// registered_actors holds string identifiers referencing RT-01 ActorProfile
// objects — RT-01 owns all ActorProfile objects; this registry holds refs only.
// ─────────────────────────────────────────────────────────────────────────────

const DomainActorProfileRegistry = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainActorProfileRegistry',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; R1-v1.1 RS-07 RT01-OWN-01 (ActorProfile owned by RT-01); RS-07.2 (RT-15 does NOT own ActorProfile)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Actor membership in domain changes over time
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NEVER DELETED. CRITICAL CROSS-RUNTIME BOUNDARY: registered_actors holds STRING REFERENCES to RT-01 ActorProfile objects ONLY. RT-01 owns all ActorProfile objects (RT01-OWN-01). RT-15 cannot create, modify, or claim ownership of ActorProfile objects (RS-07.2 explicit exclusion). correspondent_registrations holds cross-domain actor correspondence refs. last_updated_at updated on registry membership change.',
  }),

  SCHEMA: Object.freeze({

    registry_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainActorProfileRegistry "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainActorProfileRegistry',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier"',
      description: 'Constitutional domain identifier this registry governs',
    }),

    // CROSS-RUNTIME BOUNDARY: string references to RT-01 ActorProfile objects — NOT owned by RT-15
    registered_actors: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "registered actor profile references"; R1-v1.1 RS-07 RT01-OWN-01; RS-07.2 (RT-15 exclusion)',
      description: 'Array of ActorProfile identifier strings for actors operating in this domain. REFERENCES ONLY — RT-01 owns all ActorProfile objects. RT-15 cannot create or modify ActorProfile objects.',
    }),

    correspondent_registrations: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "correspondent registrations"; D6 §2.4',
      description: 'Array of cross-domain actor correspondence registration identifiers for actors spanning multiple domains',
    }),

    last_updated_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "last updated timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent registry membership update',
    }),

  }),

  validate(data) {
    return _validate('DomainActorProfileRegistry', DomainActorProfileRegistry.SCHEMA, data);
  },

  create(data) {
    return _create('DomainActorProfileRegistry', DomainActorProfileRegistry.SCHEMA, DomainActorProfileRegistry.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainKnowledgeChain
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// D6 Part 9 (knowledge states DKS-1 through DKS-4); RT-10 boundary
//
// Tracks the ordered chain of domain-scoped knowledge entries and current
// domain knowledge state (DKS-1 through DKS-4). RT-10 owns the underlying
// DomainUnderstandingModel; RT-15 maintains the domain-scoped knowledge chain
// and state tracking as a per-instance constitutional object.
// ─────────────────────────────────────────────────────────────────────────────

const DomainKnowledgeChain = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainKnowledgeChain',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; D6 Part 9 (domain knowledge states DKS-1 through DKS-4); RT-10 DomainUnderstandingModel ownership boundary',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Knowledge chain entries appended as domain knowledge evolves
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NEVER DELETED. RT-15 maintains the domain-scoped knowledge chain and DKS state tracking. The underlying DomainUnderstandingModel is owned by RT-10 — RT-15 references it, does not own it. dks_1 through dks_4 track the four domain knowledge states per D6 Part 9. knowledge_entries is an append-only chain of domain knowledge entry identifiers. last_updated_at updated on any chain or state change.',
  }),

  SCHEMA: Object.freeze({

    chain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainKnowledgeChain "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainKnowledgeChain',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier"',
      description: 'Constitutional domain identifier this knowledge chain governs',
    }),

    knowledge_entries: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "knowledge entries (ordered chain)"',
      description: 'Ordered array of knowledge entry identifiers in this domain\'s knowledge chain',
    }),

    // CONSTITUTIONALLY REQUIRED: DKS-1 through DKS-4 state fields (D6 Part 9)
    dks_1: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "DKS-1 state"; D6 Part 9',
      description: 'Domain Knowledge State 1 (DKS-1) per D6 Part 9 — current state value for this domain',
    }),

    dks_2: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "DKS-2 state"; D6 Part 9',
      description: 'Domain Knowledge State 2 (DKS-2) per D6 Part 9 — current state value for this domain',
    }),

    dks_3: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "DKS-3 state"; D6 Part 9',
      description: 'Domain Knowledge State 3 (DKS-3) per D6 Part 9 — current state value for this domain',
    }),

    dks_4: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "DKS-4 state"; D6 Part 9',
      description: 'Domain Knowledge State 4 (DKS-4) per D6 Part 9 — current state value for this domain',
    }),

    last_updated_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "last updated timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent knowledge chain or DKS state change',
    }),

  }),

  validate(data) {
    return _validate('DomainKnowledgeChain', DomainKnowledgeChain.SCHEMA, data);
  },

  create(data) {
    return _create('DomainKnowledgeChain', DomainKnowledgeChain.SCHEMA, DomainKnowledgeChain.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainCoherenceAssessment
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// D6 Part 9 §9.2–§9.7 (six coherence dimensions); RT15-INV-5;
// RT-06 DomainCoherenceStatus feed (RT-06 monitors; RT-15 synthesizes)
//
// Per-domain coherence assessment synthesized by RT-15 from RT-06 feeds.
// Evaluates all six D6 Part 9 coherence dimensions (§9.2–§9.7: Identity,
// Knowledge, Actor, Authority, Projection, Temporal). RT-06 owns the
// DomainCoherenceStatus monitoring records; RT-15 owns the domain-level
// assessment synthesis.
// ─────────────────────────────────────────────────────────────────────────────

const DomainCoherenceAssessment = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainCoherenceAssessment',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; D6 Part 9 §9.2–§9.7 (six coherence dimensions); RT15-INV-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Assessment updated each evaluation cycle
    structural_immutable: false,
    invariants: ['RT15-INV-5'],
    constitutional_note: 'NEVER DELETED (RT15-INV-5). RT-15 synthesizes domain-level coherence assessment from RT-06 DomainCoherenceStatus feeds. Six dimensions per D6 Part 9 §9.2–§9.7 must all be assessed: §9.2 Identity, §9.3 Knowledge, §9.4 Actor, §9.5 Authority, §9.6 Projection, §9.7 Temporal. overall_coherence_status synthesizes across all six. Distinct from RT-06 DomainCoherenceStatus (RT-06 monitors; RT-15 assesses and routes).',
  }),

  SCHEMA: Object.freeze({

    assessment_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainCoherenceAssessment "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainCoherenceAssessment',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier"; RT15-INV-5',
      description: 'Constitutional domain identifier this assessment covers',
    }),

    // CONSTITUTIONALLY REQUIRED: six dimensions per D6 Part 9 §9.2–§9.7
    d6_9_2_identity_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.2 (Identity coherence)',
      description: 'Assessment of D6 Part 9 §9.2 Identity coherence dimension for this domain',
    }),

    d6_9_3_knowledge_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.3 (Knowledge coherence)',
      description: 'Assessment of D6 Part 9 §9.3 Knowledge coherence dimension for this domain',
    }),

    d6_9_4_actor_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.4 (Actor coherence)',
      description: 'Assessment of D6 Part 9 §9.4 Actor coherence dimension for this domain',
    }),

    d6_9_5_authority_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.5 (Authority coherence)',
      description: 'Assessment of D6 Part 9 §9.5 Authority coherence dimension for this domain',
    }),

    d6_9_6_projection_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.6 (Projection coherence)',
      description: 'Assessment of D6 Part 9 §9.6 Projection coherence dimension for this domain',
    }),

    d6_9_7_temporal_coherence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "six coherence dimension assessments"; D6 Part 9 §9.7 (Temporal coherence)',
      description: 'Assessment of D6 Part 9 §9.7 Temporal coherence dimension for this domain',
    }),

    overall_coherence_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "overall coherence status"; RT15-INV-5',
      description: 'Overall coherence status synthesized across all six D6 Part 9 §9.2–§9.7 dimensions for this domain',
    }),

    assessment_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "assessment timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this DomainCoherenceAssessment was generated',
    }),

  }),

  validate(data) {
    return _validate('DomainCoherenceAssessment', DomainCoherenceAssessment.SCHEMA, data);
  },

  create(data) {
    return _create('DomainCoherenceAssessment', DomainCoherenceAssessment.SCHEMA, DomainCoherenceAssessment.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — DomainFailureModeRecord
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// D6 Part 10 (eight Domain Failure Modes DF-1 through DF-8);
// RT15-INV-4 (DF-1 through DF-8 always reported — never silently absorbed)
//
// Records a detected Domain Failure Mode. failure_mode enum is constrained
// to DF-1 through DF-8 per D6 Part 10 (eight failure modes — canonical count).
//
// CONFLICT RESOLUTION: A0-v1.1.1 §3.16 cites "six Domain Failure Modes"
// (drafting error confirmed per RS-12 C-2). D6 Part 10 governs: eight
// failure modes DF-1 through DF-8. This enum reflects D6 Part 10.
// ─────────────────────────────────────────────────────────────────────────────

const DomainFailureModeRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainFailureModeRecord',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; D6 Part 10 (eight Domain Failure Modes DF-1 through DF-8 — canonical count per RS-12 C-2); RT15-INV-4',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Report status advances (REPORTED → UNDER_REVIEW → RESOLVED/ESCALATED)
    structural_immutable: false,
    invariants: ['RT15-INV-4'],
    constitutional_note: 'NEVER DELETED (RT15-INV-4). failure_mode enum constrains to DF-1 through DF-8 (eight failure modes — D6 Part 10 canonical count; A0 §3.16 "six" is a confirmed drafting error per RS-12 C-2). RT15-INV-4: ALL failure modes MUST be reported; no silent absorption is permitted. report_status transitions: REPORTED → UNDER_REVIEW → RESOLVED or ESCALATED. Escalated records route to appropriate governance actors.',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §DomainFailureModeRecord "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this DomainFailureModeRecord',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "domain identifier"; RT15-INV-4',
      description: 'Constitutional domain identifier where this failure mode was detected',
    }),

    // CONSTITUTIONALLY REQUIRED: constrained to DF-1 through DF-8 per D6 Part 10
    failure_mode: Object.freeze({
      required: true, type: 'string',
      enum: ['DF-1', 'DF-2', 'DF-3', 'DF-4', 'DF-5', 'DF-6', 'DF-7', 'DF-8'],
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "failure mode"; D6 Part 10 (DF-1 through DF-8); RT15-INV-4; RS-12 C-2 (confirms eight failure modes — A0 §3.16 "six" is a drafting error)',
      description: 'Domain Failure Mode identifier constrained to DF-1 through DF-8 per D6 Part 10. RT15-INV-4 requires all failure modes to be reported; no silent absorption permitted. (RS-12 C-2: A0 §3.16 cites "six" — this is a confirmed drafting error; D6 Part 10 governs with eight failure modes.)',
    }),

    failure_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "failure description"',
      description: 'Description of the detected domain failure, including observed symptoms and affected constitutional objects',
    }),

    detection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "detection timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this domain failure mode was detected',
    }),

    // CONSTITUTIONALLY REQUIRED: RT15-INV-4 — all failure modes must be reported
    report_status: Object.freeze({
      required: true, type: 'string',
      enum: ['REPORTED', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED'],
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "report status"; RT15-INV-4 (never silently absorbed)',
      description: 'REPORTED: failure mode detected and recorded (RT15-INV-4 satisfied). UNDER_REVIEW: under active constitutional review. RESOLVED: resolved within domain governance. ESCALATED: routed to external governance actors.',
    }),

  }),

  validate(data) {
    return _validate('DomainFailureModeRecord', DomainFailureModeRecord.SCHEMA, data);
  },

  create(data) {
    return _create('DomainFailureModeRecord', DomainFailureModeRecord.SCHEMA, DomainFailureModeRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT15 — CrossDomainRelationshipRecord
// Constitutional basis: R15-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.16;
// D6 §2.4 (cross-domain relationship taxonomy); civilization graph routing
//
// Records a constitutional relationship between two domain instances.
// relationship_type enum is bounded to the five D6 §2.4 cross-domain
// relationship classifications. civilization_graph_relevant flags records
// that are material to the civilization-level graph maintained by RT-11.
// ─────────────────────────────────────────────────────────────────────────────

const CrossDomainRelationshipRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CrossDomainRelationshipRecord',
    runtime_id:       'RT-15',
    runtime_name:     'Domain Runtime',
    authority:        'R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; D6 §2.4 (cross-domain relationship taxonomy — five relationship types)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-14',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Relationship descriptions may be updated as inter-domain state evolves
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NEVER DELETED. relationship_type enum bounded to five D6 §2.4 cross-domain classifications. civilization_graph_relevant = true flags records that are material to the RT-11 civilization-level graph — those records are routed to RT-11 for incorporation. source_domain_id and target_domain_id must both reference valid DOM-000001 through DOM-000012 identifiers.',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 §CrossDomainRelationshipRecord "Identifier"; A0-v1.1.1 §3.16',
      description: 'Unique constitutional identifier for this CrossDomainRelationshipRecord',
    }),

    source_domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "source domain identifier"; D6 §2.4',
      description: 'Constitutional domain identifier of the source domain in this relationship (DOM-000001 through DOM-000012)',
    }),

    target_domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "target domain identifier"; D6 §2.4',
      description: 'Constitutional domain identifier of the target domain in this relationship (DOM-000001 through DOM-000012)',
    }),

    // CONSTITUTIONALLY REQUIRED: constrained to five D6 §2.4 relationship types
    relationship_type: Object.freeze({
      required: true, type: 'string',
      enum: ['DEPENDENCY', 'COORDINATION', 'KNOWLEDGE_TRANSFER', 'CONFLICT', 'REFERENCE'],
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "relationship type"; D6 §2.4 (five cross-domain relationship classifications)',
      description: 'Cross-domain relationship type per D6 §2.4: DEPENDENCY (source depends on target output), COORDINATION (joint action required), KNOWLEDGE_TRANSFER (knowledge flow from source to target), CONFLICT (domain interests in constitutional tension), REFERENCE (source references target for context).',
    }),

    relationship_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "relationship description"; D6 §2.4',
      description: 'Constitutional description of this cross-domain relationship',
    }),

    established_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "established timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this cross-domain relationship was constitutionally established',
    }),

    // CONSTITUTIONALLY REQUIRED: civilization graph routing flag (RT-11)
    civilization_graph_relevant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R15-v1.0-canonical.md RS-10 "civilization graph relevant flag"; D6 §2.4; RT-11 routing',
      description: 'true: this relationship is material to the RT-11 civilization-level graph and must be routed to RT-11. false: relationship is domain-scoped and does not affect the civilization graph.',
    }),

  }),

  validate(data) {
    return _validate('CrossDomainRelationshipRecord', CrossDomainRelationshipRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CrossDomainRelationshipRecord', CrossDomainRelationshipRecord.SCHEMA, CrossDomainRelationshipRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  DomainProfile,
  DomainAuthorityRecord,
  DomainActorProfileRegistry,
  DomainKnowledgeChain,
  DomainCoherenceAssessment,
  DomainFailureModeRecord,
  CrossDomainRelationshipRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-15',
  WAVE:        'W1-14',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
