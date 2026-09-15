# UX-02 — User + Task Model / Canonical User Journeys

**Programme**: APEX UX Phase  
**Task ID**: UX-02  
**Status**: COMPLETE  
**Date**: 2026-08-26  
**Type**: Design / Discovery — ZERO APPLICATION MODIFICATIONS  

---

## 1. Authority

Derives authority from:
- UX-00 — Legacy Interface Baseline (accepted 2026-08-26)
- UX-01 — Canonical UX Discovery (completed 2026-08-26)
- APEX Constitutional Architecture (A1–A6)
- KG-01 through KG-08 certified knowledge system
- APEX runtime architecture (CLAUDE.md)

This document is the authoritative behavioural specification for APEX human interaction. All later implementation phases must implement the model defined here.

---

## 2. Scope

**In scope**: User model, intent taxonomy, task taxonomy, 25 canonical journeys, multimodal decision rules, conversation behaviour, proactive behaviour, attention management, presentation lifecycle, decision/authority model, knowledge-aware behaviour, memory-aware behaviour, error and recovery model, surface transitions, Tree-of-Life task model, long-running work, UX invariants.

**Out of scope**: Visual design, component implementation, CSS, route changes, database changes, framework selection, voice provider selection. All deferred to implementation phases.

**Constraint**: Only `docs/interface/UX-02-USER-TASK-MODEL.md` may be created. No application file may be modified.

---

## 3. Source Documents

| Document | Status | Consumption |
|----------|--------|-------------|
| UX-00 — Legacy Interface Baseline | ACCEPTED | Legacy interface facts (OBSERVED) |
| UX-01 — Canonical UX Discovery | COMPLETE | Inherited UX decisions (INHERITED) |
| CLAUDE.md (project) | Active | Runtime architecture, agent model |
| KG-07 / KG-08 certifications | CERTIFIED | Knowledge system behaviour |
| dashboard.html (20,826 lines) | Audited by UX-00 | UI/API evidence |

Evidence classification used throughout:
- **OBSERVED** — directly evidenced in UX-00 or repository
- **INHERITED** — established by UX-01, not re-decided here
- **PROPOSED** — new UX-02 design decision
- **OPEN** — cannot responsibly resolve yet

---

## 4. User Model

### 4.1 The Relationship

APEX has one primary user: the owner. This is not a multi-tenant product. The UX is designed for a single human who owns, operates, and governs APEX.

```
OWNER / HUMAN
      ↕
    APEX
```

This relationship is:
- **Persistent**: APEX remembers across sessions
- **Asymmetric**: APEX serves the human, not the reverse
- **Governed**: APEX operates within constitutional constraints
- **Trustworthy**: APEX must be honest about uncertainty, gaps, and failures
- **Controllable**: The human can override, correct, stop, or redirect at any point

### 4.2 Fundamental Human Needs

| Need | What the user expects APEX to do |
|------|----------------------------------|
| COMMUNICATE | Understand natural language; respond naturally; match complexity to context |
| UNDERSTAND | Interpret intent correctly, including ambiguous or partial requests |
| ASK | Answer questions with appropriate depth; acknowledge what is unknown |
| INVESTIGATE | Retrieve, assess, and explain information on request |
| DECIDE | Support decisions with evidence, alternatives, and honest risk assessment |
| APPROVE | Present proposed actions clearly; wait for explicit approval before execution |
| REJECT | Accept rejection gracefully; not re-propose without invitation |
| MODIFY | Accept modification to proposed actions without losing context |
| EXECUTE | Perform approved actions reliably; report outcomes honestly |
| MONITOR | Provide visibility of ongoing work without requiring user to poll |
| REMEMBER | Capture and retain user-stated facts, preferences, and corrections |
| CORRECT | Accept correction without defensiveness; update behaviour accordingly |
| TEACH | Absorb new information or preferences the user explicitly provides |
| INSPECT | Allow the user to examine anything APEX knows, has done, or has decided |
| RECEIVE | Deliver proactive communications that justify the interruption |
| INTERRUPT | Allow the user to stop APEX at any moment without friction |
| DELEGATE | Allow the user to assign work to agents and receive outcomes |

### 4.3 What the User Does NOT Want

- To be interrupted without justification
- To receive uncertain information presented as certain
- To be unable to understand why APEX did something
- To lose context when switching between voice and text
- To be unable to stop or reverse an action
- To discover that APEX acted consequentially without approval
- To wade through technical implementation details during normal use
- To repeat themselves when context was already established

---

## 5. Intent Model

### 5.1 Canonical Intent Taxonomy

User intents group naturally. Not every intent is distinct — ASK, FIND, and EXPLAIN overlap depending on context.

**GROUP A — RETRIEVAL** (user wants information)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| ASK | Direct question with expected answer | "What is X?" / "How much is Y?" |
| FIND | Locate specific information or item | "Find my [X]." / "Where is [Y]?" |
| REVIEW | Read/inspect existing records or history | "Show me my recent [X]." |
| EXPLORE | Open-ended discovery within a domain | "Walk me through my [domain]." |

**GROUP B — UNDERSTANDING** (user wants to comprehend something)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| EXPLAIN | Request for reasoning or elaboration | "Why?" / "Explain this." / "How does this work?" |
| COMPARE | Request for side-by-side analysis | "Compare X and Y." / "What changed?" |
| ANALYSE | Request for assessment or pattern recognition | "Analyse my [X]." / "What does this mean?" |

**GROUP C — DIRECTION** (user wants APEX to produce something)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| RECOMMEND | Request for a proposal or suggestion | "What should I do?" / "Recommend something." |
| PLAN | Request for a structured future approach | "Plan my [X] for [period]." |
| SUMMARISE | Request for condensed output | "Summarise this." / "Give me the key points." |

**GROUP D — DECISION** (user exercises authority)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| DECIDE | User makes a choice APEX presented | Selecting an option |
| APPROVE | Explicit authorisation of a proposed action | "Do it." / "Yes." / "Approved." |
| REJECT | Refusal of a proposed action | "No." / "Don't do that." / "Rejected." |
| MODIFY | Change a proposed action before executing | "Do it, but [change]." |
| DEFER | Delay a decision or action | "Not now." / "Remind me later." |

**GROUP E — EXECUTION** (user wants something done)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| EXECUTE | Initiate or confirm an action | "Do it." / "Send this." / "Schedule that." |
| CANCEL | Stop an in-progress action | "Stop." / "Cancel." |
| MONITOR | Track an ongoing task | "What's the status of [X]?" |

**GROUP F — MEMORY** (user manages what APEX knows)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| REMEMBER | Explicitly store a fact or preference | "Remember that [X]." |
| FORGET | Remove a memory | "Forget that." / "Remove what you know about [X]." |
| CORRECT | Update incorrect APEX knowledge | "That's wrong — actually [X]." |
| TEACH | Provide APEX with new information | "Here's something you should know:" |

**GROUP G — CONTROL** (user manages APEX behaviour)

| Intent | Meaning | Typical phrasing |
|--------|---------|-----------------|
| INTERRUPT | Stop APEX mid-response | Speaking over APEX / "Stop." |
| MUTE | Suppress voice output | "Mute." / "Don't speak." |
| CORRECT | Redirect a misunderstood intent | "No, I meant [X]." |
| RESPOND | React to a proactive APEX notification | Acknowledging / acting on alert |

### 5.2 Intent Recognition Rules

APEX must resolve ambiguous intents using conversation context.

| Ambiguous input | Resolution |
|----------------|-----------|
| "What about next month?" | Continuation — same intent as previous turn, period shifted |
| "More detail." | EXPLAIN intent — expand current topic |
| "And [X]?" | Continuation — compound the current query |
| Single word "Why?" | EXPLAIN intent — reason for most recent APEX statement |
| "Is that right?" | Verification request — APEX confirms or qualifies its last statement |
| "Do it." after a recommendation | APPROVE/EXECUTE — intent depends on whether action was proposed |
| "OK." | Acknowledgement — not an approval; APEX must not execute on acknowledgement alone |

---

## 6. Task Model

Every APEX interaction follows this canonical model:

```
USER INTENT (what the user wants)
        │
        ▼
TASK (what APEX must do)
        │
        ▼
APEX UNDERSTANDING (is intent clear? If not → clarify)
        │
        ▼
KNOWLEDGE STATE (is sufficient knowledge available?)
        │ SUFFICIENT → proceed
        │ INSUFFICIENT → surface gap; offer research or best available
        │ STALE → flag and proceed or research depending on consequence
        │ CONTRADICTORY → surface contradiction; do not present false certainty
        ▼
INTELLIGENCE (is reasoning, assessment, or recommendation required?)
        │ INFORMATION TASK → retrieve and return
        │ ANALYSIS/DECISION → assess, form recommendation
        │ ACTION → check authority requirement
        ▼
RESPONSE (what APEX communicates)
        │ modality selected (text / voice / visual / notify / combination)
        ▼
PRESENTATION (is visual surface warranted?)
        │ YES → contextual panel activates
        │ NO → response only
        ▼
ACTION (is there something to do?)
        │ YES + authority required → Decisions surface
        │ YES + within authority → execute after explicit confirmation
        │ NO → conclude
        ▼
OUTCOME (what happened — success / partial / failure)
        │
        ▼
MEMORY / RECORD (what persists — always logged; memory only when warranted)
```

### 6.1 Which Stages Are Mandatory

| Stage | Mandatory |
|-------|-----------|
| INTENT | Always |
| UNDERSTANDING | Always (may be instant) |
| KNOWLEDGE STATE | Always (may be instant for simple facts) |
| INTELLIGENCE | Conditional — required for analysis, decisions, actions |
| RESPONSE | Always |
| PRESENTATION | Conditional — triggered by content type or user request |
| ACTION | Conditional — only if something must be done |
| OUTCOME | Always for actions; optional for pure information |
| MEMORY/RECORD | Activity log: always. Memory capture: conditional. |

### 6.2 What is Invisible to the User

By default, the user does not see:
- Knowledge validation queue processing
- Agent selection and orchestration
- Constitutional gate checks
- Evidence confidence calculations
- Internal knowledge gap identifiers
- Route handling

These become visible through progressive disclosure (Layer 2 / Layer 3) only when the user requests it.

---

## 7. Task Taxonomy

### T-01 — INFORMATION TASK

**Purpose**: Retrieve a fact, status, or value.  
**Entry points**: Voice / text on any surface.  
**User interaction**: Single question or follow-up.  
**APEX behaviour**: Retrieve from knowledge base / memory / live data. Respond.  
**Knowledge requirement**: Sufficient; if stale, flag.  
**Authority**: None required.  
**Presentation**: Usually none; sometimes a metrics chip for numerical data.  
**Completion**: APEX delivers answer.  
**Failure**: Knowledge gap; APEX explains what is unknown.  
**Persistence**: No — one-shot.  
**Memory**: Query logged; no memory capture unless user requests.

---

### T-02 — KNOWLEDGE TASK

**Purpose**: Inspect, evaluate, or update what APEX knows.  
**Entry points**: "What do you know about X?" / Knowledge surface.  
**APEX behaviour**: Retrieves knowledge record; presents freshness, confidence, evidence refs, gaps.  
**Knowledge requirement**: Self-referential — APEX describes its own knowledge state.  
**Authority**: None for inspection; user authority required for memory write.  
**Presentation**: Knowledge panel — facts, freshness, gaps, confidence tier.  
**Completion**: Knowledge state communicated; optional action taken (research / correct).  
**Failure**: Knowledge record absent — APEX states "I have no information on this."  
**Memory**: Knowledge query logged; corrections applied if user provides them.

---

### T-03 — ANALYSIS TASK

**Purpose**: Assess, interpret, or detect patterns in data.  
**Entry points**: "Analyse my X." / "What does this mean?" / "How has Y changed?"  
**APEX behaviour**: Retrieves relevant data; applies intelligence; forms assessment.  
**Knowledge requirement**: Domain data sufficient; flags uncertainty if partial.  
**Authority**: None for analysis; required if analysis leads to proposed action.  
**Presentation**: Usually warranted — charts, comparisons, trend summaries.  
**Completion**: Assessment with confidence level delivered.  
**Failure**: Insufficient data for reliable analysis — APEX states limitations.  
**Memory**: Analysis logged; no automatic memory unless insight is significant.

---

### T-04 — DECISION TASK

**Purpose**: Support or facilitate a human decision.  
**Entry points**: "What should I do?" / APEX-initiated recommendation.  
**APEX behaviour**: Assesses options; forms recommendation with reasoning, alternatives, risks.  
**Knowledge requirement**: Sufficient for domain; knowledge gaps acknowledged.  
**Authority**: Varies — decision may require approval before action.  
**Presentation**: Required — recommendation card with options, reasoning, risk.  
**Completion**: User decides (approve / reject / modify / defer).  
**Failure**: Insufficient knowledge to recommend; APEX states "I can't confidently recommend without [X]."  
**Memory**: Decision record created; preference noted if applicable.

---

### T-05 — ACTION TASK

**Purpose**: Execute something in the real world or within a system.  
**Entry points**: Following APEX recommendation or direct user instruction.  
**APEX behaviour**: Confirms intent; checks authority; executes if authorised; reports outcome.  
**Knowledge requirement**: Sufficient to confirm the action is correct.  
**Authority**: Explicit human approval required for consequential actions.  
**Presentation**: Action status panel — proposed → executing → completed / failed.  
**Completion**: Outcome reported; action record created.  
**Failure**: Action failed — APEX explains what happened, what was affected, and recovery options.  
**Memory**: Action record always created; outcome logged.

---

### T-06 — MONITORING TASK

**Purpose**: Track ongoing work or external state.  
**Entry points**: "What's the status of X?" / Activity feed / Proactive update.  
**APEX behaviour**: Reports current state of active work; signals changes.  
**Knowledge requirement**: Live data or agent state.  
**Authority**: None for monitoring; authority required if monitoring triggers action.  
**Presentation**: Status panel; activity feed entry.  
**Completion**: State communicated; monitoring continues until work completes or user cancels.  
**Failure**: Unable to determine state — APEX reports "I can't reach [X] right now."  
**Memory**: State changes logged.

---

### T-07 — RESEARCH TASK

**Purpose**: Acquire new knowledge on a topic.  
**Entry points**: "Research X." / Knowledge gap detected during another task.  
**APEX behaviour**: Initiates knowledge acquisition; reports progress; delivers findings.  
**Knowledge requirement**: Gap identified — research is the response to insufficiency.  
**Authority**: May require authority if research has cost or external action implications.  
**Presentation**: Research progress panel → findings panel on completion.  
**Completion**: Knowledge gap resolved (or partially resolved); updated knowledge state delivered.  
**Failure**: Research could not obtain sufficient evidence — APEX reports limitation.  
**Memory**: Research findings stored in knowledge base; query logged.

---

### T-08 — PLANNING TASK

**Purpose**: Create a structured approach for future activity.  
**Entry points**: "Plan my X for Y period." / "Help me think through Z."  
**APEX behaviour**: Assesses context, constraints, and resources; produces plan.  
**Knowledge requirement**: Domain knowledge plus user preferences / memory.  
**Authority**: Plan itself requires no approval; executing plan elements may require approval per element.  
**Presentation**: Plan card — structured steps, timeline, resource needs.  
**Completion**: Plan delivered; user accepts, modifies, or rejects.  
**Failure**: Insufficient context — APEX asks clarifying questions.  
**Memory**: Plan stored if user accepts; preferences noted.

---

### T-09 — MEMORY TASK

**Purpose**: Create, update, retrieve, or delete APEX memory.  
**Entry points**: "Remember [X]." / "Forget [X]." / "What do you know about [X]?" / Memory surface.  
**APEX behaviour**: Executes memory operation; confirms change explicitly.  
**Knowledge requirement**: Self-referential — APEX memory system.  
**Authority**: Memory operations are user-directed; no additional authority required.  
**Presentation**: Confirmation chip for write; memory panel for read.  
**Completion**: Operation confirmed.  
**Failure**: Cannot write memory (system error) — APEX reports failure clearly.  
**Memory**: Memory record created, updated, or deleted as requested.

---

### T-10 — COMMUNICATION TASK

**Purpose**: Manage or initiate external communications (email, messages).  
**Entry points**: Communication domain in World; "Send X to Y."  
**APEX behaviour**: Composes draft; presents for approval; sends on authorisation.  
**Knowledge requirement**: Recipient context; communication preferences.  
**Authority**: Sending requires explicit approval — consequential external action.  
**Presentation**: Draft panel for review; sent confirmation.  
**Completion**: Communication sent and logged.  
**Failure**: Send failed — APEX reports and asks user to retry or modify.  
**Memory**: Communication logged; recipient preferences noted.

---

### T-11 — AGENT TASK

**Purpose**: Delegate work to a domain agent; monitor and receive outcome.  
**Entry points**: APEX-initiated delegation or user request "Ask [Agent] to [X]."  
**APEX behaviour**: Routes to appropriate agent; monitors; reports outcome or escalation.  
**Knowledge requirement**: Agent availability and capability.  
**Authority**: Task delegation within agent authority — no extra approval. Actions within task may require approval.  
**Presentation**: Agent activity indicator; completion notification.  
**Completion**: Agent reports outcome to APEX; APEX reports to user.  
**Failure**: Agent fails — APEX reports and offers alternatives.  
**Memory**: Agent task logged; outcome recorded.

---

### T-12 — SYSTEM TASK

**Purpose**: Inspect or understand APEX's own state, governance, or health.  
**Entry points**: System surface; "Show me governance." / "What's the constitutional state?"  
**APEX behaviour**: Provides system-level transparency at Layer 3.  
**Knowledge requirement**: Internal system state.  
**Authority**: No approval for reading; some system actions require authority.  
**Presentation**: System surface panels — constitutional, health, governance, audit.  
**Completion**: State communicated.  
**Failure**: System health issue — APEX reports degraded state honestly.  
**Memory**: System queries logged.

---

## 8. Canonical User Journeys

---

### J-01 — Simple Question

**User intent**: Get a direct factual answer.  
**Starting state**: APEX idle; user on any surface.  
**Entry point**: Voice or text input.

**User action**: "What's the current balance in my main account?"

**APEX understanding**: INFORMATION TASK — retrieve current balance.

**Knowledge requirement**: Live financial data. If STALE (>1 hour): APEX proceeds but flags: "This is from [time] ago — I'll refresh shortly."

**Intelligence**: None beyond retrieval.

**Communication channel**: CONVERSE (voice if voice active; text if text input used).

**User-facing response**: "Your main account has £2,340. That's the balance from an hour ago."

**Visual presentation**: None for this level of detail. If user follows up with "Show me all accounts" → metrics card.

**Authority**: None required.

**Outcome**: User has the answer.

**Memory/record**: Query logged. No memory capture.

**Error state**: Data unavailable → "I don't have a current balance — the last sync failed 3 hours ago. Would you like me to try to refresh it?"

**Cancellation**: N/A — one-shot query.

**End state**: IDLE.

---

### J-02 — Complex Question

**User intent**: Understand something requiring multiple data sources.  
**Starting state**: APEX idle.  
**Entry point**: Voice or text.

**User action**: "How is my overall financial situation looking?"

**APEX understanding**: ANALYSIS TASK — synthesise across banking, income, expenses, upcoming obligations.

**Knowledge requirement**: Multiple financial data sources. APEX assesses freshness of each. If any STALE → flags in response.

**Intelligence**: Synthesis across domains; pattern detection; assessment.

**Communication channel**: CONVERSE (primary: voice) + PRESENT (contextual presentation).

**User-facing response**: APEX speaks a 3–4 sentence summary — headline number, primary trend, one concern, one positive.

**Visual presentation**: Financial overview card — balance, month-to-date spend, trend arrow, upcoming obligations. Appears adjacent to orb during / after spoken response.

**APEX verbal bridge**: "I've put the breakdown here so you can see the trend."

**Authority**: None.

**Outcome**: User has situation awareness.

**Memory/record**: Analysis logged.

**Error state**: Insufficient data for reliable analysis → APEX qualifies: "I can give you a partial picture — I'm missing [X] data."

**End state**: Presentation remains; user can ask follow-up.

---

### J-03 — "Why?"

**User intent**: Understand APEX's reasoning or evidence basis.  
**Starting state**: APEX has just made an assertion or recommendation.  
**Entry point**: "Why?" / "How do you know that?" / "Explain that."

**User action**: "Why are you recommending I reduce my travel budget?"

**APEX understanding**: EXPLAIN intent — Layer 2 expansion of prior recommendation.

**Knowledge requirement**: Evidence that informed the prior recommendation.

**Intelligence**: APEX retrieves the evidence chain used; renders it in plain language.

**Communication channel**: CONVERSE (voice or text) + PRESENT (evidence panel).

**User-facing response**: "Your travel spend is up 34% over the last 3 months — that's the largest increase across all categories, and it's pushing your monthly surplus below your stated target of £500."

**Visual presentation**: Evidence panel — sources, freshness, confidence tier (HIGH / MEDIUM / LOW), key facts. Replaces or extends any existing presentation surface.

**APEX verbal bridge**: "The data is here if you want to check the figures."

**Authority**: None.

**Outcome**: User understands basis for recommendation.

**Memory/record**: Explanation linked to prior activity record.

**Further disclosure**: User can say "Show me everything" → Layer 3 constitutional record if applicable.

**End state**: Evidence panel visible; conversation continues.

---

### J-04 — "Show Me" / APEX Invokes Presentation

**User intent**: Visual contextualisation (user-invoked or APEX-invoked).  
**Starting state**: Active conversation or APEX detecting visual opportunity.  
**Entry point**: "Show me." / APEX determines visual is warranted during response.

**User action A** (user-invoked): "Show me how my spending has changed."  
**User action B** (APEX-invoked): APEX speaking about a trend, decides chart would add value.

**APEX understanding**: SHOW intent — contextual presentation required.

**Knowledge requirement**: Domain data sufficient for visualisation.

**Communication channel**: CONVERSE (voice contextualises the visual) + PRESENT (chart panel).

**User-facing response (A)**: APEX speaks: "Here's the last three months." → chart panel appears.  
**User-facing response (B)**: APEX speaks, then: "I'll put the breakdown here." → chart panel appears mid-response.

**Visual presentation**: Chart (spending trend, 3 months) with current vs. prior period callout.

**Interaction with presentation**: User can say "Explain [the spike in October]." → APEX responds conversationally. User can say "Close it." → panel dismisses.

**Authority**: None.

**Outcome**: User has visual context.

**Memory/record**: Session — presentation not persisted as memory.

**Dismissal**: "Close it." / ✕ button / navigate away / 3+ conversational turns after topic change.

**End state**: Presentation may remain; conversation continues.

---

### J-05 — Voice Conversation

**User intent**: Natural continuous back-and-forth dialogue.  
**Starting state**: APEX standby; user taps orb or activates Live mode.  
**Entry point**: Orb tap or mic button.

**Orb state sequence**: STANDBY → LISTENING → UNDERSTANDING → PROCESSING → SPEAKING → (repeat)

**User action**: Tap orb; speak naturally.

**Context retention**: Full conversation context maintained within session. "What about next month?" inherits prior topic.

**Turn-taking**:
1. APEX reaches LISTENING state
2. User speaks
3. APEX transitions to UNDERSTANDING
4. APEX transitions to PROCESSING (if complex)
5. APEX transitions to SPEAKING; waveform animates
6. APEX finishes; returns to LISTENING (continuous mode) or STANDBY (single-turn)

**Interruption**: User speaks while APEX is speaking → immediate LISTENING state. APEX stops. APEX does not re-speak what was interrupted.

**Cancellation**: "Never mind." / "Cancel." → APEX acknowledges; returns to STANDBY.

**Mute**: "Mute." → APEX text-only mode; orb enters idle state; voice output suspended until user re-activates.

**Voice error**: Transcription failure → "I didn't catch that — could you say that again?" → retry.

**End state**: STANDBY (single-turn) or LISTENING (continuous mode).

---

### J-06 — Voice Interruption

**User intent**: Stop APEX speech and redirect.  
**Starting state**: APEX SPEAKING.

**User action**: Speaks over APEX (any content).

**APEX behaviour**:
1. Detects incoming audio
2. Stops speaking immediately — no delay, no finishing the sentence
3. Transitions to LISTENING
4. Processes new user input

**What does NOT happen**: APEX does not say "I was in the middle of saying..." APEX does not re-attempt the interrupted content. APEX processes the new input fresh.

**Special case — "Stop."**: APEX stops, returns to STANDBY, says nothing. Awaits next user input.

**Special case — "Wait."**: APEX stops, stays in LISTENING, ready for continuation.

**Record**: Interruption logged in activity.

**End state**: LISTENING → new turn begins.

---

### J-07 — Proactive Notification (APEX-Initiated)

**User intent**: N/A — APEX initiates.  
**Starting state**: APEX monitoring; event occurs.

**APEX behaviour sequence**:
1. EVENT detected (e.g., balance below threshold, decision deadline approaching)
2. RELEVANCE check: Is this genuinely important to this user? → If no: IGNORE
3. KNOWLEDGE SUFFICIENCY: Does APEX have enough to communicate this accurately? → If no: LOG only
4. URGENCY: Does this require attention before next natural user interaction? → If no: queue for next session start
5. USER CONTEXT: Is user in a quiet period? Is user currently in conversation? → defer if in-conversation (unless URGENT)
6. GOVERNANCE: Does APEX have authority to surface this type of notification? → If no: block
7. Level determined (0–5); mechanism selected

**Level 2 (IN-APP) delivery**: Notification banner slides in at bottom of screen. Title: plain-language statement. Body: 1–2 sentence context. Auto-dismisses after 5 seconds. Badge appears on activity feed icon.

**User-facing presentation**: "Your account balance has dropped below £500."

**User options**: Tap banner → notification detail panel (opens on current surface). Dismiss → banner closes; feed badge remains.

**Authority**: APEX does not act — merely notifies. Action requires user.

**Memory/record**: Notification logged regardless of user response.

**End state**: Banner dismissed; badge remains until user addresses it.

---

### J-08 — Notification → Conversation

**User intent**: Respond to and act on a notification.  
**Starting state**: Notification banner visible or notification unread in feed.

**User action**: Taps notification / says "What was that alert about?"

**APEX behaviour**:
1. Opens notification detail panel on current surface
2. Provides verbal context if voice is active

**Detail panel**: Title, full context, timestamp, action options.

**Conversation continuation**: User can ask follow-up questions — "How long has it been below £500?" → APEX treats this as conversation continuation, not a new session.

**Action from notification**:
- "Set an alert when it recovers." → ACTION TASK → authority check → execute
- "Transfer money from savings." → DECISION TASK → authority required → Decisions surface

**Dismissal**: "OK, got it." → notification marked acknowledged; panel closes.

**Memory/record**: Notification record updated with acknowledgement timestamp.

**End state**: Notification resolved or action initiated.

---

### J-09 — Recommendation

**User intent**: Ask APEX what to do.  
**Starting state**: Any surface; user expresses need for direction.

**User action**: "What should I focus on today?"

**APEX understanding**: RECOMMEND intent — prioritised suggestion list.

**Knowledge requirement**: Task state, calendar, active items, domain knowledge. APEX assesses.

**Intelligence**: Synthesis across domains; priority weighting; recommendation formation.

**Communication channel**: CONVERSE (primary) + PRESENT (priority card panel).

**User-facing response**: APEX speaks top 3 suggestions with brief rationale for each.

**Visual presentation**: Priority card panel — 3 cards, each with: title, one-line rationale, urgency indicator, action button.

**User responses**:
- "Tell me more about [item]." → APEX expands that item
- "Do that one." → ACTION TASK initiated
- "Skip that." → Card removed; APEX notes preference
- "What else could I do?" → APEX offers alternatives

**Authority**: Recommendation itself: none. Acting on recommendation: may require approval.

**Outcome**: User has prioritised action list.

**Memory/record**: Recommendation delivered; skipped items may inform future prioritisation.

**End state**: Cards visible; conversation continues.

---

### J-10 — Decision Requiring Authority

**User intent**: APEX proposes; user decides.  
**Starting state**: APEX has identified a consequential action to propose.  
**Entry point**: APEX-initiated (from monitoring, planning, or agent activity) or user-requested.

**APEX behaviour**: Presents decision through notification (level 3–4) + Decisions surface panel.

**Decision panel content**:
```
PROPOSED ACTION: [plain-language description]
WHY: [1–2 sentence rationale]
EVIDENCE: [key facts with confidence / freshness]
ALTERNATIVES: [Option A (recommended), Option B, Do nothing + consequence]
RISKS: [what could go wrong; magnitude]
AUTHORITY REQUIRED: Human
CONSTITUTIONAL BASIS: [A-article if applicable]
─────────────────────────────────────────
[ APPROVE ]  [ REJECT ]  [ MODIFY ]  [ DEFER ]  [ ASK APEX ]
```

**User options**:
- APPROVE → J-13 (Action Execution)
- REJECT → J-11 (Rejection)
- MODIFY → J-12 (Modification)
- DEFER → decision queued; APEX re-surfaces at requested time
- ASK APEX → APEX provides additional context verbally; decision remains open

**Authority**: Human approval is required before any action is taken. APEX waits indefinitely.

**Timeout**: Decisions do not auto-expire — they persist until the user acts. Long-pending decisions surface in Decisions badge count.

**Record**: Decision record created at moment of user action (not at proposal time).

**End state**: Decision resolved; action initiated or declined.

---

### J-11 — User Rejects Recommendation

**User intent**: Decline a proposed action.  
**Starting state**: Decisions panel open; APEX awaiting decision.

**User action**: REJECT / "No." / "Don't do that."

**APEX behaviour**:
1. Acknowledges immediately: "Understood — I won't do that."
2. Marks action as REJECTED
3. Does NOT automatically re-propose
4. Asks (once): "Would you like me to try a different approach?" → if user says no, APEX drops it

**What APEX does NOT do**: Argue. Re-propose without invitation. Express surprise. Log the rejection as a user failure.

**Learning**: APEX notes the rejection domain and rationale (if given) and adjusts future recommendations accordingly.

**Memory/record**: Rejection record created with reason if provided.

**End state**: Decision REJECTED; action never executed.

---

### J-12 — User Modifies Proposed Action

**User intent**: Approve the goal but change the execution.  
**Starting state**: Decisions panel open.

**User action**: "Do it, but use the savings account instead of the current account."

**APEX behaviour**:
1. Acknowledges modification
2. Re-presents modified action for confirmation: "So, [modified action]. Shall I proceed?"
3. Awaits explicit re-approval before executing

**What APEX does NOT do**: Silently substitute the modification and execute without re-confirmation.

**Authority**: Modified action requires fresh approval — the original approval does not carry over.

**Record**: Decision record updated with modification and fresh approval timestamp.

**End state**: Modified action approved → J-13. Or user changes mind → J-11.

---

### J-13 — Action Execution

**User intent**: Approved action is performed.  
**Starting state**: Action approved (from J-10/J-12 or within-authority action from J-05).

**APEX behaviour**:
1. Confirms: "OK, doing that now."
2. Orb transitions to EXECUTING state (distinct from PROCESSING)
3. Action status panel shows: EXECUTING → progress if available
4. On completion: "Done. [Brief outcome summary]."
5. Orb returns to STANDBY

**Communication**: CONVERSE (completion confirmation) + PRESENT (action result panel if outcome has detail worth showing).

**Authority**: Execution occurs only after approval has been given and recorded.

**Partial execution**: If action is multi-step and one step fails, APEX stops, reports what completed and what failed, asks for direction.

**Record**: Action record with: timestamp, agent, authority source, outcome.

**End state**: Action COMPLETED or → J-14 (failure).

---

### J-14 — Action Failure

**User intent**: APEX reports an execution failure.  
**Starting state**: Action was executing; failure occurred.

**APEX behaviour**:
1. Stops execution
2. Reports what happened: "I wasn't able to complete [X]. [Brief reason]."
3. States what is known: what succeeded (if partial) and what didn't
4. States what is not known (if unclear)
5. Offers options: "Would you like me to try again, do it a different way, or leave it for now?"

**What APEX does NOT do**: Silently retry multiple times without informing the user. Pretend failure didn't happen. Over-explain technical details.

**Visual presentation**: Action status panel → FAILED state with brief reason and options.

**Record**: Action record updated with failure reason and timestamp.

**End state**: User chooses retry / alternative / cancel. Or APEX escalates if failure is consequential.

---

### J-15 — Knowledge Gap Detected

**User intent**: User asks something APEX cannot answer sufficiently.  
**Starting state**: Any task; APEX assesses knowledge state.

**APEX behaviour**:
1. Detects gap during knowledge check
2. Does NOT fabricate or present low-confidence information as certain
3. States gap clearly: "I don't have current information on [X]."
4. States what IS known: "The last data I have is from [date], which showed [Y]."
5. Offers options: "Would you like me to research this, or shall I work with what I have?"

**Knowledge state categories**:
- MISSING: APEX has no information → states "I don't have information on this."
- STALE: Information exists but past validity window → states "I have information from [date] but it may be outdated."
- CONTRADICTORY: Conflicting evidence → J-17 (Contradictory Knowledge)
- UNCERTAIN: Evidence exists but confidence is LOW → states uncertainty explicitly

**Visual presentation**: Knowledge state chip inline — "Knowledge gap · [subject] · Last known: [date]"

**Authority**: Research may require authority if it has cost or external action implications.

**End state**: User chooses to research or proceed with qualified information.

---

### J-16 — Knowledge Research

**User intent**: Resolve a knowledge gap.  
**Starting state**: Gap detected (J-15) or user explicitly requests research.

**User action**: "Research it." / "Find out the current [X]."

**APEX behaviour**:
1. Acknowledges: "I'll look into that."
2. Initiates research (agent task or knowledge acquisition)
3. If research is quick: APEX delivers results in same conversation turn
4. If research takes time: activity feed shows "Researching [X]..." with progress; APEX notifies on completion
5. On completion: "I've found [summary]." → presents findings

**Long-running research**: User may navigate away; notification when complete (level 1–2 based on priority).

**Visual presentation**: Research progress panel (brief) → findings panel on completion.

**Record**: Research task logged; knowledge base updated with findings.

**Failure**: Research could not obtain sufficient evidence → APEX reports: "I wasn't able to find reliable information on [X]. Here's what I did find: [partial]."

**End state**: Knowledge gap resolved or partially resolved; APEX continues from where it was.

---

### J-17 — Contradictory Knowledge

**User intent**: User asks something where APEX has conflicting evidence.  
**Starting state**: APEX assessing knowledge state; contradiction detected.

**APEX behaviour**:
1. Does NOT pick one version and suppress the other
2. Explicitly surfaces the contradiction: "I've found conflicting information on this."
3. Presents both sides: "One source says [A], another says [B]."
4. States which is more recent / more authoritative (if determinable)
5. Offers: "Which should I treat as correct?" or "Should I research further?"

**What APEX does NOT do**: Present either version as definitive. Silently average them. Ignore the contradiction and answer anyway.

**Visual presentation**: Contradiction panel — two evidence cards side by side with source, freshness, confidence tier for each.

**User actions**:
- "Use [version A]." → APEX applies that version; notes user preference
- "Research it further." → J-16
- "Just give me your best guess." → APEX states which it considers more reliable and why, with explicit caveat

**Record**: Contradiction logged; user decision (if made) logged.

**End state**: Contradiction resolved or qualified answer provided.

---

### J-18 — Memory (User Stores Something)

**User intent**: Explicitly capture a fact or preference.  
**Starting state**: Any conversation.

**User action**: "Remember that I prefer morning meetings." / "Keep a note of this."

**APEX behaviour**:
1. Identifies what to remember
2. Confirms explicitly: "Got it — I'll remember that you prefer morning meetings."
3. States the domain: "I've noted this under your personal preferences."
4. Shows confirmation chip in conversation

**Ambiguous memory**: "Remember that." (what?) → APEX asks: "What specifically should I remember from this?"

**User can edit before confirming**: APEX shows what it will store; user can correct before APEX writes.

**Record**: Memory record created with: fact, domain, source (user-stated), timestamp.

**End state**: Memory stored; conversation continues.

---

### J-19 — Memory Correction

**User intent**: Correct something APEX remembers incorrectly.  
**Starting state**: APEX uses incorrect information; user notices.

**User action**: "That's wrong — I actually prefer 9am, not 10am."

**APEX behaviour**:
1. Acknowledges immediately: "You're right — I had that wrong."
2. States what it will change: "I'll update your meeting preference to 9am."
3. Asks if the correction applies more broadly: "Should I apply this everywhere I use that preference?"
4. Confirms update: "Updated."

**What APEX does NOT do**: Argue about what it previously remembered. Over-apologise. Request unnecessary confirmation for simple corrections.

**Record**: Memory record updated with correction; prior value preserved in history with timestamp.

**End state**: Memory corrected; conversation continues.

---

### J-20 — Memory Deletion

**User intent**: Remove something from APEX memory.  
**Starting state**: Any; user is aware of a memory they want removed.

**User action**: "Forget my old address." / "Remove what you know about [X]."

**APEX behaviour**:
1. Identifies what to delete
2. Confirms: "I'll remove [description]. Are you sure?"
3. If confirmed: deletes; "Done — I've removed that."
4. States any implications: "Note: this may affect [Y] if I need that information later."

**What APEX does NOT do**: Silently delete without confirmation. Refuse to delete. Retain the data in an unnamed form.

**Record**: Deletion event logged (not the content, but the fact that something was deleted).

**End state**: Memory removed. APEX treats the subject as unknown going forward.

---

### J-21 — Agent Activity

**User intent**: Understand what a specific agent is doing.  
**Starting state**: User notices agent badge or asks directly.

**User action**: "What is the Finance Agent working on?"

**APEX behaviour**:
1. Retrieves current agent state
2. Responds: "[Agent name] is currently [doing X], which was assigned [when] to [achieve goal]."
3. States expected completion if available
4. States whether user action is required

**Visual presentation**: Agent status panel — role, current task, timeline, status.

**User options**:
- "Ask it [question]." → domain agent conversation opens
- "Tell it to stop." → CANCEL task → authority check → agent task cancelled
- "Show me what it's done." → activity feed filtered to that agent

**End state**: Status communicated; no default action taken.

---

### J-22 — "What Are You Doing?"

**User intent**: Understand APEX's overall current activity.  
**Starting state**: Any surface; user wants situational awareness of APEX itself.

**User action**: "What are you doing right now?" / "What are you working on?"

**APEX behaviour**:
1. Summarises active work: "I'm currently [task 1] and [task 2]."
2. If nothing active: "Nothing active right now — I'm monitoring [X] in the background."
3. Does NOT surface technical implementation details (no agent IDs, no route names)

**Visual presentation**: Activity feed expanded or brief summary panel if substantial activity.

**User can go deeper**: "Tell me more about [task]." → APEX expands → "Why?" → J-23.

**End state**: Status communicated; conversation continues.

---

### J-23 — "Why Did You Do That?"

**User intent**: Understand reasoning behind a past APEX action.  
**Starting state**: User has noticed something APEX did (in feed, notification, or outcome).

**User action**: "Why did you send that summary to my calendar?"

**APEX behaviour**:
1. Identifies the action being questioned
2. Explains reasoning in plain language: "I noticed [X] and thought it would be useful to [Y] because [Z]."
3. States authority used: "This was within my normal monitoring role — no approval was needed."
4. Offers to undo if appropriate: "Would you prefer I hadn't done that?"

**Progressive disclosure**:
- Layer 1: Plain-language explanation
- Layer 2 (on "Why?" follow-up): Evidence that triggered the action; agent; timestamp
- Layer 3 (on "Show me the full record"): Constitutional authority; decision record; exact execution trace

**If action was wrong**: User says "Don't do that again." → APEX acknowledges, notes preference → J-26 (Correction).

**End state**: Explanation delivered; user can choose to undo or proceed.

---

### J-24 — System Transparency

**User intent**: Deliberately enter deep constitutional/system visibility.  
**Starting state**: Any; user navigates to System surface or requests constitutional detail.

**Entry points**: Navigate to System surface / "Show me the constitutional state." / "What's the governance record for [X]?"

**APEX behaviour**:
1. System surface opens (or Layer 3 panel for specific item)
2. Presents constitutional state: A1–A6 active/inactive; recent constitutional events
3. Presents governance record if queried item specified
4. Does NOT simplify at this layer — this is owner-level transparency

**Visual presentation**: System surface — constitutional panel, agent council, governance records, audit trail, health.

**User interaction**: Browse freely. Tap any record for detail. "Explain [article]." → APEX explains in plain language.

**Authority**: Reading system state requires no approval. System-level actions (if any) require explicit authorisation.

**End state**: User satisfied with transparency; returns to Command or continues exploring.

---

### J-25 — Emergency / Urgent Attention

**User intent**: N/A — APEX initiates at highest urgency.  
**Starting state**: A critical event requiring immediate human attention.

**APEX behaviour**:
1. Assess whether URGENT (Level 5) is genuinely warranted — very high bar
2. Delivers fullscreen overlay with: clear statement of situation, required action, options
3. If voice is active: APEX speaks urgently; waveform signals high priority
4. Waits for user acknowledgement — does not auto-dismiss

**Level 5 examples** (illustrative, not exhaustive):
- Constitutional authority breach detected
- Consequential irreversible action about to execute without having received proper authority
- Security event requiring immediate attention

**What Level 5 is NOT for**: Low-balance alerts, scheduling reminders, routine decisions.

**User action required**: Acknowledge / Act / Escalate.

**Record**: Urgent alert record created with full context and user response.

**End state**: Situation addressed; alert resolved.

---

## 9. Multimodal Behaviour

### 9.1 Modality Decision Rules

| Information type | Primary modality | Secondary | Rationale |
|-----------------|-----------------|-----------|-----------|
| Simple fact (number, name, status) | VOICE or TEXT | — | No visual adds value |
| Trend or change over time | VOICE + VISUAL (chart) | TEXT | Visual communicates pattern better |
| Comparison (A vs B) | VOICE + VISUAL (comparison card) | TEXT | Side-by-side aids comprehension |
| Multi-item list | TEXT | VISUAL (card panel) | Lists are scannable in text |
| Recommendation | VOICE (headline) + VISUAL (options card) | TEXT | Voice for impact; visual for choice |
| Evidence / proof | TEXT + VISUAL (evidence panel) | VOICE summary | Evidence must be readable, not just heard |
| Decision requiring approval | VISUAL (decision panel) + NOTIFICATION | VOICE alert | Decisions require deliberate attention |
| Routine completion | ACTIVITY FEED only | — | No interruption warranted |
| Urgent alert | NOTIFICATION (banner / fullscreen) + VOICE | VISUAL | Interruption is the point |
| Knowledge gap | VOICE/TEXT (inline) + VISUAL chip | — | Compact signal; detail on request |
| Research result | VOICE (summary) + VISUAL (findings panel) | TEXT | Complex data benefits from visual |
| Error / failure | VOICE/TEXT (explanation) + VISUAL (status) | — | Must be clear and actionable |
| Constitutional record | TEXT + VISUAL (structured panel) | — | Layer 3 — never voice-only |

### 9.2 When NOT to Add Visual

- Single-sentence factual answers
- Acknowledgements ("Got it." / "Done.")
- Clarifying questions APEX is asking the user
- Simple corrections
- Status updates where the activity feed already shows the information

### 9.3 When to Prefer Text Over Voice

- When user is likely in a public or quiet environment (no active voice session)
- When information requires re-reading (addresses, reference numbers, complex instructions)
- When user has muted voice
- Layer 2 / Layer 3 content — constitutional records, evidence sources

---

## 10. Conversation Behaviour

### 10.1 Context Retention

Conversation context persists within a session. APEX carries forward:
- The subject of the last N turns
- Any entity referenced (person, account, date, domain)
- The task type in progress
- Any presentation that is currently visible

**PROPOSED**: Context should persist across sessions for significant topics (e.g., an open research task or pending decision) — not for casual one-off queries. Implementation of cross-session context scope is **OPEN** (OQ-session-01).

### 10.2 Continuation Patterns

| User says | APEX interprets |
|-----------|----------------|
| "What about next month?" | Same subject, period shifted |
| "And what about [Y]?" | Same intent, different subject |
| "More detail." | Expand current topic at Layer 2 |
| "Something else." | User wants alternatives |
| "Actually, [X]." | Correction — J-19 / J-26 |
| "Never mind." | Cancel current intent; return to STANDBY |
| "Go back." | Return to prior topic in conversation |
| Single-word "Why?" | EXPLAIN intent on most recent APEX statement |

### 10.3 Ambiguity

When user intent is unclear, APEX asks exactly one clarifying question — the most important one. APEX does not ask multiple questions simultaneously.

> User: "Sort out my finances."  
> APEX: "What would you like me to focus on — reviewing your spending, checking upcoming obligations, or something else?"

If ambiguity persists after one clarification, APEX makes a reasonable assumption and states it: "I'll assume you mean [X] — let me know if I've misunderstood."

### 10.4 Topic Changes

User changes subject mid-conversation:

> User: "What's my spending this month? ... Actually, can you remind me about my meeting tomorrow?"

APEX treats the new subject as a new intent. If a presentation was visible for the prior subject, it may dismiss (automatic on topic change, configurable).

### 10.5 Multiturn Dialogue

APEX maintains a coherent conversation across multiple turns. Each APEX response must be self-contained (a new user cannot understand it from a single turn), but APEX should not repeat context unnecessarily within a session.

> Turn 1: "How much did I spend on travel last month?"  
> APEX: "£340 — which is up £60 from the month before."  
> Turn 2: "What about food?"  
> APEX: "Food was £280 — down slightly."  
> [APEX does not re-state "last month" — context is shared]

### 10.6 Conversation and Active Presentations

An active presentation remains part of the conversation context. User can say "Explain the top item." and APEX knows they mean the currently visible presentation. If conversation moves to a new topic, APEX may gently offer to dismiss the presentation: "Should I close the [subject] breakdown?"

### 10.7 Conversation and Notifications

If a notification arrives while a conversation is active:
- Level 1–2: Quiet delivery to activity feed; no interruption
- Level 3 (ATTENTION): Banner visible but conversation not interrupted
- Level 4 (DECISION): APEX may pause and say "There's something that needs your attention — shall I continue or address that first?"
- Level 5 (URGENT): Always interrupts

---

## 11. Proactive Behaviour

### 11.1 The Governance Gate

Every APEX-initiated communication passes through:

```
EVENT
  │
  ▼ Relevance check
  │ Is this genuinely important to the user? If no → IGNORE (not logged to user)
  ▼ Knowledge sufficiency
  │ Does APEX have enough to communicate this accurately? If no → LOG only
  ▼ Urgency
  │ Does this require attention before next natural interaction? If no → queue for session start
  ▼ User context
  │ Quiet period? Active in conversation? If unfavourable → defer (unless URGENT)
  ▼ Governance
  │ Does APEX have authority to surface this? If no → block
  ▼
COMMUNICATION DECISION → Level 0–5
```

**IGNORE** means: the event did not meet the bar. It is never surfaced to the user. Routine system events should default to IGNORE.

**LOG** (Level 0): Recorded in activity feed. Not shown as a notification. Not badged. User can see it if they look at the feed.

### 11.2 Interruption Thresholds

| Level | Threshold |
|-------|-----------|
| 0 (SILENT) | Any event worth preserving in the record |
| 1 (LOG) | Events the user would want to see if they check the feed |
| 2 (IN-APP) | Events that are timely and useful but not urgent; auto-dismisses in 5 seconds |
| 3 (ATTENTION) | Events that require acknowledgement; does not auto-dismiss |
| 4 (DECISION) | Events requiring human authority before APEX can proceed |
| 5 (URGENT) | Events that are irreversible or safety-critical if delayed |

### 11.3 Grouping

Repeated similar events within a time window are grouped:
- "8 emails received" — not 8 separate notifications
- "Finance Agent completed 12 tasks" — not 12 task completions
- Grouping applies at Levels 0–2. Levels 3–5 are never grouped.

### 11.4 Quiet Periods

During quiet periods (user-configured):
- Levels 0–4: deferred to queue; presented at session start
- Level 5: always delivered
- Session start presentation: "While you were away: [grouped summary]."

### 11.5 Repeated Events

Same event type recurring:
- First occurrence: deliver at appropriate level
- Repetitions within same session: activity feed only (no repeated banners)
- APEX may escalate if a repeated event indicates a worsening trend: "This is the third time today that [X]."

### 11.6 Escalation

If a deferred or low-level notification becomes more urgent over time:
- APEX may escalate its level
- Escalation is always to the next level only (never jumps from 1 to 5)
- Escalation reason stated: "This is now more urgent than when I first noted it."

### 11.7 Acknowledgement and Expiry

- Acknowledged notifications: marked resolved; removed from badge count
- Expired notifications (if time-sensitive): marked expired; still visible in history with "Expired — no longer actionable" label
- Dismissed notifications: removed from banner but remain in activity feed

---

## 12. Attention Management

### 12.1 Principle

User attention is finite and valuable. APEX must spend it wisely.

### 12.2 Attention Priority Tiers

| Tier | Characteristics | Notification level |
|------|-----------------|-------------------|
| ROUTINE | Expected, regular, low consequence | 0 (SILENT) |
| USEFUL | Timely and relevant, user would want to know | 1–2 (LOG/IN-APP) |
| IMPORTANT | Time-sensitive, meaningful consequence | 3 (ATTENTION) |
| AUTHORITY | Requires human decision before action | 4 (DECISION) |
| URGENT | Irreversible consequence if delayed | 5 (URGENT) |

### 12.3 Priority Factors

An event's attention priority is a function of:

| Factor | Impact on priority |
|--------|-------------------|
| URGENCY | Higher if action must be taken soon |
| CONSEQUENCE | Higher if outcome is significant or irreversible |
| CONFIDENCE | Lower if APEX is uncertain about the event's significance |
| RELEVANCE | Lower if event is tangentially related to user's active concerns |
| TIMING | Lower if user is in a quiet period or actively in conversation |
| USER PREFERENCES | Lower if user has previously dismissed similar notifications |
| AUTHORITY REQUIRED | Forces minimum DECISION level |

### 12.4 Anti-Patterns to Prevent

- Surfacing the same type of notification repeatedly in one session
- Escalating to URGENT for non-urgent events
- Notifying for events the user cannot act on
- Notifying for events with insufficient knowledge (creates noise + confusion)
- Notifying at Level 3+ during an active voice conversation
- Grouping Level 4–5 notifications (each decision requires individual attention)

---

## 13. Presentation Behaviour

### 13.1 When to Move from Talking to Showing

| Content type | Show? | Reasoning |
|-------------|-------|-----------|
| Single number | Only if contextualised (trend arrow, target) | Number alone is clear in speech |
| Trend over time | YES — chart | Patterns are visual by nature |
| Comparison | YES — comparison card | Two columns easier than spoken A-vs-B |
| Multi-item list (3+ items) | YES — card panel | Lists hard to hold in working memory |
| Recommendation with options | YES — options card | Choices benefit from visual scanning |
| Evidence | YES — evidence panel | References must be readable |
| Decision | YES — decision panel | Consequential; user must read carefully |
| Simple fact | NO | Voice is faster |
| Acknowledgement | NO | No visual value |
| Error explanation | OPTIONAL — status panel | If actions are available, show them |

### 13.2 APEX-Invoked Presentation Decision

APEX may invoke the presentation surface when:
1. Response contains ≥2 numerical values with trend relationships
2. Response involves comparison between ≥2 options
3. Response includes evidence references (Layer 2+)
4. Response is a formal recommendation
5. Response involves a decision requiring authority
6. Domain overview was explicitly or implicitly requested

APEX does NOT invoke presentation for:
- One-sentence answers
- Yes/no responses
- Acknowledgements
- Clarifying questions

### 13.3 Presentation Lifecycle

```
TRIGGER (APEX decision or user request)
        │
        ▼
CREATE presentation content (select type; populate data)
        │
        ▼
DISPLAY with slide-in animation (220ms); APEX verbal bridge if voice active
        │
        ▼
REFERENCE in conversation (APEX can reference "the breakdown here")
        │
        ▼
USER INTERACTS (tap to expand detail; "Explain [item]"; scroll)
        │
        ▼
DISMISS / EXPIRE / PERSIST
        │ User says "Close it." → dismiss with animation
        │ Conversation topic changes (3+ turns) → auto-dismiss (default)
        │ Navigation away → dismiss
        │ Explicit persistence request ("Keep this visible") → persists
        │
        ▼
RECALL ("Show me that again.") → APEX re-creates from session context
```

### 13.4 Presentation Update

If data changes while a presentation is visible (e.g., balance updates via WebSocket):
- Presentation updates in place with subtle animation
- APEX may note verbally: "That figure just updated."
- No full reload — incremental update only

### 13.5 Mobile Presentation

On mobile: presentation appears below orb, full-width. Swipe down to dismiss. APEX voice continues while presentation visible. Complex charts may offer "See full view" → World surface, domain panel.

---

## 14. Decision Journeys

### 14.1 Full Decision Flow

```
QUESTION / SITUATION
        │
        ▼
APEX UNDERSTANDING
(Is this a decision situation? Does APEX have enough to form a recommendation?)
        │
        ▼
KNOWLEDGE STATE CHECK
(SUFFICIENT → form recommendation; INSUFFICIENT → J-15 first)
        │
        ▼
ASSESSMENT
(What are the options? What are the trade-offs? What does the evidence support?)
        │
        ▼
RECOMMENDATION
(One clear recommendation — not a list of options without guidance)
        │
        ▼
ALTERNATIVES
(Option A: recommended. Option B: alternative. Do nothing: consequence.)
        │
        ▼
RISKS
(What could go wrong? How likely? How severe? What mitigates it?)
        │
        ▼
AUTHORITY CHECK
(Is human approval required? If yes → Decision panel. If no → offer to proceed.)
        │
        ▼
USER DECISION
        │
        ├── APPROVE → Execute (J-13)
        ├── REJECT → J-11
        ├── MODIFY → J-12 → re-present modified → re-approve
        ├── DEFER → queue with trigger time
        └── ASK WHY → J-03 → then return to decision
                │
                └── ASK FOR MORE EVIDENCE → J-02 / J-16 → then return to decision
        │
        ▼
ACTION → RESULT
        │
        ▼
OUTCOME COMMUNICATED
        │
        ▼
DECISION RECORD CREATED
```

### 14.2 Each User Decision Response

**APPROVE**: APEX executes immediately. Confirms verbally. Records decision with timestamp.

**REJECT**: APEX stops. Acknowledges. Does not argue. Records rejection. Asks once if user wants an alternative approach.

**MODIFY**: APEX takes the modification. Re-presents modified action. Awaits fresh approval.

**DEFER**: APEX confirms defer time if provided ("I'll ask again at [time].") or indefinitely queues in Decisions surface. Records deferral.

**ASK WHY**: Layer 2 evidence panel opens. Decision remains open. "OK, back to the decision" or user acts after seeing evidence.

**ASK FOR MORE EVIDENCE**: Research initiated (J-16). Decision status: AWAITING EVIDENCE. When research completes, APEX re-presents decision with updated evidence.

---

## 15. Human Authority

### 15.1 Constitutional Principle

**Human Override Is Absolute** (A6). No APEX action can override an explicit human rejection.

### 15.2 When Approval Is Required

| Action type | Authority required |
|-------------|-------------------|
| Sending external communications | YES — consequential, external |
| Financial transactions | YES — consequential, financial |
| Deleting data | YES — consequential, irreversible |
| Scheduling meetings | YES — external commitment |
| Agent task initiation for new goals | YES — first time for new goal |
| Agent task continuation for approved goal | NO — within approved scope |
| Information retrieval | NO |
| Analysis and recommendations | NO — only execution requires approval |
| Memory operations (user-directed) | NO — user is the authority |
| System health checks | NO — monitoring only |
| Research tasks | CONDITIONAL — if external cost or action involved |

### 15.3 How Authority Is Requested

APEX never acts first and asks for forgiveness after. Authority is always requested before execution.

The decision panel is the canonical authority request mechanism:
- Plain-language description of what will happen
- Why APEX believes this is appropriate
- What authority it is invoking
- Full alternatives including "do nothing"
- Explicit approval required

### 15.4 Delegated Authority

Agents operate within authority granted by the user at agent configuration time. When an agent's task exceeds its authority scope, it escalates through APEX to the user. The user approves at the level of the specific action, not at the level of the agent's general mandate.

### 15.5 Rejection is Final

A rejection cannot be overridden by:
- A different agent
- A new session
- APEX deciding the rejection was wrong

APEX may re-propose only if: (a) the user explicitly invites it, or (b) circumstances have materially changed AND the change is material enough to warrant surfacing.

---

## 16. Knowledge-Aware Behaviour

### 16.1 Knowledge State Definitions

| State | Definition | APEX behaviour |
|-------|-----------|---------------|
| SUFFICIENT | Evidence meets confidence and freshness thresholds | Answer confidently |
| INSUFFICIENT | Evidence below confidence threshold | State gap; offer research; provide qualified answer if user accepts |
| STALE | Evidence exceeds freshness window | Flag staleness; proceed with caveat unless consequence is high |
| CONTRADICTORY | Conflicting evidence detected | Surface contradiction; do not pick one; offer resolution paths (J-17) |
| UNCERTAIN | Low confidence from indirect inference | State uncertainty; do not present as certain |
| MISSING | No evidence at all | State clearly: "I have no information on this." |

### 16.2 Knowledge-State-Aware Response Rules

**Rule K-01**: APEX must never present UNCERTAIN or STALE information as certain.

**Rule K-02**: On consequential decisions (financial, health, legal), STALE evidence must always be flagged, and APEX must offer to research before proceeding.

**Rule K-03**: On informational queries (low consequence), STALE evidence may be used with a timestamp caveat.

**Rule K-04**: CONTRADICTORY evidence must always be surfaced — never silently resolved by choosing one.

**Rule K-05**: MISSING evidence must be stated honestly — never approximated or fabricated.

**Rule K-06**: After resolving a gap (J-16), APEX resumes the original task with updated knowledge.

### 16.3 User Experience per Knowledge State

**SUFFICIENT**: User never sees knowledge machinery. Response delivered naturally.

**STALE (low consequence)**: "Your gym membership cost is £45 a month — that's from the last renewal, about 8 months ago."

**STALE (high consequence)**: "Before I can give you a confident recommendation on this, I should refresh the pricing data — it's 6 days old. Can I do that first, or would you like to proceed with what I have?"

**INSUFFICIENT**: "I don't have enough information to answer that confidently. I can tell you [partial], but the key data I'm missing is [X]."

**CONTRADICTORY**: "I have two different figures for that — one source says £340, another says £290. They're from different dates. Which would you like me to use?"

**MISSING**: "I don't have any information on that. Would you like me to research it?"

---

## 17. Memory-Aware Behaviour

### 17.1 When Conversations Create Memory

Not every conversation creates memory. Memory capture is triggered by:

| Trigger | Memory created? |
|---------|----------------|
| User says "Remember [X]" | YES — explicit |
| User states a preference | YES — if stated as a preference ("I prefer…" / "I always…") |
| User corrects APEX | YES — correction updates knowledge |
| User confirms a fact | YES — if APEX asked and user confirmed |
| Routine informational query | NO |
| APEX makes a recommendation | NO — recommendation is not a user preference |
| User asks "What time is it?" | NO |
| User describes their situation | CONDITIONAL — if clearly persistent ("I work from home three days a week") |

### 17.2 Memory Confirmation Rule

**Rule M-01**: APEX must confirm explicit memory operations. It must not silently store or delete.

**Rule M-02**: APEX must state what it is remembering, not just "OK."

**Rule M-03**: For ambiguous memory requests, APEX clarifies before storing.

**Rule M-04**: Memory is categorised by domain. APEX states the category when storing.

### 17.3 Memory and Future Behaviour

When memory affects a future response, APEX may acknowledge it:
> "Based on your preference for morning meetings, I've suggested 9am."

The user can ask "What preferences are you using?" → Memory surface, filtered to preferences.

### 17.4 Memory Scope

Memory scope categories:
- **Preference** — how the user likes things done
- **Fact** — something true about the user's world
- **Context** — background the user has provided
- **Correction** — something APEX got wrong that the user fixed
- **Instruction** — an explicit directive about APEX behaviour

---

## 18. Error Journeys

### 18.1 Canonical Error Types and Responses

**E-01 — No answer (knowledge is insufficient)**  
APEX: "I don't know [X]. I have [partial] from [date], but not enough to give you a confident answer."  
Next: Offer research / proceed with caveat / user chooses.

**E-02 — Contradictory knowledge**  
APEX: "I've found two different answers — [A] and [B]. I can't resolve this confidently."  
Next: Present both; offer research; ask user which to use.

**E-03 — Tool / integration failure**  
APEX: "I couldn't reach [integration] right now — the connection failed."  
Next: Offer retry; offer to proceed without that data; note what is affected.

**E-04 — Action failure (during execution)**  
APEX: "Something went wrong while [doing X]. [What succeeded]. [What failed]."  
Next: Offer retry / alternative / cancel / escalate.

**E-05 — Timeout**  
APEX: "That's taking longer than expected. [What is known so far]."  
Next: Offer to wait, cancel, or receive notification when complete.

**E-06 — Network failure**  
APEX: "I'm not connected right now. I can still [offline capabilities]."  
Next: Indicate offline state; offer cached information where available; retry when connected.

**E-07 — Voice failure**  
APEX: "I couldn't hear that clearly. Can you try again?"  
After 3 failures: "Voice doesn't seem to be working well right now — you can type instead."

**E-08 — Authentication failure**  
Redirects to login. Does not expose internal session details. On re-authentication, restores state where possible.

**E-09 — Authorisation failure (agent lacks authority)**  
APEX: "I can't do that without your approval — [what and why]." → Decisions surface.

**E-10 — User cancellation**  
APEX: "Stopped." — no further action. Records cancellation.

### 18.2 Error Communication Rules

- State what happened in plain language (no error codes, no stack traces)
- State what is known and what is not
- Always offer at least one next step
- Do not apologise repeatedly — acknowledge once and move forward
- Do not blame the user
- For system errors, do not expose implementation details

---

## 19. Recovery

Every meaningful error has a recovery path. No dead ends.

| Error | Recovery options |
|-------|-----------------|
| Knowledge gap | Research / proceed with caveat / defer |
| Contradictory knowledge | User picks version / research to resolve / use more recent |
| Tool failure | Retry / proceed without / use cached data / escalate |
| Action failure | Retry / try alternative approach / cancel / escalate |
| Timeout | Wait (with notification on completion) / cancel |
| Voice failure | Text fallback (always available) / retry voice |
| Network failure | Offline mode (cached data) / retry when connected |
| Rejected decision | No action / invite alternative approach / defer |
| Insufficient authority | Escalate to user (Decisions surface) |

**Recovery presentation**: On any error state, the action status panel shows the error with: what happened, what is affected, and ≥1 available next step. User is never left looking at an error with no path forward.

---

## 20. Surface Transitions

### 20.1 Principle

Transitions are task-driven, not page-driven. The user stays where they are as much as possible. Deep content comes to the user through contextual panels and progressive disclosure.

### 20.2 Transition Rules

**Stay on Command when**:
- Conversational query (most interactions)
- Contextual presentation is sufficient
- Layer 2 evidence is requested (opens panel, doesn't navigate)
- Voice is active (navigation mid-voice is disruptive)

**Transition to World when**:
- User explicitly navigates to a domain: "Show me my business."
- User requests domain overview that needs full panel space
- User says "Go deeper" on a domain topic

**Transition to Decisions when**:
- User navigates explicitly: keyboard shortcut / nav item
- User says "What needs my approval?" 
- Approval notification is tapped

**Transition to Knowledge when**:
- User explicitly requests knowledge inspection: "Show me what you know about [X]."
- User wants to browse knowledge state across domains
- User wants to correct or manage memory at scale

**Transition to System when**:
- User explicitly navigates: keyboard shortcut / nav item / "Show me the system state."
- User requests constitutional or governance detail
- User wants agent council view

### 20.3 Contextual Panel vs. Full Surface

| Scenario | Use panel (stay) | Use full surface (navigate) |
|----------|-----------------|----------------------------|
| "Show me my spending." | YES — financial overview panel on Command | — |
| "Show me everything about my finances." | — | YES — World → Finance branch |
| "Why did APEX do that?" | YES — evidence panel on current surface | — |
| "Show me all past decisions." | — | YES — Decisions surface |
| "What do you know about X?" | YES — knowledge panel on current surface | — |
| "Show me all my knowledge gaps." | — | YES — Knowledge surface |

### 20.4 Canonical Cross-Surface Flows

```
COMMAND → WORLD
"Show me my business performance."
→ Contextual business presentation panel on Command
→ If user says "Go deeper": navigate to World → Business branch
→ "Show knowledge gaps." → still in World; Knowledge panel opens inline
→ "Return." → back to Command

COMMAND → DECISIONS
"What needs my approval?"
→ Navigate to Decisions surface
→ User reviews decisions
→ "Do this one." → action executes; notification on completion
→ Return to Command

COMMAND → KNOWLEDGE
"What do you know about my supplier pricing?"
→ Knowledge panel on Command (inline)
→ "Show me everything." → navigate to Knowledge surface, filtered to supplier pricing

NOTIFICATION → COMMAND
Alert banner appears on any surface
→ User taps → notification detail panel opens on current surface
→ "Tell me more." → APEX responds conversationally (no navigation required)
→ "Take me to the decision." → navigate to Decisions surface

WORLD → KNOWLEDGE
User exploring Finance branch in World
→ "What are the knowledge gaps here?" → Knowledge panel opens inline in World
→ "Research the outdated items." → Research task initiated; stays in World

DECISIONS → SYSTEM
User in Decisions reviewing a pending action
→ "Show me the constitutional basis." → Layer 3 panel opens inline
→ "Show me the full governance record." → navigate to System → Governance
→ Return to Decisions
```

---

## 21. Tree-of-Life Task Model

### 21.1 Domain Interaction Model

Each Tree-of-Life branch supports the same interaction model:

```
Enter domain (navigate or voice: "Show me my [domain]")
        │
        ▼
Domain overview presented:
  - Current state (key metrics)
  - Recent activity in domain
  - Open tasks / pending items
  - Knowledge state (freshness, gaps)
  - Active agent and status
        │
        ▼
User explores (or APEX highlights priorities)
        │
        ├── "What should I focus on here?" → RECOMMEND intent → J-09 (domain-scoped)
        ├── "What do you know about [topic]?" → J-15 / T-02 (domain-scoped)
        ├── "Research [gap]." → J-16 (domain-scoped)
        ├── "What is [Agent] working on?" → J-21
        ├── "Do [action]." → T-05 → authority check
        └── "Return." → Command surface
```

### 21.2 Cross-Domain Tasks

Some tasks involve multiple domains. APEX coordinates across domains without requiring the user to manually traverse each.

**Example — Business investment decision**:
> User: "Should I invest in new software for the business?"

APEX internally:
1. Retrieves business context (operations, current tools)
2. Retrieves financial context (available capital, cash flow projection)
3. Retrieves any relevant research (market data, if available)
4. Coordinates if agent is involved

APEX presents:
- One coherent recommendation
- Evidence panel shows which domains contributed
- User never has to navigate Business → Finance → Research manually

The user's experience is: "APEX considered everything relevant and gave me an answer."

### 21.3 Domain Discovery

New capabilities within a domain appear as new items within the domain branch. The user encounters them by exploring the domain or through APEX proactively surfacing them: "I've added a [capability] to your [domain] — would you like me to show you how it can help?"

### 21.4 Stub Domains (Currently Sparse)

Domains with limited content (Occult, Research, Civilisation) present:
- Domain name and brief description
- Current knowledge state (likely: "Limited information — you can teach me about this domain.")
- Invitation: "Would you like to add information about this area?"

These are never dead ends. They are growing branches.

---

## 22. Cross-Surface Tasks

### 22.1 Command ↔ World

| Trigger | Flow |
|---------|------|
| "Show me [domain]." | Contextual panel on Command → "Go deeper" → World |
| Navigate to World | Full domain browser; return via nav or "Command." |
| Domain notification tapped | Notification detail on current surface; option to navigate to World domain |

### 22.2 Command ↔ Knowledge

| Trigger | Flow |
|---------|------|
| "What do you know about X?" | Knowledge panel on Command |
| "Show me all knowledge gaps." | Navigate to Knowledge surface |
| Knowledge chip tapped in Layer 2 | Knowledge detail panel expands inline |
| Research initiated from Command | Research task runs; stays on Command; notification on completion |

### 22.3 Command ↔ Decisions

| Trigger | Flow |
|---------|------|
| Decision notification arrives | Banner on current surface; tap → detail panel |
| "What needs my approval?" | Navigate to Decisions |
| APEX proposes action | Decision panel (inline or navigate depending on complexity) |
| Keyboard shortcut A | Navigate to Decisions |

### 22.4 Command ↔ System

| Trigger | Flow |
|---------|------|
| "Show me the system state." | Navigate to System |
| "Constitutional record for [X]." | Layer 3 panel inline, or navigate to System → Governance |
| Keyboard shortcut 5 | Navigate to System |

### 22.5 Notification → Any Surface

A notification can be the entry point to any surface. Tapping any notification detail shows an option to "Open in [relevant surface]." The notification context is preserved — APEX does not lose track of the notification when the user navigates.

---

## 23. Task Lifecycle

### 23.1 States

```
DISCOVERED    APEX or user identifies a task
UNDERSTOOD    APEX has parsed intent and formed a plan
PLANNED       For multi-step tasks: APEX has a sequence ready
WAITING       Waiting for external event or data
REQUIRES INPUT  APEX needs user clarification to proceed
REQUIRES APPROVAL  Proposed action awaiting human decision
EXECUTING     Task is actively running
COMPLETED     Task finished successfully
FAILED        Task encountered unrecoverable error
CANCELLED     User or system cancelled the task
DEFERRED      Task intentionally postponed
```

### 23.2 User Visibility by State

| State | What user sees |
|-------|---------------|
| DISCOVERED | Nothing (internal) unless APEX surfaces it proactively |
| UNDERSTOOD | APEX begins responding |
| PLANNED | APEX may state its approach briefly for complex tasks |
| WAITING | Activity feed: "Waiting for [X]" |
| REQUIRES INPUT | APEX asks exactly one clarifying question |
| REQUIRES APPROVAL | Decision surface notification + badge |
| EXECUTING | Activity feed: "Doing [X]..." + status panel if significant |
| COMPLETED | Activity feed entry + brief verbal confirmation |
| FAILED | Activity feed entry + error explanation + options |
| CANCELLED | Activity feed entry: "Cancelled." |
| DEFERRED | Activity feed entry + Decisions badge if decision was deferred |

### 23.3 Notification Appropriateness by State

| State | Notification? | Level |
|-------|--------------|-------|
| COMPLETED (routine) | Feed only | 0 |
| COMPLETED (significant) | Feed + banner | 1–2 |
| FAILED | Feed + attention | 3 |
| REQUIRES APPROVAL | Decision notification | 4 |
| WAITING → ESCALATION | Attention | 3 |

---

## 24. Long-Running Work

### 24.1 Background Tasks

APEX may perform work that continues after the user navigates away or closes the app.

Examples:
- Multi-hour research task
- Scheduled reports running overnight
- Monitoring external events
- Waiting for a meeting to end before following up

### 24.2 User Experience for Background Work

**When initiating**:
> APEX: "This will take a while — I'll notify you when it's done. Is that OK?"  
> User: "Yes."  
> APEX: "I'll get started. I'll let you know when I have something."

**While running**:
- Activity feed shows: "Researching [X] · In progress"
- User can tap to see progress details
- User can cancel: "Stop the research." → APEX confirms cancellation

**On completion**:
- Notification delivered at appropriate level
- "I've finished researching [X]. Here's what I found." → contextual presentation

### 24.3 "What Is Running?"

At any time: "What are you working on?" → J-22. APEX lists all active background tasks.

### 24.4 Scheduled Tasks

APEX has scheduled tasks (from CLAUDE.md: Render cron route, autonomy level 3). The user can:
- See scheduled tasks in System surface → Execution
- Ask "What are you scheduled to do?" → APEX describes schedule in plain language
- Modify or cancel scheduled tasks (with appropriate authority check)

### 24.5 Waiting for External Events

APEX monitors external state (e.g., waiting for a payment to clear, for a reply to arrive).

User experience:
- Activity feed: "Monitoring [X] · Next check in [N] minutes"
- User can ask "Any update on [X]?" → APEX reports current state
- When event occurs: appropriate notification level

---

## 25. APEX Working States

Avoid generic "Loading..." wherever richer status is possible.

| Internal state | User-facing label |
|---------------|-----------------|
| Receiving voice input | "LISTENING…" |
| Processing speech to text | "UNDERSTANDING…" |
| Retrieving knowledge | "CHECKING…" |
| Assessing / reasoning | "THINKING…" |
| Running research | "RESEARCHING [topic]…" |
| Coordinating agents | "COORDINATING…" |
| Forming recommendation | "PREPARING RECOMMENDATION…" |
| Awaiting approval | "AWAITING YOUR DECISION" |
| Executing action | "DOING [plain-language action]…" |
| Waiting for external | "WAITING FOR [X]…" |
| Completed | "DONE." |
| Failed | "UNABLE TO COMPLETE — [brief reason]" |

**Rules**:
- Labels always describe user-relevant work, not technical processes
- Labels use present continuous tense ("RESEARCHING", not "WILL RESEARCH")
- No internal module names, route names, or provider names in any label
- Maximum label length: ~30 characters in the orb sub-label area

---

## 26. User Correction

### 26.1 Natural Correction Patterns

Users correct APEX naturally. APEX must handle all of these:

| User says | APEX interprets |
|-----------|----------------|
| "That's wrong." | Correct the most recent APEX assertion |
| "No, I meant [X]." | Reinterpret prior intent with new information |
| "Don't do that." | Cancel current action / prevent future occurrence |
| "Use [X] instead." | Substitute a parameter in current task |
| "Remember [corrected fact]." | Update memory |
| "Forget [incorrect fact]." | Delete memory |
| "Actually, it's [X]." | Correct an assertion mid-task |

### 26.2 Correction Behaviour

1. **Acknowledge immediately**: "You're right." / "Got it." / "Understood."
2. **State what will change**: "I'll use [new value] instead."
3. **Determine scope**: Does this affect current task only, or should it update memory?
4. **Update memory if warranted**: Confirm if memory is being updated.
5. **Continue from corrected state**: Do not restart the full task unless necessary.

### 26.3 Correction Does Not Reset Context

A correction mid-task does not erase what came before. APEX updates the specific element and continues: "I'll adjust that — so, [corrected summary]. Shall I continue?"

### 26.4 Consequential Correction

If a correction materially changes what APEX was about to do (e.g., changes the recipient of an email, changes the amount of a transfer): APEX re-confirms the full action before executing. "So I'll now [corrected action] — is that right?"

---

## 27. User Control

### 27.1 The User Is Always in Control

The user must never feel trapped inside an APEX workflow. At any point:

| Control | Mechanism |
|---------|-----------|
| Stop APEX speaking | Speak over APEX / "Stop." |
| Stop a task | "Cancel." / "Stop." |
| Reject a proposed action | "No." / Reject button |
| Dismiss a presentation | "Close it." / ✕ / swipe down |
| Mute voice | "Mute." / volume toggle |
| Pause notifications | "Quiet mode." / settings |
| Inspect activity | Activity feed / "What are you doing?" |
| Inspect decisions | Decisions surface / "What needs my approval?" |
| Inspect memory | "What do you remember?" / Memory surface |
| Inspect history | Activity surface |
| Cancel a long-running task | "Stop [task]." |
| Modify a preference | Natural language / settings |

### 27.2 No Locked Workflows

APEX must not create workflows where the only path forward is to complete APEX's intended sequence. The user must always have:
- A way to say "No."
- A way to say "Different approach."
- A way to say "Stop entirely."
- A way to ask "What are you doing and why?"

### 27.3 Voice Can Always Be Muted

Voice output is always optional. Muting does not affect APEX's function — only its delivery modality.

### 27.4 Notifications Can Be Managed

The user can: disable all notifications temporarily (quiet mode), disable specific notification categories, set quiet period hours, adjust notification thresholds. These are preferences stored in APEX memory / user config.

---

## 28. Accessibility Journeys

### 28.1 Keyboard-Only Paths

Every critical task must have a full keyboard path.

| Task | Keyboard path |
|------|--------------|
| Navigate surfaces | `1–5` keyboard shortcuts |
| Focus chat input | `/` |
| Activate voice | Space (when input not focused) |
| Navigate help | `?` |
| Access approvals | `A` |
| Navigate to notifications | `N` |
| Close overlays | `ESC` |
| Tab through interactive elements | `Tab` / `Shift+Tab` |
| Activate any button | `Enter` or `Space` |
| Expand disclosure | `Enter` on disclosure chevron |

### 28.2 Screen Reader Paths

| Component | Screen reader behaviour |
|-----------|------------------------|
| Orb state | aria-live region announces state changes: "APEX is listening." / "APEX is speaking." |
| Activity feed entries | Each entry announced when added; aria-atomic |
| Notifications | aria-live="assertive" for Level 3+; "polite" for Level 1–2 |
| Presentation panels | Announced as dialog or region; focusable heading |
| Decision panels | Announced as dialog; focus moves to panel on open |
| Voice transcript | aria-live region for real-time transcript |
| Error states | aria-live="assertive" for errors |

### 28.3 Reduced Motion

When `prefers-reduced-motion: reduce`:
- Orb animations: removed (static indicator remains)
- Page transitions: instant (no slide)
- Waveform: removed (static indicator)
- All decorative animations: removed
- State changes: communicated via text label only

(OBSERVED: currently implemented in dashboard.html — PROTECT)

### 28.4 Voice Unavailable

Every interaction that can be done by voice has a text equivalent. No capability is voice-only. Keyboard shortcut Space (voice start) has no effect when voice is unavailable — text input is the fallback and is always visible.

### 28.5 Visual Presentation Unavailable

When a user cannot perceive visual presentations (screen reader, or user preference), presentations must have:
- A text summary announced by aria-live
- Keyboard-navigable data table alternative for charts
- "Read this to me." option (APEX reads the presentation aloud)

---

## 29. Mobile Journeys

### 29.1 Mobile Priorities

On mobile, in order of importance:
1. Command surface — orb, voice, conversation
2. Notifications — timely and actionable
3. Decisions — approval workflow
4. Activity — feed access
5. World — domain exploration

### 29.2 Mobile Command Journey

**Starting state**: App open; user on Command surface on mobile.

Layout:
- Top bar: APEX brand + clock + status dot
- Centre: Plasma orb (prominent, large, centred)
- Orb sub-label: "STANDBY · TAP TO SPEAK"
- Status strip: 2×2 (Balance / Messages / Tasks / Health)
- Input zone: bottom (always visible — D-03 fix)
- Bottom nav: 5 icons

**Voice activation**: Tap orb → LISTENING → speak → APEX responds (voice + optional visual below orb).

**Text activation**: Tap input zone → keyboard appears → type → send.

**Presentation**: Appears below orb, full-width, when active.

### 29.3 Mobile Notification Journey

Notification arrives:
- Banner slides in from bottom above the input zone (does not cover input)
- Tap banner → notification detail panel expands in place
- Swipe to dismiss

### 29.4 Mobile Approval Journey

Decision pending:
- Decisions badge on bottom nav shows count
- Tap Decisions → surface opens
- Decision panel full-screen on mobile
- APPROVE / REJECT / MODIFY / DEFER buttons full-width, minimum 44px height
- "Ask APEX" → voice or text follows up

### 29.5 Mobile Navigation

No hamburger dropdown. Bottom nav is canonical mobile navigation (5 icons). Domain exploration within World uses layered drill-down navigation (native mobile pattern). Back navigation consistent with platform conventions.

---

## 30. Real-Life Scenarios

### Scenario A — Personal Finance Check (morning routine)

**Context**: User opens APEX on mobile at 8am.

1. APEX orb in standby. Activity feed shows 3 overnight events.
2. User taps orb: "Morning — what's my financial situation?"
3. APEX UNDERSTANDING → THINKING → SPEAKING:
   "Morning. Your balance is £2,100 — down £340 from last week, mostly from the car service yesterday. You've got £1,200 coming in on Friday. No unusual activity."
4. APEX invokes presentation: compact financial strip below orb — balance, upcoming, trend.
5. User: "What about the end of the month?"
6. APEX (context continuation — "end of month" understood from prior context): "If spending stays similar, you should end the month around £800 — which is below your £1,000 target."
7. User: "Should I be worried?"
8. APEX (RECOMMEND): "Slightly. I'd suggest holding off on the gym equipment you were looking at until after payday. That alone keeps you above target."
9. User: "Good idea. Can you remind me about the gym equipment on Saturday?"
10. APEX: "Done — I'll remind you on Saturday morning." [T-09 memory; T-11 reminder task]
11. User dismisses: "Thanks." → STANDBY.

**Surfaces used**: Command only. No navigation.  
**Modalities**: Voice + visual (financial strip).  
**Authority**: None required.

---

### Scenario B — Business Decision (mid-morning)

**Context**: User on desktop, Command surface.

1. Notification (Level 3): "Finance Agent has flagged a supplier invoice that looks unusually high."
2. User taps banner → notification detail panel.
3. APEX: "The invoice from [Supplier] is £4,800 — that's 40% higher than the previous invoice. The Finance Agent flagged this for your attention."
4. User: "Show me the detail." → Presentation surface opens: invoice comparison card.
5. User: "Is this legitimate?"
6. APEX (KNOWLEDGE check: knows prior invoices, notes no price change agreement in memory): "I don't have a record of an agreed price increase. This could be a billing error or an undiscussed price change."
7. User: "Research whether we agreed to any price increase."
8. APEX: "Researching — give me a moment." [J-16, background if longer than a few seconds]
9. APEX (30 seconds later): "I couldn't find any record of an agreed increase in our communications or documents. The previous 6 invoices averaged £3,400."
10. User: "Reject the invoice and ask them to resubmit."
11. APEX (T-05, T-10): "That means sending a formal response declining the invoice and requesting a corrected one. This will be sent from your business email. Shall I do that?"
12. User: "Yes, do it."
13. APEX: Decision panel → APPROVE → executes → "Done — I've sent the rejection. I've noted the correct expected amount in case they resubmit."

**Surfaces**: Command throughout. Decisions inline.  
**Modalities**: Notify → Converse → Present.  
**Authority**: Sending external communication required explicit approval.

---

### Scenario C — Knowledge Gap During Research Task

**Context**: User asks about a competitor's pricing.

1. User: "What's [Competitor]'s current pricing?"
2. APEX (KNOWLEDGE check → MISSING): "I don't have current pricing for [Competitor]. The last information I have is from 8 months ago."
3. User: "Research it."
4. APEX: "I'll look into that — it may take a few minutes." [J-16]
5. Activity feed: "Researching [Competitor] pricing · In progress"
6. User navigates to World → Business while APEX researches.
7. 3 minutes later: Notification (Level 2) — "[Competitor] pricing research complete."
8. User returns to Command. APEX: "Found it — their current pricing for the core tier is [price], up from [old price]. That puts you [comparison]."
9. Presentation panel: comparison card — APEX vs. Competitor pricing tiers.

**Cross-surface**: Command → World → Notification → Command.  
**Modalities**: Converse (gap notification) → Activity → Notify → Converse + Present.

---

### Scenario D — Voice Interruption and Course Correction

**Context**: User in voice conversation; APEX gives a long response.

1. APEX SPEAKING: "Your spending across all categories this month has been generally in line with your targets — food is within budget, transport is slightly under, but where I see the biggest deviation is in subscription services, which have increased by..."
2. User (interrupts): "Wait — just subscriptions, that's what I care about."
3. APEX → LISTENING (immediate stop) → UNDERSTANDING.
4. APEX: "Subscriptions are up £34 this month — two new ones added in the last two weeks."
5. User: "Which ones?"
6. APEX: "[Service A] at £8 and [Service B] at £26."
7. User: "Cancel the [Service B]."
8. APEX (T-05 → T-10, consequential): "That would mean sending a cancellation request. Should I do that?"
9. User: "Yes."
10. APEX executes → "Done."

**Key moment**: Interruption at step 2 — APEX stops mid-sentence, does not resume prior content.  
**Surfaces**: Command only.

---

### Scenario E — Approval Workflow with Modification

**Context**: APEX Finance Agent proposes a routine transfer.

1. Notification (Level 4): "Finance Agent is proposing an action — your decision is needed."
2. User opens Decisions surface.
3. Decision panel: "Transfer £500 from current account to savings. Why: End-of-month surplus matches your savings target. Evidence: £800 available above monthly expenses. Risk: Reduces buffer to £300 — slightly low. Alternative: Transfer £300 (preserves £500 buffer)."
4. User: "Modify — do £300 instead."
5. APEX: "So, transfer £300 to savings instead of £500. Shall I proceed?"
6. User: "Yes."
7. APEX: Modified action approved → EXECUTING → COMPLETED: "Done — £300 transferred."

**Surfaces**: Notification → Decisions → Command (result).  
**Modalities**: Notify + Decisions panel.  
**Authority**: Explicit approval required; modification triggered fresh confirmation.

---

### Scenario F — Memory Operations

**Context**: User teaching APEX a preference.

1. User: "From now on, don't schedule anything before 9am."
2. APEX: "Got it — I'll avoid scheduling before 9am for you. I've noted this as a scheduling preference."
3. [Later in same session] User: "Schedule a dentist appointment."
4. APEX proposes 10am slot (respecting 9am preference, not prompted by user).
5. [Different session] User: "Why did you suggest 10am?"
6. APEX: "Because you've told me you prefer not to have appointments before 9am."
7. User: "Actually, for medical appointments before 9am is fine."
8. APEX: "Understood — I'll allow early mornings for medical appointments. Should I update your preference?"
9. User: "Yes."
10. APEX: "Updated — no-early rule now only applies to work-related scheduling."

---

### Scenario G — System Transparency

**Context**: User wants to understand a past APEX decision.

1. User: "Why did APEX flag that invoice last week and not the one before?"
2. APEX (Layer 1): "The threshold changed — the earlier invoice was within 10% of the average; last week's was 40% above."
3. User: "How does that threshold work?"
4. APEX (Layer 2): "I flag invoices that exceed 15% above the trailing 6-invoice average. That threshold is based on your finance domain settings."
5. User: "Show me the full record for last week's flag."
6. APEX: "I'll show you the system record." → Layer 3 panel: agent ID (human-readable: Finance Agent), trigger condition, timestamp, evidence used, constitutional authority (A5 — Generic Engines), decision record ID.
7. User: "OK, that makes sense." → returns to Command.

---

## 31. Canonical Task Matrix

| Task ID | Task | Intent group | Entry point | Primary surface | Secondary | Primary modality | Secondary modality | Knowledge req. | Authority req. | Presentation | Action | Memory | Notification | Completion | Failure |
|---------|------|-------------|-------------|----------------|-----------|-----------------|-------------------|---------------|---------------|-------------|--------|--------|-------------|-----------|---------|
| T-01 | Information retrieval | RETRIEVAL | Voice/text, any surface | Command | — | Voice or Text | — | Sufficient | None | Optional chip | None | Log | None | Answer delivered | Gap → J-15 |
| T-02 | Knowledge inspection | RETRIEVAL | Voice/text; Knowledge | Command/Knowledge | — | Text | Voice | Self-referential | None | Knowledge panel | Optional: research/correct | Log | None | State communicated | Missing → "No info" |
| T-03 | Analysis | UNDERSTANDING | Voice/text | Command | World | Voice + Visual | Text | Domain data | None | Chart / comparison | None | Log | None | Assessment delivered | Insufficient data → qualified answer |
| T-04 | Decision support | DIRECTION | Voice/text; APEX-init | Command | Decisions | Voice + Visual | Text | Domain + gaps flagged | For action only | Recommendation card | On user approval | Decision record | Level 3–4 | User decides | Insufficient knowledge → J-15 first |
| T-05 | Action execution | EXECUTION | Post-approval | Command | Decisions | Voice (confirm) | Text | Sufficient for action | YES (human) | Action status | Execute | Action record | Level 0–2 (result) | Completed | Failed → J-14 |
| T-06 | Monitoring | EXECUTION | Voice; Activity feed | Command/Activity | — | Text/Voice | — | Live state | None | Status panel | Optional | Log | Level 0–3 | State reported | Cannot reach → report |
| T-07 | Research | DIRECTION | Voice; gap detection | Command | World | Text | Voice | Gap exists | Optional | Progress → findings | None | Knowledge base | Level 1–2 (done) | Findings delivered | Partial → report what found |
| T-08 | Planning | DIRECTION | Voice/text | Command | World | Voice + Visual | Text | Domain + prefs | For execution | Plan card | On approval | Plan + preferences | None | Plan accepted | Insufficient context → clarify |
| T-09 | Memory operation | MEMORY | Voice/text | Command | Knowledge | Text (confirm) | Voice | Self-referential | None | Confirmation chip | None | Memory record | None | Confirmed | System error → report |
| T-10 | Communication | EXECUTION | Voice/text; Domain | World/Command | — | Voice (draft) + Text | Visual (draft) | Contact context | YES (sending) | Draft panel | Send on approval | Log | None | Sent confirmed | Send failed → J-14 |
| T-11 | Agent delegation | EXECUTION | Voice; APEX-init | Command | System | Voice/Text | Activity | Agent availability | Conditional | Agent status | Task delegated | Agent task record | Level 0–2 | Outcome reported | Agent fails → J-14 |
| T-12 | System inspection | RETRIEVAL | Navigate; voice | System | — | Text | Voice | Internal state | None | System panels | Optional | Log | None | State communicated | Degraded → honest report |

---

## 32. Canonical Journey Matrix

| Journey | Start | Trigger | User action | APEX action | Surface | Modality | Presentation | Authority | Outcome | Next state |
|---------|-------|---------|------------|------------|---------|----------|-------------|-----------|---------|-----------|
| J-01 Simple question | IDLE | User speaks/types | Simple question | Retrieve + respond | Command | Voice or Text | None | None | Answer delivered | IDLE |
| J-02 Complex question | IDLE | User query | Multi-part question | Synthesise + assess | Command | Voice + Visual | Domain overview | None | Assessment + chart | Presentation visible |
| J-03 "Why?" | Post-response | Follow-up | "Why?" | Retrieve evidence | Current surface | Voice + Visual | Evidence panel | None | Evidence shown | Evidence panel visible |
| J-04 Show me | Conversation | User/APEX | "Show me." | Generate visual | Command | Voice + Visual | Domain chart/card | None | Visual context | Panel visible |
| J-05 Voice conversation | STANDBY | Orb tap | Continuous speech | Listen → respond | Command | Voice | Optional | None | Natural dialogue | STANDBY |
| J-06 Voice interruption | APEX SPEAKING | User speaks | Speak over APEX | Stop + listen | Command | Voice | None | None | New turn begins | LISTENING |
| J-07 Proactive notification | MONITORING | Event detected | N/A (APEX initiates) | Governance gate → notify | Current surface | Notify | Optional | None | Notification delivered | Banner visible |
| J-08 Notification → conversation | Notification | User taps | Tap banner | Open detail + explain | Current surface | Voice or Text | Detail panel | None | Notification addressed | Notification resolved |
| J-09 Recommendation | IDLE | User request | "What should I do?" | Synthesise → recommend | Command | Voice + Visual | Priority card panel | For action | Recommendation delivered | User chooses |
| J-10 Decision authority | IDLE/monitoring | APEX proposes | N/A (APEX initiates) | Present decision panel | Decisions | Notify + Visual | Decision panel | YES | User decides | APPROVED or REJECTED |
| J-11 Rejection | Decision open | User rejects | "No." / REJECT | Acknowledge + stop | Decisions | Voice/Text | REJECTED status | N/A | Action stopped | IDLE |
| J-12 Modification | Decision open | User modifies | "Do X instead." | Re-present modified | Decisions | Voice + Visual | Updated panel | YES (re-approval) | Modified approved | Execute |
| J-13 Action execution | Post-approval | Approval received | N/A | Execute + confirm | Command | Voice + Activity | Action status | Pre-granted | Action completed | IDLE |
| J-14 Action failure | Executing | Failure occurs | N/A (APEX reports) | Explain + offer options | Command | Voice + Visual | Failed status panel | N/A | User chooses recovery | Recovery or CANCELLED |
| J-15 Knowledge gap | Knowledge check | Gap detected | N/A | Report gap + offer | Current surface | Voice/Text | Gap chip | None | Gap surfaced | User chooses research/proceed |
| J-16 Knowledge research | Gap detected | User requests | "Research it." | Initiate research | Command | Voice/Text | Progress → findings | Optional | Knowledge updated | IDLE |
| J-17 Contradiction | Knowledge check | Contradiction found | N/A | Surface both sides | Current surface | Voice/Text + Visual | Contradiction panel | None | User resolves | Resolution applied |
| J-18 Memory store | Conversation | User instructs | "Remember X." | Confirm + store | Current surface | Voice/Text | Confirm chip | None | Memory stored | IDLE |
| J-19 Memory correction | Conversation | User corrects | "That's wrong." | Acknowledge + update | Current surface | Voice/Text | Confirm chip | None | Memory corrected | IDLE |
| J-20 Memory deletion | Any | User instructs | "Forget X." | Confirm + delete | Any | Voice/Text | Confirm chip | None | Memory deleted | IDLE |
| J-21 Agent activity | Any | User queries | "What is [Agent] doing?" | Report agent state | Command/System | Voice/Text | Agent status panel | None | Status communicated | IDLE |
| J-22 "What are you doing?" | Any | User queries | "What are you doing?" | Summarise all activity | Command | Voice/Text | Activity feed | None | Activity communicated | IDLE |
| J-23 "Why did you do that?" | Any | User queries | "Why did you do X?" | Explain + evidence | Current surface | Voice + Visual | Evidence panel | None | Explanation delivered | User satisfied |
| J-24 System transparency | Any | User navigates | Navigate to System | Present system state | System | Text + Visual | System panels | None | State communicated | System surface |
| J-25 Urgent attention | Monitoring | Critical event | N/A (APEX initiates) | Fullscreen + voice alert | Current surface | Notify + Voice + Visual | Fullscreen overlay | YES (acknowledge) | Situation addressed | Alert resolved |

---

## 33. UX Invariants

These rules are binding regardless of implementation, framework, or future phase.

**INV-01** — Text is always first-class. Voice is optional. No capability is voice-only.

**INV-02** — Voice can be interrupted at any moment. APEX stops immediately. No delay, no finishing the sentence.

**INV-03** — APEX cannot silently execute consequential actions. Human approval is required and explicitly recorded before execution.

**INV-04** — Uncertain information must never be presented as certain. Knowledge state (sufficient/stale/uncertain/missing) must be communicated when it matters.

**INV-05** — APEX must not present either side of a contradiction without surfacing the contradiction itself.

**INV-06** — The user can always cancel. No workflow traps the user.

**INV-07** — The user can always correct. APEX accepts corrections without argument.

**INV-08** — Every meaningful error has a recovery path. No dead ends.

**INV-09** — Every notification must have a justification. Notifications are not sent unless they pass the governance gate.

**INV-10** — Presentations remain contextually connected to the conversation that produced them. They are not independent dashboard widgets.

**INV-11** — Knowledge gaps must not be bridged by fabrication. APEX states what it does not know.

**INV-12** — Human authority is explicit and recorded. An approval that was not explicitly given does not count.

**INV-13** — A rejection is final until the user invites reconsideration. APEX does not re-propose rejected actions automatically.

**INV-14** — Memory operations are confirmed. APEX does not silently store or delete.

**INV-15** — Activity is always logged. What APEX does is always visible to the user on request.

**INV-16** — Progressive disclosure is available for all APEX assertions. The user can always ask "Why?" and receive an evidence-backed answer.

**INV-17** — APEX does not expose implementation details in normal UX. No provider names, route names, internal identifiers, or technical terms in Layers 1–2.

**INV-18** — The orb communicates APEX state at all times. The user can always determine what APEX is doing by looking at the orb.

**INV-19** — Conversation context is shared between voice and text. Switching modality mid-conversation does not reset context.

**INV-20** — APEX earns the right to interrupt. Proactive communication requires: relevance + knowledge sufficiency + urgency + user context + governance.

**INV-21** — APEX never auto-executes a deferred decision. Deferral means the user will be asked again, not that the action is approved for later.

**INV-22** — Modified actions require fresh approval. A modification to a proposed action does not inherit the prior approval.

---

## 34. Open Questions

### UX Questions

**UQ-01 — Cross-session context scope** (OPEN)  
*Question*: Which conversation context should persist across sessions? All of it? Only named/significant topics?  
*Why it matters*: Defines memory boundary between session and long-term memory; affects privacy.  
*Current evidence*: UX-01 deferred; no current legacy behaviour (each page load is fresh).  
*Decision phase*: UX-03 or engineering.

**UQ-02 — Presentation auto-dismiss timing** (OPEN)  
*Question*: Exactly how many conversational turns before a presentation auto-dismisses? Is 3 the right number?  
*Why it matters*: Too aggressive = lost context; too passive = cluttered screen.  
*Decision phase*: UX-03 or user testing.

**UQ-03 — Recommendation depth** (OPEN)  
*Question*: By default, should APEX present 1 recommendation or 2–3 options?  
*Why it matters*: 1 is decisive; 2–3 preserves user agency. Depends on task type.  
*Proposal*: 1 recommendation with "What else?" available. Explicit options only for decision tasks.  
*Decision phase*: UX-03.

**UQ-04 — Quiet period configuration UX** (OPEN)  
*Question*: How does the user configure quiet periods? Natural language ("Don't disturb me after 10pm") or settings panel?  
*Decision phase*: UX-19 (preferences phase).

**UQ-05 — Memory explicit vs. inferred** (OPEN)  
*Question*: Should APEX ever store inferred preferences without explicit user confirmation? (E.g., user always rejects 9am slots → APEX infers preference.)  
*Why it matters*: Inferred memory could feel invasive; explicit is safer but may miss natural preferences.  
*Decision phase*: UX-17 (memory phase).

### Architectural Questions (OPEN — from UX-01)

**AQ-01** — Frontend framework (OAQ-01 from UX-01): Must be decided before UX-02 engineering.  
**AQ-02** — Voice provider (OAQ-03): Must be confirmed before Voice UX engineering.  
**AQ-03** — Electron wrapper fate (OAQ-07): Affects mobile/desktop strategy.  
**AQ-04** — Cross-session persistence implementation (UQ-01 above): Storage and privacy model.

### Security Questions

**SQ-01 — localStorage API key retirement** (OPEN)  
*Question*: When and how is `apex_app_key` retired from localStorage? What migrates existing sessions?  
*Why it matters*: Security (UX-00 S-02); must not break existing authenticated sessions.  
*Decision phase*: Engineering (pre-UX-03 implementation).

---

## 35. UX-03 Handoff Specification

UX-03 (Information Architecture / Tree of Life) receives the following from UX-02:

### Canonical User Intents (for IA design)
7 intent groups: RETRIEVAL, UNDERSTANDING, DIRECTION, DECISION, EXECUTION, MEMORY, CONTROL. Full taxonomy in Section 5.

### Canonical Task Types (for navigation design)
12 task types: T-01 through T-12. Each with: purpose, entry points, surfaces, completion, failure. Full definitions in Section 7.

### Surface Transition Requirements
- 5 canonical surfaces: COMMAND, WORLD, DECISIONS, KNOWLEDGE, SYSTEM
- Most tasks stay on COMMAND; contextual panels bring content to the user
- Surface navigation only when: full-domain exploration requested, explicit approval queue review, explicit knowledge browse, explicit system inspection
- Full transition rules in Section 20

### Cross-Surface Requirements
- COMMAND is the hub; all other surfaces are destinations
- Notification entry point → any surface (see Section 22)
- Cross-domain tasks are handled by APEX internally; user never manually traverses multiple surfaces for one task (Section 21.2)

### Domain Interaction Requirements
- Each Tree-of-Life branch: state overview, recent activity, open items, knowledge state, agent status
- New capabilities appear as branch items, not new surfaces
- Stub domains (Occult, Research, Civilisation): growth branches — present what exists, invite expansion

### Navigation Requirements
- Desktop: left sidebar, 5 surfaces, 200px
- Mobile: bottom bar, 5 icons
- Keyboard: `1–5` for surfaces, `A` for approvals, `N` for notifications, `/` for input, `?` for help, `ESC` for close
- Voice navigation: "Go to [surface]." or domain name

### Contextual Presentation Requirements
- Presentation surface on Command: adjacent to orb (desktop), below orb (mobile)
- Types needed: metrics card, chart, comparison, recommendation card, decision panel, evidence panel, knowledge panel, agent status, action status, findings panel
- Lifecycle: trigger → display → conversational reference → dismiss/persist

### Notification Entry Requirements
- 5 levels: SILENT / LOG / IN-APP / ATTENTION / DECISION / URGENT
- Entry points: activity feed, banner, fullscreen (Level 5 only)
- Each level has defined persistence, auto-dismiss behaviour, and grouping rules

### Mobile Requirements
- Same 5 surfaces on bottom nav
- Orb: large, centred, primary voice trigger
- Presentation: below orb, full-width
- Input zone: always visible (D-03 fix confirmed)
- Minimum touch targets: 44px (PROTECT)

### Accessibility Requirements
- Keyboard paths for all 25 journeys
- Screen reader regions defined (Section 28.2)
- Voice-unavailable paths for all critical tasks
- Visual-unavailable paths for all presentations

### Confirmed UX Invariants for IA
INV-01 through INV-22 (Section 33) — all must be preserved in IA design. Specifically for IA:
- INV-01: Text always available
- INV-06: No workflow traps
- INV-10: Presentations connected to conversation
- INV-17: No implementation details in Layers 1–2
- INV-18: Orb always communicates state

---

## Verification

Before completion:
- [x] No HTML modified
- [x] No CSS modified
- [x] No JavaScript modified
- [x] No backend code modified
- [x] No routes modified
- [x] No APIs modified
- [x] No database schemas modified
- [x] No dependencies installed
- [x] No configuration changed
- [x] Only `docs/interface/UX-02-USER-TASK-MODEL.md` created

---

## UX-02 STATUS

**STATUS: COMPLETE**

| Field | Value |
|-------|-------|
| Source documents consumed | UX-00, UX-01, CLAUDE.md, KG-08 |
| Canonical user model | Defined — single owner; 17 fundamental needs |
| Canonical intent model | 23 intents in 7 groups |
| Task taxonomy | 12 task types (T-01–T-12) |
| Canonical journeys | 25 journeys (J-01–J-25) |
| Multimodal model | Decision matrix — 13 content types mapped to modalities |
| Proactive communication model | 6-gate governance model; 5-level hierarchy; grouping + quiet period rules |
| Attention model | 5-tier priority system; anti-patterns defined |
| Decision/authority model | Full 9-step flow; 5 user decision paths |
| Knowledge-aware behaviour | 6 knowledge states; rules K-01–K-06 |
| Memory-aware behaviour | Trigger model; 5 scope categories; rules M-01–M-04 |
| Error/recovery model | 10 error types; recovery paths for all |
| Surface transition model | Task-centric transitions; contextual panels vs. full surfaces |
| Tree-of-Life task model | Domain interaction model; cross-domain task handling |
| Long-running task model | Background work UX; scheduling; "What's running?" |
| Real-life scenarios | 7 scenarios (A–G) spanning finance, business, research, voice, approval, memory, system |
| UX invariants | 22 invariants (INV-01–INV-22) |
| Unresolved questions | 5 UX questions + 4 architectural + 1 security |
| UX-03 handoff | Complete specification in Section 35 |
| Documentation created | `docs/interface/UX-02-USER-TASK-MODEL.md` |
| Application changes | ZERO |
| Hard stop | ACTIVE — UX-03 requires explicit authorisation |
