# V-11-G PRE-IMPLEMENTATION RECONNAISSANCE
## INTELLIGENCE Experience Convergence

Date: 2026-09-01
Status: RECONNAISSANCE — no application code modified
Predecessor: V-11-F certified at commit `fb6ed1c`
Application code changed: NONE
Production: UNCHANGED (`dd1dd1f`)

Scope of this document: forensic audit of the three INTELLIGENCE-cluster destinations shipped in the current dashboard (`#page-intelligence`, `#page-memory`, `#page-knowledge`) plus the supporting API surface and library engines, evaluated against the locked V-11 experience contract (Section 7.4 / Part IX / Decision 10 / RD-3 / RD-2). Only one artefact is produced: this document.

Files inspected (path + role):
- `public/dashboard.html` (21,067 lines) — sole frontend surface
- `routes/intelligence.js` (15 endpoints) — briefing / opportunities / health / self-check / agent-runs / cost-summary / news / voice-status / interrupt
- `routes/intelligence-memory.js` (32 endpoints) — retrieval, decisions, contradictions, learning, skills, graph
- `routes/memory.js` (48 endpoints) — working / episodic / semantic / procedural / strategic / skill / decision / consolidation / reflexion / improvements / health
- `routes/knowledge.js` (9 endpoints) — assess / requirements / gaps / stats / items / state
- `routes/knowledge-graph.js` (10 endpoints) — KG nodes/edges/subgraph
- `lib/intelligence/sie.js` (`generateExecutiveBriefing`), `lib/intelligence/civilization-health-engine.js`, `lib/intelligence/opportunity-engine.js`
- `lib/knowledge/knowledge-gap-engine.js` (`queryGaps`, `getGapStats`, `declareRequirement`, `assessKnowledgeRequirements`)
- `docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md` §7.4, Part IX, Part XIII
- `docs/interface/V-11-DESIGN-DECISIONS.md` Decision 10
- `docs/interface/V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md` §6, §7, §8
- `docs/interface/V-11-F-IMPLEMENTATION-CERTIFICATION.md`, `V-11-E-IMPLEMENTATION-CERTIFICATION.md`

---

## SECTION 1: EXECUTIVE SUMMARY

The three destinations that are meant to answer the user's canonical questions ("What does APEX know? / remember? / think?") exist as separate pages (`#page-intelligence` at line 10385, `#page-memory` at line 10444, `#page-knowledge` at line 10325) and are all functional at the wire level, but none of them meet the V-11 Experience Contract:

**Top-line finding:** All three surfaces are **structurally certified** (nav-btns present, refresh handlers wired, API endpoints responding) yet **experientially non-compliant**. Each surface leaks internal vocabulary (`CONFLICTING`, `DEGRADED`, `AGENT_RUNS`, `apex_agent_runs`, `evidence_refs`, `roi_forecast`), presents no L0→L4 progressive disclosure model, exposes raw scores (`Score: 87`, `78%`) directly at L0 instead of the canonical `● High` dot+label (Decision 10), and offers **zero evidence traceability** for any intelligence claim. The Intelligence page does not synthesize across LIFE & WORK domains as required by §7.4; it renders a system-oriented briefing sourced from `sie.js` that reads more like a founder pep-talk than a per-domain intelligence lens.

**Top 3 critical (P0) issues:**

1. **Privacy boundary violation risk on `#page-memory`.** `routes/memory.js` line 74 (`/memory/episodic/recent`) has NO `human_id` filter and no role gating beyond `app-auth`; the frontend at line 20749 calls this endpoint unconditionally for both roles. Any User account can therefore read Master's episodic memory content via this endpoint, contradicting RD-3 Layer 3 (`§8.1` — "Episodic memory: Owner only (Master emergency: Layer 5)"). The "Read-only surface" boundary note at line 10496 is aesthetic; enforcement does not exist.
2. **`intelligence-memory.js` `/intelligence/health` collision (route ordering).** Both `routes/intelligence.js` line 592 AND `routes/intelligence-memory.js` line 402 register `GET /intelligence/health`. Under Express flat-mount order, one silently shadows the other. Frontend `_intLoadHealth` at line 20637 calls `/api/intelligence/health` and treats the response as the civilization-health-engine schema (`d.classification`, `d.dimensions`, `d.score`); if `intelligence-memory.js` mounts first the shape is different and the page displays "Health data unavailable".
3. **`#page-intelligence` does not answer the user's questions.** The page renders three panels — Strategic Briefing (line 10397, 6 founder-scoped fields from LLM), Civilization Health bars (line 10411), and Opportunities (line 10424) — but is silent on: What does APEX know? What has APEX learned? What has changed? What evidence supports this? Where are the knowledge gaps? Every one of the 16 canonical intelligence questions from §7.4 is either PARTIALLY answered or NOT answered (see Section 22). It functions as a system-health screen with a founder-briefing header, not the "analytical lens on the world and on the user" that §7.4 defines.

**Overall assessment:** V-11-G is a substantial UX rebuild (not a refinement pass). The three destinations must converge into a coherent user-facing intelligence experience organised around the canonical questions, with L0→L4 disclosure, Decision 10 confidence indicators, evidence trails, and a bright privacy boundary between Master and User memory content. The backend API surface is largely present but has 2 route collisions, 3 endpoints that need role/human_id gating, and no unified "evidence bundle" schema — those are documented as backend authorisation gates (Section 36), not implemented in this phase.

---

## SECTION 2: CURRENT INTELLIGENCE ARCHITECTURE

**Container:** `#page-intelligence`, `public/dashboard.html:10385–10441`

**Structure (verbatim summary, line-cited):**
- Page header (10386–10394): title "INTELLIGENCE" (letter-spacing 7px), subtitle "BRIEFING · OPPORTUNITIES · HEALTH", single `↻ Refresh` button (`data-fn="intelligenceRefresh"`).
- Panel 1 (10397–10409) "Strategic Briefing": container `#intBriefingPanel`, age indicator `#intBriefingAge`.
- Panel 2 (10411–10422) "Civilization Health": dot `#intHealthDot`, score `#intHealthScore`, body `#intHealthPanel`.
- Panel 3 (10424–10435) "Detected Opportunities": counter `#intOppsCount`, list `#intOppsList`.
- Boundary note (10436–10439): "Intelligence boundary: KNOWN → INFERRED → INTERPRETED → RECOMMENDED → PROPOSED → APPROVAL REQUIRED → ACTION."

**JS handlers (`public/dashboard.html`):**
- `_intLoadBriefing()` — line 20601, calls `GET /api/intelligence/briefing`, renders 6 fields (biggest_opportunity, biggest_threat, biggest_bottleneck, highest_leverage_action, strategic_focus_this_week, strategic_focus_this_month).
- `_intLoadHealth()` — line 20632, calls `GET /api/intelligence/health`, renders classification dot + score + per-dimension bars.
- `_intLoadOpportunities()` — line 20661, calls `GET /api/intelligence/opportunities?limit=15`, renders opportunity cards with `composite_score`.
- `intelligenceRefresh()` — line 20685, orchestrates all three.
- Page switch hook — line 20884, calls `intelligenceRefresh()` on entry.
- Nav entry — line 10658, group "INTELLIGENCE".

**Data source flow:**
- `/api/intelligence/briefing` → `lib/intelligence/sie.js::generateExecutiveBriefing()` — 6h cache, LLM-generated from Promise.allSettled of `analyzeOpportunities`, `analyzeThreats`, `detectBottlenecks`, `analyzeGoals`, `founder-graph`, `empire-graph`, `executive-performance-engine`.
- `/api/intelligence/health` → `lib/intelligence/civilization-health-engine.js::getLatest()` snapshot, falls back to `.compute()` (read-only).
- `/api/intelligence/opportunities` → `SELECT id,title,description,composite_score,status,roi_forecast,detected_at FROM opportunities WHERE status='detected' ORDER BY composite_score DESC LIMIT 15`.

**Per-question forensic (A–Z + tests):**

- **A. Purpose:** Ostensibly "APEX's analytical lens on the world and on the user" (§7.4). In practice: a system status report styled as a strategic briefing.
- **B. User-facing question:** No explicit framing; the panel headers are "Strategic Briefing", "Civilization Health", "Detected Opportunities" — none of which map to §7.4's L0 questions.
- **C. Data sources:** `/api/intelligence/briefing`, `/api/intelligence/health`, `/api/intelligence/opportunities?limit=15`.
- **D. API calls:** `_intLoadBriefing` (20601), `_intLoadHealth` (20632), `_intLoadOpportunities` (20661).
- **E. Loading behaviour:** Three `.skel skel-row` shimmer rows in each panel until fetch resolves. No timeout. No STALE state. No PARTIAL state.
- **F. Empty state:** Bespoke inline HTML: `'<div style="color:#8893a0;font-size:11px">No detected opportunities — run opportunity detection cycle to populate</div>'` (line 20670). Similar for briefing (20609) and health (20640). Not the V-11-B `setState('empty')` pattern.
- **G. Error behaviour:** `.catch(function() { el.innerHTML = '<div style="color:#ff4d6d;...">Briefing unavailable</div>' })` (lines 20629, 20658, 20682). Red inline text, no retry button, no failure reason surfaced.
- **H. Stale-data behaviour:** Briefing shows "Generated Xh ago · 6h cache" via `_timeAgo(b.generated_at)` (line 20613). Health shows nothing about staleness. Opportunities show nothing.
- **I. Role behaviour:** No `apex-master-only` class on `#page-intelligence` or `#nav-intelligence` (line 10658). Both Master and User see identical content, including the executive briefing that is entirely Master-scoped ("founder of APEX AI OS", "empire foundation", "financial and scheduling freedom" — see `sie.js:640`).
- **J. Visual hierarchy:** Three panels of equal weight, no L0/L1/L2 disclosure. Panel headers use `.t-label`.
- **K. Typography:** Page title uses `.ds-page-title` at 7px letter-spacing. Subtitle uses inline `font:500 11px/1 'JetBrains Mono',monospace`. Panel field labels at 9px uppercase (line 20624). Value text at 11px `rgba(232,244,255,0.85)` (line 20625). Health dim label at 10px (line 20650).
- **L. Technical vocabulary leakage:** "Civilization Health" (LOCKED as SYSTEM-side, not user surface); the boundary note enumerates `KNOWN → INFERRED → INTERPRETED → RECOMMENDED → PROPOSED → APPROVAL REQUIRED → ACTION` (line 10438) — pipeline vocabulary that no user needs; "Detected Opportunities"; "composite_score" (rendered as "Score: 87" at line 20676); classification strings `thriving`, `degraded`, `critical` uppercased directly (line 20643).
- **M. Confidence presentation:** ABSENT. No confidence dot on any briefing field, health dimension, or opportunity. Decision 10 not implemented on this surface.
- **N. Evidence presentation:** ABSENT. Opportunities carry `evidence_refs` in the API response (`routes/intelligence.js:577` `roi_forecast?.evidence_refs`) but the frontend at line 20671 never reads or renders them. No source citation. No timestamp on individual claims.
- **O. Action affordances:** ONE button (`↻ Refresh`). No "Act on this", no "Explain more", no "Approve/Reject/Defer", no L1 expansion. Opportunities are read-only display; users cannot escalate a detected opportunity to a task, an approval, or a COMMAND question.
- **P. Progressive disclosure:** NONE. Everything is flat L0. Descriptions are truncated to 200 chars (line 20678) with no "show more".
- **Q. Mobile behaviour (≤768px):** Panels stack in the default `flex-direction:column;gap:16px` layout. Health dimension row has `width:130px` label (line 20650) that could push out on 375px. Field label + value stacking is fine.
- **R. Desktop behaviour (≥1280px):** Panels remain single-column full-width; no multi-column layout leveraging horizontal real estate.
- **S. Duplicate UI patterns:** Panel structure (`.ds-panel > .ds-panel-header > .ds-panel-header-left > .ds-dot + .t-label`) is shared across many pages — that is correct token reuse. However, the "list of items with inline right-edge score badge" is duplicated across intelligence opportunities, knowledge items (20509), and knowledge gaps (20578) with subtly different colours/CSS — an opportunity for a shared `apex-intel-card` primitive.
- **T. Terminology inconsistencies:** "Intelligence" (page title), "Strategic Briefing" (panel 1), "Civilization Health" (panel 2), "Detected Opportunities" (panel 3), "Intelligence boundary" (footer). Section §7.4's canonical labels are "BRIEFING", "OPPORTUNITIES", "WHAT APEX KNOWS", "WHAT APEX REMEMBERS", "LESSONS" — the current page implements 2 of 5. "Civilization Health" is unique to this page and appears nowhere in §7.4.
- **U. Dead/legacy UI:** The 6-line boundary note (10436–10439) is dead prose; it explains a pipeline that has no interactive expression on the page.
- **V. Inline style/token violations:** Ubiquitous. The container div uses `style="display:flex;flex-direction:column;gap:16px;margin-top:18px"`; every rendered card uses inline styles (lines 20623, 20649, 20673). No `apex-` tokens.
- **W. Polling:** NONE on this page (verified against the `setInterval` grep — none of the 25+ intervals reference intelligence).
- **X. WebSocket opportunities:** Briefing generation, opportunity detection, health snapshot changes — all currently require a manual `↻ Refresh` click. WS push on briefing regeneration and new opportunity detection would replace the stale-6h-cache experience.
- **Y. Accessibility:** `↻ Refresh` button lacks `aria-label`. Skeleton loading rows have no `aria-busy`. Opportunity cards have no keyboard interaction. No landmark roles.
- **Z. User comprehension risks:** (1) "Civilization Health 87/100 · THRIVING" — a first-time user has no idea what "civilization" refers to (it's the APEX system, not their life). (2) "Score: 87" on opportunities with no unit or explanation. (3) Briefing writes about "empire" and "founder" — Users who are not Master will read misdirected content. (4) The KNOWN→INFERRED→...→ACTION boundary note is opaque without prior training.

**FIVE-SECOND TEST:** A new user sees three panels of text with score numbers, doesn't understand what "Civilization Health" is, doesn't know why the "Strategic Briefing" is about empires and founders when they are just using APEX.

**THIRTY-SECOND TEST:** Should enable: "Tell me the most important thing APEX has learned about me/my domains this week, with evidence, and let me act on it." Currently enables: reading three fixed-shape panels with no action pathway.

**HIDDEN INFO:** Should hide (until L2+): raw score numbers, classification codes, per-dimension bars, LLM prompt provenance, pipeline vocabulary. Should surface (L0): one-sentence "APEX noticed…" + confidence dot + one action.

---

## SECTION 3: CURRENT MEMORY ARCHITECTURE

**Container:** `#page-memory`, `public/dashboard.html:10444–10500`

**Structure:**
- Header (10445–10451): title "MEMORY" (7px), subtitle "EPISODIC · SEMANTIC · HEALTH", `↻ Refresh` cyan button (`data-fn="memoryRefresh"`).
- Panel 1 (10454–10465) "Memory Health": dot `#memHealthDot`, ts `#memHealthTs`, body `#memHealthPanel` (2-col grid).
- Panel 2 (10467–10478) "Recent Episodes": counter `#memEpisodicCount`, scrollable list `#memEpisodicList` (max-height 280px).
- Panel 3 (10480–10494) "Semantic Facts": search input `#memSemanticSearch`, counter `#memSemanticCount`, list `#memSemanticList` (max-height 280px).
- Boundary note (10495–10498): "Read-only surface: Correction and deletion of memory records are not yet available in this interface. This view is inspection-only."

**JS handlers:**
- `_loadMemoryHealth()` — line 20718, `GET /api/memory/health`, renders 4 tiles (Episodic count, Consolidation pending, Reflexion unverified, Improvements pending).
- `_loadMemoryEpisodic()` — line 20745, `GET /api/memory/episodic/recent` (no `limit` query param but backend defaults to 20), renders episode summaries with OK/FAIL badges.
- `_loadMemorySemantic(q)` — line 20772, `GET /api/memory/semantic/search?q=...&limit=20` — **NOTE:** `/memory/semantic/search` REQUIRES `q` (line 100 of `routes/memory.js`: `if (!q) return res.status(400)`). On first page load without a query, backend returns 400 and the frontend catch shows "Semantic memory unavailable". This is a live defect.
- `memoryRefresh()` — line 20799.
- `memorySearch()` — line 20804 (called via `oninput` at line 10487 — CSP inline handler; may be blocked by CSP).
- Nav entry — line 10662.

**Per-question forensic:**

- **A. Purpose:** UX-15 memory inspection (read-only). Advertised as episodic/semantic/health.
- **B. User-facing question:** None stated. Panels labelled by memory type (technical vocabulary).
- **C. Data sources:** `/api/memory/health`, `/api/memory/episodic/recent`, `/api/memory/semantic/search`.
- **D. API calls:** `_loadMemoryHealth` (20718), `_loadMemoryEpisodic` (20745), `_loadMemorySemantic` (20772).
- **E. Loading behaviour:** `.skel skel-row skel-wide` shimmer. No timeout.
- **F. Empty state:** `'<div style="color:#8893a0;font-size:11px">No episodic memories recorded</div>'` (line 20753). Bespoke.
- **G. Error behaviour:** `'Memory health unavailable'` / `'Episodic memory unavailable'` / `'Semantic memory unavailable'` (lines 20741, 20768, 20795). No retry button, no diagnosis. Semantic memory will PERSISTENTLY fail on load because `q` is required.
- **H. Stale-data behaviour:** Health panel sets `tsEl.textContent = 'now'` (line 20725) — literally the string "now", not a real timestamp. Episodic items show `_timeAgo(ts)` per-entry. Semantic items show nothing.
- **I. Role behaviour:** **CRITICAL — see P0 finding.** No `apex-master-only` class on `#page-memory` or `#nav-memory`. Both roles see the same content. `/memory/episodic/recent` returns whatever `episodicMemory.getRecent(20)` returns — no `human_id` filter is applied at the route level. See `routes/memory.js:74–77`. RD-3 §8.1 requires Episodic to be "Owner only (Master emergency: Layer 5)".
- **J. Visual hierarchy:** Three panels equal weight, no L0. Health uses 2-col grid; episodic/semantic are vertical lists.
- **K. Typography:** Page title 7px letter-spacing. Health tile labels 9px uppercase; values 11px semibold. Episode summary 11px `rgba(232,244,255,0.8)`. Search input 11px JetBrains Mono.
- **L. Technical vocabulary leakage:** "Episodic", "Semantic", "Consolidation pending", "Reflexion unverified", "Improvements pending", "consolidation.queue", "reflexion.unverified" (line 20729). Every panel label is a raw memory-layer name from the seven-layer memory system. §9.1 of the spec explicitly requires these labels be mapped to human-visible concepts ("APEX remembers…", "APEX knows that…").
- **M. Confidence presentation:** Semantic facts show `Math.round(f.confidence * 100) + '%'` (line 20784) as raw percentage in cyan. **Violates Decision 10** — should be `● High` dot + one-word label.
- **N. Evidence presentation:** Semantic facts show `f.category` and `f.domain` only. No source, no timestamp, no evidence chain. Episodic items show `success: true/false` as OK/FAIL badge — a technical indicator, not evidence. §9.5 evidence provenance chain (Source / Timestamp / Confidence / Freshness) is 25% implemented (only Timestamp on episodic).
- **O. Action affordances:** ONE button (`↻ Refresh`) + search input. Boundary note explicitly states edit/delete not implemented. RD-3 §8.2 requires Users to be able to (a) view episodic memory list, (b) delete individual entries, (c) request "forget everything". Currently 1/3.
- **P. Progressive disclosure:** NONE. Everything is flat L0. Episode summaries truncated to 120 chars (line 20761), facts to 160 (line 20787), no expansion.
- **Q. Mobile ≤768px:** Health uses `grid-template-columns:repeat(2,1fr)` — fine at 375px. Search input at 160px width may crowd on narrow. `max-height:280px` scroll containers work but obscure content depth.
- **R. Desktop ≥1280px:** Single-column full-width; wastes horizontal real estate. No multi-column memory browser.
- **S. Duplicate UI patterns:** Search-inside-panel-header pattern duplicated with knowledge search (line 10358). List-of-items-with-metadata duplicated across all three surfaces.
- **T. Terminology inconsistencies:** "Memory Health" (this page) vs "Memory technical health: counts, health scores" (SYSTEM per §7.6). Duplicate concept, different location. "Recent Episodes" vs `episodicMemory` vs "memories" in the spec.
- **U. Dead/legacy UI:** The "Read-only surface" boundary note (10495–10498) declares functionality absent — this is graceful but confirms the surface is incomplete.
- **V. Inline style violations:** Every element uses inline styles. `oninput="if(typeof memorySearch==='function')memorySearch()"` (line 10487) is an inline handler — likely to be blocked by CSP (V-11-A event dispatcher pattern is `data-fn`).
- **W. Polling:** NONE.
- **X. WebSocket opportunities:** New episodic memory writes, consolidation completion, contradiction detection — all silent to this UI. WS push would keep Health tile counts live.
- **Y. Accessibility:** Refresh button lacks `aria-label`. Search input has `placeholder` but no `<label>`. Skeleton has no `aria-busy`. Scroll containers have no `role="region"`.
- **Z. User comprehension risks:** Every panel label is technical. "Reflexion unverified" is meaningless to a non-engineer. A User who reads Master's `episodic_memory: 95 records` will see it — but not the content (only counts) — yet the boundary between "count OK" and "content restricted" is undocumented in the UI. A first-time User cannot tell what memory is theirs vs shared vs Master-only.

**FIVE-SECOND TEST:** User sees "Memory · Episodic · Semantic · Health" — no idea what any of those mean or how they relate to "what APEX remembers about me".

**THIRTY-SECOND TEST:** Should enable: "Show me what APEX remembers about me from this week; correct anything wrong; delete anything I don't want kept." Currently enables: viewing counts and searching semantic pool.

**HIDDEN INFO:** Should hide: layer names (episodic/semantic/procedural/etc), pending counts, technical badges. Should surface: "APEX remembers ~N things about you from the past 30 days" + timeline + edit/delete affordances.

---

## SECTION 4: CURRENT KNOWLEDGE ARCHITECTURE

**Container:** `#page-knowledge`, `public/dashboard.html:10325–10382`

**Structure:**
- Header (10326–10334): title "KNOWLEDGE" (7px), subtitle "FACTS · EVIDENCE · GAPS · COVERAGE", `↻ Refresh` (`data-fn="knowledgeRefresh"`).
- Panel 1 (10337–10348) "Coverage State": classification badge `#knCoverageClassification`, stats row `#knCoverageStats`.
- Panel 2 (10350–10367) "Knowledge Items": search input `#knSearchInput`, counter `#knItemCount`, list `#knItemList`.
- Panel 3 (10369–10380) "Open Knowledge Gaps": counter `#knGapCount`, list `#knGapList`.

**JS handlers:**
- `_knRenderItem(item)` — line 20502, produces per-item card with `knowledge_state` (FULLY_KNOWN/PARTIALLY_KNOWN/CONFLICTING/UNKNOWN), `confidence_tier` (VERY HIGH/HIGH/MEDIUM/LOW/UNCERTAIN/UNKNOWN), category, source, contradiction_count.
- `_knLoadItems(q)` — line 20521, `GET /api/knowledge/items?limit=30` or `?q=...&limit=30`.
- `_knLoadState()` — line 20537, `GET /api/knowledge/state`, renders 5 stat tiles (Total gaps, Open, Blocking, In resolution, Resolved).
- `_knLoadGaps()` — line 20566, `GET /api/knowledge/gaps?status=OPEN&limit=20`, renders gap rows with BLOCKING badge, `gap_type`, `domain_id`.
- `knowledgeRefresh()` — line 20590.
- `knowledgeSearch()` — line 20593.
- Nav entry — line 10666.

**Per-question forensic:**

- **A. Purpose:** UX-11 knowledge surface — facts, evidence, gaps, coverage.
- **B. User-facing question:** "What does APEX know?" (implicit — never stated on the page).
- **C. Data sources:** `/api/knowledge/items`, `/api/knowledge/state`, `/api/knowledge/gaps?status=OPEN`.
- **D. API calls:** `_knLoadItems` (20521), `_knLoadState` (20537), `_knLoadGaps` (20566).
- **E. Loading behaviour:** Skeleton rows.
- **F. Empty state:** `'No knowledge items found'` (20531), `'No open gaps'` (20575). Bespoke.
- **G. Error behaviour:** `'Failed to load knowledge items'`, `'State unavailable'`, `'Gaps unavailable'` (20534, 20563, 20587). No retry.
- **H. Stale-data behaviour:** NONE. Knowledge state has `ts` in the response (see `routes/knowledge.js:189`) but the frontend doesn't render it.
- **I. Role behaviour:** No role gating on page container or nav. Semantic memory is shared per RD-3 §8.1, so this is arguably correct for `items`; however, `knowledge_gaps` table has no Layer-3 boundary — Master's private gaps would leak to Users.
- **J. Visual hierarchy:** Three panels of equal weight, no L0.
- **K. Typography:** Standard page-title pattern. Coverage stats use large 18px value + 9px uppercase label (line 20558). Item cards use 11px, tier text 9px.
- **L. Technical vocabulary leakage:** Uppercase enums shown raw: `FULLY_KNOWN`, `PARTIALLY_KNOWN`, `CONFLICTING`, `UNKNOWN`, `VERY HIGH`, `UNCERTAIN` (line 20510, 20514), `SUFFICIENT`, `PARTIAL`, `DEGRADED`, `BLOCKED` (20545), `BLOCKING` (20577), `required_subject`, `gap_type`, `domain_id` (20580, 20581), "In resolution" (20554). Every one of these is a backend enum surfaced unmapped.
- **M. Confidence presentation:** Text-only tier label ("Confidence: HIGH") in tier colour (20514). Missing the dot. Missing the sentence context. Partially aligned with Decision 10 but not the canonical `● High + one-word` format.
- **N. Evidence presentation:** Each item shows `item.source` (20515) as a string ("Unknown — evidence not traced" fallback). `contradiction_count` shown as `⚠ 2 contradictions` (20516). No timestamp, no drill-down, no source URL, no "why does APEX believe this".
- **O. Action affordances:** ONE button + search. No fact-detail expansion. No gap-action ("Investigate", "Assign to agent", "Mark resolved"). No "APEX could research this" CTA on empty results.
- **P. Progressive disclosure:** NONE. Item title truncated with ellipsis; no expansion to L1/L2.
- **Q. Mobile ≤768px:** Coverage stats use `flex-wrap:wrap` — will stack correctly. Item rows use `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` — will fit but truncate hard.
- **R. Desktop ≥1280px:** Single column; the §7.4 spec calls for "Domain coverage bars" (Business/University/Health/Finance percentages) which is NOT implemented — this page shows aggregate gap counts, not per-domain coverage.
- **S. Duplicate UI patterns:** Item cards resemble intelligence opportunity cards. Coverage state tiles resemble governance status tiles (line 20825).
- **T. Terminology inconsistencies:** "Knowledge Items" (this page) vs "Facts" (subtitle) vs `semantic memory` (backend) — three names for the same thing.
- **U. Dead/legacy UI:** `item.source || 'Unknown — evidence not traced'` fallback (20515) — always fires because `semantic_memory` rarely records source; the string implies a bug not a feature.
- **V. Inline style violations:** Every card constructed via inline-styled string concatenation.
- **W. Polling:** NONE.
- **X. WebSocket opportunities:** New gaps declared, gaps resolved, contradictions detected — silent. Live push would show gap-count changes.
- **Y. Accessibility:** No `aria-label` on refresh, no `<label>` on search, no landmark roles, tier-colour dots have no `aria-hidden`.
- **Z. User comprehension risks:** "SUFFICIENT" vs "BLOCKED" tells users nothing about what to do. "Open gaps: 47" is context-free — 47 of what, out of how many possible? "gap_type: EVIDENCE_MISSING" is a raw enum. Users cannot distinguish knowledge that pertains to them vs shared system knowledge.

**FIVE-SECOND TEST:** User sees "KNOWLEDGE · FACTS · EVIDENCE · GAPS · COVERAGE" and three panels — mostly interpretable in the abstract but no clear "this is what APEX knows about YOU vs about the world".

**THIRTY-SECOND TEST:** Should enable: "Show me what APEX confidently knows about each of my domains, where the gaps are, and give me one action to close the most important gap." Currently enables: browsing a raw fact list and gap enum count.

**HIDDEN INFO:** Should hide: enum names, backend fact IDs, gap types. Should surface: domain coverage bars (per §7.4), "recent facts" in human sentences with confidence dots, top gaps with one-tap "investigate" action.

---

## SECTION 5: CURRENT USER EXPERIENCE

Combined 5-second and 30-second tests across all three surfaces (per-surface tests are in §2, §3, §4).

**A Master lands on INTELLIGENCE:** sees Strategic Briefing about "empire" and "founder" — this is coherent because they ARE the founder. Sees Civilization Health 87/100 — no idea what "civilization" means (it's the APEX platform). Sees Detected Opportunities with score numbers. Concludes: "This is a system dashboard."

**A User lands on INTELLIGENCE:** sees Strategic Briefing about "empire" and "founder" — this is misdirected content. The RD-3 §6.1 Layer boundary is not enforced at the content level; the SIE briefing prompt is Master-oriented (`sie.js:640`). User concludes: "This isn't for me" or worse, is confused about the product's purpose.

**Either role lands on MEMORY:** sees "Episodic · Semantic · Health" and four tile counts, then an episode list of technical strings ("APEX handled a voice request") or objectives. §9.3 memory-translation-rules are NOT applied. The most sensitive privacy boundary in the entire product has zero user-facing enforcement.

**Either role lands on KNOWLEDGE:** sees three panels of raw enums. Most navigable of the three but still requires background knowledge (what is "gap_type", what does "SUFFICIENT" mean).

**Cross-surface reality:** All three surfaces expose the same "list of things with a score/tier/badge" pattern. None ask "what do you want to know?"; all present "here's what we have". None connect: an opportunity on Intelligence cannot be linked to the facts on Knowledge that support it, or the memories on Memory that generated it.

---

## SECTION 6: CURRENT DATA FLOWS

**Intelligence page load sequence (on nav to `#page-intelligence`):**
1. `window.switchPage('intelligence')` (line 10745, `_origSwitch2` proxy at 20877).
2. `intelligenceRefresh()` fires (line 20884).
3. Three parallel fetches: `_intLoadBriefing`, `_intLoadHealth`, `_intLoadOpportunities`.
4. Each renders directly to its container via `.innerHTML`.
5. NO error surfacing beyond text; no `setState()`; no `_apexIntervals` polling.

**Memory page load sequence:**
1. `switchPage('memory')` → `memoryRefresh()` (line 20885).
2. `_loadMemoryHealth`, `_loadMemoryEpisodic`, `_loadMemorySemantic('')` fire.
3. `_loadMemorySemantic('')` will 400 at the backend because `q` is empty and route requires it; frontend catches and shows "unavailable" — a persistent broken initial state.

**Knowledge page load sequence:**
1. `switchPage('knowledge')` → `knowledgeRefresh()` (line 20883).
2. `_knLoadState`, `_knLoadItems('')`, `_knLoadGaps` fire.
3. `_knLoadItems('')` at `/knowledge/items?limit=30` — semantic_memory.search with empty q returns all up to limit.

**Rendering pipeline:** For all three surfaces the pattern is identical: `fetch → JSON → check `d.ok` → build HTML string with inline styles → assign to `element.innerHTML``. No React-like reconciliation, no XSS escaping on user-supplied fact text (see §17 defects).

---

## SECTION 7: CURRENT API INVENTORY

| Endpoint | Method | Auth | Backend source | Returns | Used by frontend | Notes |
|---|---|---|---|---|---|---|
| `/api/intelligence/briefing` | GET | `requireAppAccess` | `sie.js::generateExecutiveBriefing` | `{ok, briefing:{biggest_opportunity, biggest_threat, biggest_bottleneck, highest_leverage_action, strategic_focus_this_week, strategic_focus_this_month, generated_at, data_inputs, executive_performance?}}` | `_intLoadBriefing` (20605) | 6h cache; LLM-generated; NO role scoping; content is Master/founder-oriented |
| `/api/intelligence/opportunities` | GET | `requireAppAccess` | `opportunities` table | `{ok, opportunities:[{id,title,description,composite_score,status,evidence_refs,created_at,roi_forecast}], count}` | `_intLoadOpportunities` (20665) | `evidence_refs` extracted but frontend ignores |
| `/api/intelligence/health` | GET | `requireAppAccess` | `civilization-health-engine::getLatest` | `{ok, source, score, classification, dimensions, alerts, snapshot_at}` | `_intLoadHealth` (20637) | **COLLISION** with same route in `intelligence-memory.js:402` |
| `/api/intelligence/self-check` | GET | `requireAppAccess` | Inline diagnostics | Health report of ~10 subsystems | `#page-system` self-check (20335) | Not used by INTELLIGENCE page |
| `/api/intelligence/agent-runs` | GET | `requireAppAccess` | `apex_agent_runs` | `{ok, runs:[{task_id, objective, success, cost_usd, complexity, created_at}]}` | Used by many other panels (14315, 15530, 15562, 16006 etc.) but not by `#page-intelligence` | |
| `/api/intelligence/cost-summary` | GET | `requireAppAccess` | `apex_agent_runs` last 1000 | `{ok, totalRuns, successRate, totalCostUsd, byComplexity}` | Various cost panels | Not on INTELLIGENCE page |
| `/api/intelligence/news` | GET | `requireAppAccess` | `apex_news_cache` | `{ok, articles:[]}` | line 15618 | Not on INTELLIGENCE page |
| `/api/intelligence/lessons` | GET | `requireAppAccess` | Obsidian memory | `{ok, lessons:[string]}` | line 14342 | §7.4 requires "LESSONS 7 lessons · 3 applied today" panel — endpoint exists but is NOT wired to `#page-intelligence` |
| `/api/memory/health` | GET | `app-auth` (router-wide) | `episodic/consolidation/reflexion/improvement Promise.allSettled` | `{ok, data:{episodic, consolidation, reflexion, improvement}}` | `_loadMemoryHealth` (20723) | No `human_id` filter |
| `/api/memory/episodic/recent` | GET | `app-auth` | `episodicMemory.getRecent(limit)` | `{ok, data:[episodes]}` | `_loadMemoryEpisodic` (20749) | **NO `human_id` FILTER — Layer 3 leak risk** |
| `/api/memory/semantic/search` | GET | `app-auth` | `semanticMemory.search(q, opts)` | `{ok, data:[facts]}` | `_loadMemorySemantic` (20777) | Requires `q` — frontend calls with empty string on initial load → 400 |
| `/api/knowledge/items` | GET | `app-auth` | `semanticMemory.search` + tier derivation | `{ok, items:[{...fact, knowledge_state, confidence_tier}], count}` | `_knLoadItems` (20526) | Shared pool (correct); no role filter |
| `/api/knowledge/state` | GET | `app-auth` | `kge.getGapStats` + classification derivation | `{ok, classification, stats:{total, open, blocking, in_resolution, resolved}, ts}` | `_knLoadState` (20541) | |
| `/api/knowledge/gaps` | GET | `app-auth` | `kge.queryGaps` | `{ok, gaps:[{gap_id, required_subject, gap_type, domain_id, status, blocks_decision, ...}], count}` | `_knLoadGaps` (20570) | No Layer-3 boundary on `knowledge_gaps` table |
| `/api/knowledge/requirements/*` | GET/POST | `app-auth` | `kge.*` | Requirement CRUD + lifecycle audit | NOT USED by frontend | Available for future use |
| `/api/knowledge/assess` | POST | `app-auth` | `kge.assessKnowledgeRequirements` | Assessment | NOT USED | |
| `/api/knowledge/gaps/:id/resolve` | POST | `app-auth` | `kge.attemptResolution` | Resolution result | NOT USED | Would enable gap-resolution UX |
| `/api/knowledge-graph/*` | | `app-auth` | KG node/edge ops | Graph traversal | Some usage in Reality/Civilisation | Cross-domain intel could leverage |
| `/api/intelligence-memory/*` (32 endpoints) | | `app-auth` | Various libs | Retrieval, decisions, contradictions, learning, skills, graph | NOT USED on `#page-intelligence` | Massive latent capability |

**Auth model:** All routes use `requireAppAccess` (X-App-Key header). NO route in this cluster enforces role (Master vs User) or `human_id` scoping. Privacy boundaries are effectively unenforced at the API layer.

---

## SECTION 8: CURRENT STATE HANDLING

**V-11-B `setState()` adoption on these three surfaces: 0%.**

Every panel uses the bespoke `element.innerHTML = '<div style="color:...;font-size:11px">...</div>'` pattern. Grep of `setState(` shows 30+ call sites elsewhere (TODAY, LIFE & WORK, COMMAND) but ZERO in the intelligence/memory/knowledge sections (verified against lines 20500–20800).

**Bespoke patterns catalogued (line-cited):**

- Loading: `<div class="skel skel-row skel-wide"></div>` skeleton rows are static in HTML (10346, 10363, 10365, 10366, 10378, 10406, 10407, 10420, 10433, 10463, 10476, 10492). Not driven by `setState('loading')`.
- Empty: raw `<div style="color:#8893a0;font-size:11px">Text</div>` (20531, 20575, 20670, 20753, 20781).
- Error: raw `<div style="color:#ff4d6d;font-size:11px">Text</div>` (20534, 20563, 20587, 20609, 20629, 20658, 20670, 20682, 20741, 20768, 20795).
- Stale: NOT IMPLEMENTED — no TTL awareness on any of the three surfaces (only briefing shows generated_at).
- Partial: NOT IMPLEMENTED — `_loadMemoryHealth` uses `Promise.allSettled` but silently drops failures rather than surfacing "N of 4 unavailable".
- No_results (query): distinct from empty; not implemented — `_loadMemorySemantic` on non-matching query shows "No matching facts" (same style as empty).
- Permission_restricted: NOT IMPLEMENTED.

**Consequence:** Retry buttons are absent everywhere. Failures require the user to know to click `↻ Refresh` at the page level (which re-triggers all three panels). No per-panel retry.

---

## SECTION 9: CURRENT EVIDENCE MODEL

**Evidence representation status: absent.**

- **Intelligence briefing:** No evidence — LLM-generated strings only. Response includes `data_inputs:{opportunities:N, threats:N, bottlenecks:N, goals:N}` (sie.js:682) — count of inputs, not the inputs themselves.
- **Intelligence opportunities:** Backend RETURNS `evidence_refs` (extracted from `roi_forecast.evidence_refs` at `routes/intelligence.js:577`); FRONTEND IGNORES it (line 20671 renders only title/score/description).
- **Intelligence health:** Dimensions include `label` and `score`; no evidence per dimension.
- **Memory episodic:** Renders `summary/content/objective/description` first-match; no source attribution, no upstream link.
- **Memory semantic:** Renders `fact`, `confidence`, `category/domain`; NO source field is displayed even when present in the underlying record.
- **Knowledge items:** Displays `item.source` when present (20515) — this is the only surface with any evidence field, and it fallbacks to "Unknown — evidence not traced".
- **Knowledge gaps:** No evidence fields; renders `required_subject`, `gap_type`, `domain_id` — the gap ITSELF is evidence of what's missing.

**Traceability status:** A user cannot trace any intelligence claim back to its source anywhere on these three surfaces. No expansion, no drill-down, no cross-surface link. §9.5's requirement "Every fact, memory, and recommendation in APEX has a provenance chain: Source / Timestamp / Confidence / Freshness" is NOT met.

**Timestamps:** Available for briefing (generated_at), episodic memory (created_at), knowledge_state (ts, but unused by UI). Not available on health dimensions, opportunities individually, semantic facts, or knowledge items.

**Sources named:** Only on `knowledge_items` (usually empty). Never on memory. Never on intelligence.

**Stale evidence detection:** None. No "verified [X] ago" indicator on individual facts.

**Inferred vs observed distinction:** The Intelligence boundary note (line 10438) enumerates KNOWN/INFERRED/INTERPRETED at the pipeline level but no individual item is tagged with which stage it came from.

---

## SECTION 10: CURRENT CONFIDENCE MODEL

**Where confidence data lives:**
- `semantic_memory` table has `confidence` as a float 0–1 (used by `_knRenderItem` and `_loadMemorySemantic`).
- `opportunities.composite_score` — integer 0–100 (rendered as "Score: 87").
- `civilization health` — score 0–100 + dimension percentages.
- `apex_agent_runs.success` — boolean.

**How it's currently expressed:**

| Surface | Data | Rendered as | Decision 10 compliant? |
|---|---|---|---|
| Knowledge items | `confidence: 0.7789` | Tier text (`Confidence: HIGH`) in tier-coloured font | PARTIALLY — has label + colour but no dot; not the canonical `● High` inline format; also uses 6 tiers (adds "VERY HIGH" and "UNCERTAIN") vs the 5 tiers in the spec |
| Semantic facts | `confidence: 0.78` | Raw percentage `78%` in cyan | NO — raw percentage banned by Decision 10 |
| Opportunities | `composite_score: 87` | Raw score `Score: 87` in cyan | NO — misuse of confidence pattern; "score" is not confidence but is presented similarly |
| Health dimensions | `score: 0..100` | Progress bar + percentage | NO — Decision 10 rejects progress bars for confidence |
| Briefing fields | none | none | N/A (would benefit) |
| Episodic memories | `success: true/false` | OK/FAIL badge | Not confidence but is the only "certainty" indicator |

**Decision 10 canonical format:** `● [colour dot] + [one-word label]` at L0; `● [dot] + [word] confidence — [explanation]` at L1. Five tiers (High/Good/Medium/Low/Very Low). None of the three surfaces implement this canonical pattern.

**Confidence trustworthiness:** `semantic_memory.confidence` is written by `semantic-memory.js::storeFact` and `.updateConfidence`; the writes come from various agents. `opportunities.composite_score` is engine-computed. Both should be trusted by the UI as authoritative but re-mapped to the tier vocabulary before rendering.

**Recommendation ownership:** Confidence mapping (0–1 → tier label) should live in one shared UI utility (`_apexConfidenceBadge(value)`), not be re-implemented per panel with slightly different thresholds. Currently `_knRenderItem` has one threshold table (20504–20506) and `_loadMemorySemantic` has none.

---

## SECTION 11: CURRENT KNOWLEDGE-GAP INTEGRATION

**Backend:** `lib/knowledge/knowledge-gap-engine.js` (25.1 KB, 11 exported functions). Table `knowledge_gaps` with columns including `gap_id, gap_type, gap_score, required_subject, domain_id, status, blocks_decision, resolution_notes, knowledge_ref, resolved_at, owner`.

**Routes exposed:** `GET /knowledge/gaps`, `GET /knowledge/state`, `GET /knowledge/stats`, `POST /knowledge/assess`, `POST /knowledge/requirements`, `POST /knowledge/requirements/:id/assess`, `GET /knowledge/requirements/:id/lifecycle`, `POST /knowledge/gaps/:id/resolve` (only 3 of these 8 are called by the frontend).

**Current frontend rendering (`_knLoadGaps` at 20566):**
```
[required_subject] [BLOCKING?]
[gap_type] · [domain_id]      [STATUS]
```
- Truncated to single line with ellipsis.
- No `gap_score` shown.
- No age (`created_at` in table).
- No `resolution_notes`.
- No `knowledge_ref` when resolved.
- No CTA — user cannot resolve, assign, defer, or ask APEX to research.

**Gap attributes available but unused:** `gap_score`, `urgency` (from requirements), `expected_resolution_at`, `resolution_notes`, `knowledge_ref`, gap-to-requirement lineage, gap-to-decision blocking chain.

**Cross-surface connection:** Knowledge gaps appear on `#page-knowledge` panel 3 only. They do not appear on `#page-intelligence` (which needs them per §7.4 "3 knowledge gaps →"). They do not appear on `#page-memory`. There is no cross-link from an intelligence briefing item that says "APEX doesn't know X" to the corresponding gap.

**UX gap analysis:**
- Users cannot see which gaps block which decisions (backend lineage exists).
- Users cannot see the "5 things APEX is currently trying to learn" active-investigation queue.
- Users cannot request an investigation ("APEX, please research this gap").
- Empty gap list produces `'No open gaps'` — no positive framing ("APEX has full coverage of…").

---

## SECTION 12: CURRENT MEMORY GOVERNANCE

**Memory Gateway / layer inventory (from `lib/memory/index.js`):** working, episodic, semantic, procedural, strategic, skill, decision, consolidation, reflexion, improvement.

**Layer ownership per RD-3 §8.1:**
| Layer | Owner | Read | Write | Delete | Currently enforced in API? |
|---|---|---|---|---|---|
| Working | Session | Session only | Session only | Session | Route-scoped by `:sessionId` — OK |
| Episodic | Human | Owner only | Owner+agents | Owner (Master hard-delete) | **NO — `/memory/episodic/recent` has no `human_id` filter** |
| Semantic | System (shared) | All users | Master+agents | Master | Correct (shared) but no write-role check |
| Procedural | System (shared) | All users | Master+agents | Master | Same as semantic |
| Strategic | Master (private) | Master only | Master+Master-agents | Master | Layer NOT exposed via memory routes today (correct — but no defensive endpoint) |
| Skill | Per-human | Own + Master (aggregate) | Agents as human | Owner + Master | `/memory/skills` has no `human_id` scope |
| Decision | Per-actor | Own + Master (audit) | Agents as actor | Owner + Master | No scope on route |

**User controls on `#page-memory` (§8.2 required list):**
| Required capability | Present? |
|---|---|
| View list of episodic entries | Partially (last 20, no browse/paginate) |
| Delete individual episodic entries | NO — boundary note explicitly declares this deferred |
| "Forget everything" bulk delete | NO |
| View working memory for current session | NO — endpoint exists but not wired |
| See skills APEX has attributed to them | NO — `/memory/skills` not wired to this page |

**Master emergency-access UI:** F-11 (V-11-F) shipped a scaffold in SYSTEM → Emergency Access. There is no cross-link from `#page-memory` to that flow.

**`apex_chat_history_{humanId}` (V-11-E D7):** Chat history is stored in `localStorage` per identity — NOT via the memory API — and is NOT shown in Memory UI at all. This is a governance-visibility gap: users cannot review or delete their chat history from the Memory surface.

---

## SECTION 13: CURRENT ROLE BEHAVIOUR

**Master vs User differences across the three surfaces: NONE.**

Verified by DOM inspection:
- `#page-intelligence` (10385): no `apex-master-only` class.
- `#page-memory` (10444): no `apex-master-only` class.
- `#page-knowledge` (10325): no `apex-master-only` class.
- `#nav-intelligence` (10658), `#nav-memory` (10662), `#nav-knowledge` (10666): no `apex-master-only` class.
- `masterOnlyPages` array in `switchPage` (10747) contains only `['occult', 'civilisation', 'reality']`.

**Content implications:**
- User sees the founder-scoped Strategic Briefing produced by `sie.js` — content mismatch.
- User sees Civilization Health of the APEX platform — arguably legitimate for a User to see APEX is healthy, but the numbers and dimensions are Master's operational view.
- User sees Detected Opportunities scoped to the founder's empire — content mismatch.
- User sees Memory Health for the whole system — a Master view.
- **User can potentially read Master's episodic memory content (P0 risk).**
- User sees Knowledge state of the shared pool — likely correct (Semantic is shared per §8.1).
- User sees Knowledge gaps including any gaps tagged to Master-private decisions — Layer-3 leak.

**Missing role-adapted content model:** Per RD-2, "PROFILE is the User's personal governance layer within SYSTEM" — Users should see intelligence about THEIR domains (Life & Work), memory about THEIR interactions, knowledge about THEIR interests. Master sees a superset. The current implementation is Master-only content shown to everyone.

---

## SECTION 14: CURRENT PROGRESSIVE DISCLOSURE

**L0/L1/L2/L3/L4 model status: NOT IMPLEMENTED on any of the three surfaces.**

Every rendered item is a flat L0 with truncation. There are no expansion affordances, no "show more", no click-to-drill-down, no L1 popovers.

**§7.4 requires:**
> Every intelligence item follows the L0→L3 disclosure model with the locked confidence indicator (● High + one-word label at L0; expanded explanation at L1).

**Absence measured:**
- L0 present but overloaded — L0 currently contains raw scores, uppercase enums, technical labels.
- L1 absent — no context sentence, no "APEX surfaced this because…".
- L2 absent — no evidence panel, no source list, no timestamp explanation.
- L3 absent — no reasoning trace.
- L4 absent — no operational detail (which is correct for these surfaces per §7.6 — L4 belongs in SYSTEM).

---

## SECTION 15: CURRENT MOBILE BEHAVIOUR

Analysed at 375px, 768px, 1024px, 1280px, 1440px, 1660px per the audit request.

**INTELLIGENCE at 375px:**
- Page header uses `align-items:flex-end;justify-content:space-between` — Refresh button and title stack acceptably.
- Panel bodies use `flex-direction:column` — no overflow.
- Health dimensions row: 130px label + flex bar + 30px right value. On 375px minus 20px padding = 355px available; 130+30+8+8 = 176px chrome, ~180px bar — OK.
- Opportunity cards use `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` on title — will truncate hard.
- Description is 2-line clamped via `-webkit-line-clamp:2` — OK on mobile.
- **CTA reachability:** Refresh is single button, top-right, tappable. No other CTAs — negative reachability issue (nothing to act on).

**INTELLIGENCE at 768px:** identical layout — no responsive breakpoint. Wastes horizontal space.

**INTELLIGENCE at 1280px+:** Single column full-width. Reads as narrow strip. Wastes 60%+ of viewport.

**MEMORY at 375px:**
- Health tiles: `grid-template-columns:repeat(2,1fr)` — 4 tiles in 2×2. On 375px, tiles are ~155px wide. Fits with label ellipsis potential.
- Search input at 160px width may collide with count text on 375px if count is long.
- Episodic list `max-height:280px` with `overflow-y:auto` — scroll containers on mobile hide content depth.

**MEMORY at 768px+:** No adaptive grid. Health remains 2×2 instead of expanding to 4×1.

**KNOWLEDGE at 375px:**
- Coverage stats use `flex-wrap:wrap` — 5 stat items wrap across rows. Item labels are 9px which is at the accessibility floor.
- Search input `flex:1;min-width:120px` — OK.
- Item cards use `padding:10px;border-left:3px solid` — visible on narrow. `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` on facts — hard truncation, no expansion.

**KNOWLEDGE at 768/1024/1280:** No adaptive breakpoints. Should introduce per-domain coverage bars (§7.4 spec) that would benefit from horizontal space.

**Global mobile issues:**
- Bespoke inline styles override the V-11-F mobile CSS block (line ~95) in some cases.
- Search inputs across the three surfaces use different visual treatments.
- No mobile-specific navigation between the three surfaces (e.g., swipe was implemented at 10777 but requires knowing that these three pages are adjacent in the `pages` array).

---

## SECTION 16: CURRENT PERFORMANCE

**Polling: NONE on any of the three surfaces.** Verified by full `setInterval` grep; none of the ~25 intervals reference intelligence/memory/knowledge fetchers.

**Duplicate requests:** `_loadMemorySemantic('')` fires on page enter and 400s persistently — wasted request pattern. `intelligenceRefresh()` fires all three fetches every time the page is entered (no debounce, no cache hit check).

**Cache opportunities:**
- Briefing has a 6h server-side cache; UI could still show cached data instantly while re-fetching in background.
- Health has snapshots (`getLatest`); could serve stale-while-revalidate.
- Knowledge state changes slowly; could cache for a minute.
- Opportunities change on detection cycles (hourly typical); could cache.

**No `cachedFetch` usage on these surfaces** (compare: `cachedFetch('/api/intelligence/cost-summary', 60000)` at line 14293 IS used elsewhere).

**WebSocket opportunities (currently `/ws/v10-events` per V-10):**
- Opportunity detected → push new opportunity card.
- Briefing regenerated → push refreshed panel.
- New knowledge gap declared → increment count and prepend.
- Gap resolved → remove from open list.
- Fact contradicted → update fact confidence dot in place.
- Memory consolidation completed → update health tile.

**Initial load impact:** Each page cold-load fires 3 parallel fetches with no request batching; on slow networks, all three skeletons remain until the slowest returns. No timeout → LOADING → ERROR transition per V-11-B state canon.

---

## SECTION 17: CURRENT DEFECTS

Full enumeration (line-cited). Ordered by severity.

**D1 (P0) — Episodic memory endpoint has no owner scope.** `routes/memory.js:74` `/memory/episodic/recent` returns whatever `episodicMemory.getRecent(limit)` returns. Frontend `_loadMemoryEpisodic` (20749) displays without filter. Violates RD-3 §8.1.

**D2 (P0) — `/api/intelligence/health` route collision.** Registered in both `routes/intelligence.js:592` and `routes/intelligence-memory.js:402` (different schemas). Whichever mounts first wins; frontend expects the civilization-health-engine shape.

**D3 (P0) — SIE briefing is Master-scoped content shown to Users.** `sie.js:640` prompt hardcodes "founder of APEX AI OS", "empire foundation". User sees this text on their INTELLIGENCE page. No role-conditional rendering.

**D4 (P0) — Semantic memory search 400s on empty query.** `routes/memory.js:100` returns 400 when `q` empty; `_loadMemorySemantic('')` at line 20802 calls with empty on every page load. Persistent broken initial state ("Semantic memory unavailable"). Either the route should accept empty q (return recent facts) or the client should not call with empty q.

**D5 (P1) — Every panel uses bespoke innerHTML; no `setState()`.** V-11-B canonical state pattern not adopted. Zero retry buttons. Zero STALE/PARTIAL states.

**D6 (P1) — Raw scores and enums surfaced everywhere.** Violates §7.4 spec and Decision 10. Examples: "Score: 87" (20676), "78%" (20784), "CONFLICTING" (20510), "BLOCKED" (20583), "gap_type" values (20581).

**D7 (P1) — Opportunity `evidence_refs` extracted but ignored.** `routes/intelligence.js:577` provides them; `_intLoadOpportunities` (20671) does not read.

**D8 (P1) — Confidence rendered inconsistently across three surfaces.** Knowledge items: tier text; semantic facts: percentage; opportunities: raw score. Should all be `● High`-style per Decision 10.

**D9 (P1) — `#memHealthTs` textContent literal "now".** Line 20725 sets timestamp text to the string "now" — always. Should reflect actual snapshot age or last-refreshed time.

**D10 (P1) — LESSONS panel absent from `#page-intelligence`.** §7.4 requires "LESSONS 7 lessons · 3 applied today". Endpoint `/api/intelligence/lessons` EXISTS (routes/intelligence.js:38) and is used elsewhere (14342) but not wired here.

**D11 (P1) — KNOWLEDGE surface missing per-domain coverage bars.** §7.4 spec: "Business/University/Health/Finance coverage bars". Current implementation shows only aggregate gap stats.

**D12 (P1) — Memory correction flow absent.** §9.4 requires user-driven memory correction UX. `#page-memory` has search but no edit affordance.

**D13 (P2) — Inline `oninput` handler on memory search.** Line 10487 uses `oninput="if(typeof memorySearch==='function')memorySearch()"` — inline handler pattern that V-11-A migrated away from (`data-input`/`data-fn` dispatcher). Likely CSP-blocked.

**D14 (P2) — XSS potential in fact rendering.** `_loadMemorySemantic` (20787) inserts `f.fact` and `_knRenderItem` (20509) inserts `item.fact` directly via string concatenation into innerHTML with no escaping. If a fact contains `<script>` it will execute. Semantic memory is written by agents from LLM output — untrusted from an XSS standpoint.

**D15 (P2) — No aria-labels on refresh buttons.** All three page refresh buttons.

**D16 (P2) — Skeleton loading has no `aria-busy`.** Screen readers announce nothing during load.

**D17 (P2) — Six-tier confidence in `_knRenderItem` vs five-tier spec.** Line 20504–20506 has "VERY HIGH" and "UNCERTAIN" tiers; Decision 10 has 5 tiers (High/Good/Medium/Low/Very Low). Inconsistent taxonomy.

**D18 (P2) — Dead pipeline boundary note on `#page-intelligence`.** Lines 10436–10439 explain a pipeline that has no interactive expression.

**D19 (P3) — Description truncation is destructive (200 chars, 120 chars, 160 chars, no expansion).**

**D20 (P3) — Health dimension `label` fallback to `e[0]` (raw dim key).** Line 20650 — if backend fails to set label, raw dim key surfaces as label.

**D21 (P3) — Wasted horizontal real estate on desktop.** All three pages are single-column.

**D22 (P3) — No landmark roles (`role="region"`, `<main>`, `<section>`).** Screen reader navigation degraded.

**D23 (P3) — `_loadMemoryHealth` swallows Promise.allSettled failures silently.** Rendered as `'—'` — user cannot tell if a subsystem is unavailable vs empty.

---

## SECTION 18: P0 FINDINGS

- **D1** Episodic memory owner-scoping absent (privacy).
- **D2** `/api/intelligence/health` route collision (correctness).
- **D3** SIE briefing Master-scoped content shown to Users (correctness / user comprehension).
- **D4** Semantic memory search persistent 400 on load (broken core experience).

---

## SECTION 19: P1 FINDINGS

- **D5** No `setState()` adoption — no retry, no STALE/PARTIAL states.
- **D6** Raw scores and enum names surfaced (V-11 vocabulary violation).
- **D7** Opportunity `evidence_refs` unrendered.
- **D8** Confidence inconsistently rendered across surfaces; Decision 10 not implemented.
- **D9** `#memHealthTs` literal "now".
- **D10** LESSONS panel missing from Intelligence per §7.4.
- **D11** Domain coverage bars missing from Knowledge per §7.4.
- **D12** Memory correction flow (§9.4) not implemented.

---

## SECTION 20: P2 FINDINGS

- **D13** Inline `oninput` handler on memory search (CSP).
- **D14** XSS risk in innerHTML fact insertion.
- **D15** Missing aria-labels on refresh buttons.
- **D16** No `aria-busy` on skeleton loading.
- **D17** Six-tier vs five-tier confidence taxonomy inconsistency.
- **D18** Dead pipeline boundary note on Intelligence.

---

## SECTION 21: P3 FINDINGS

- **D19** Destructive truncation without expansion.
- **D20** Health dimension label fallback to raw dim key.
- **D21** Wasted desktop real estate (single-column at 1280+).
- **D22** No landmark roles.
- **D23** Silent Promise.allSettled failures in memory health.

---

## SECTION 22: 16-QUESTION INTELLIGENCE AUDIT

Per-surface × question. Y = fully answered, N = not answered, P = partially answered.

| Q | Question | Intelligence | Memory | Knowledge |
|---|---|---|---|---|
| A | What does APEX know? | N (points to Knowledge implicitly, no data on-page) | N | P (raw fact list, no domain grouping) |
| B | What does APEX remember? | N | P (last 20 episodes, technical labels) | N |
| C | What has changed? | N | N | N |
| D | What has APEX learned? | N (lessons endpoint not wired) | N (reflexion count only) | N |
| E | What does APEX think is important? | P (briefing 6 fields; not domain-scoped) | N | N |
| F | What does APEX infer? | P (boundary note enumerates INFERRED as stage; no items tagged) | N | N |
| G | How confident is APEX? | N (no confidence on briefing/opportunities/health) | P (raw % on facts) | P (tier text on items) |
| H | What evidence supports this? | N (evidence_refs ignored) | N | P (item.source when present) |
| I | Where did this information come from? | N | N | P (source string) |
| J | When was it last verified? | P (briefing generated_at) | P (episode created_at) | N (state.ts unused) |
| K | What does APEX not know? | N | N | P (gap list) |
| L | Where are the knowledge gaps? | N (should be cross-surface) | N | Y (dedicated panel) |
| M | Are there contradictions? | N | N | P (contradiction_count on items) |
| N | What needs investigation? | N | N | N (gap list exists but no CTA) |
| O | What should the user do? | N (no CTAs) | N (no CTAs beyond search) | N (no CTAs beyond search) |
| P | What can the user ask APEX? | N (no COMMAND handoff) | N | N |

Aggregate: Y=1, P=11, N=36 across 48 cells. This is the empirical basis for treating V-11-G as a rebuild.

---

## SECTION 23: PROPOSED INTELLIGENCE EXPERIENCE MODEL

Per §7.4 spec, `#page-intelligence` should be organised around the six section headers below, with L0→L2 disclosure on every item and Decision-10 confidence dots. Sections in priority order:

1. **BRIEFING (L0 headline + expand)** — single headline of the day (biggest opportunity OR biggest threat OR biggest bottleneck, whichever has the highest priority score) with `● High + one-word label`, "Generated Xh ago", `[Expand]` → 6-field detail at L1, `[Act on this]` → COMMAND handoff.
2. **OPPORTUNITIES (top 5)** — cards with title, one-line description, `● Confidence`, `[Evidence]` → L2 evidence panel showing `evidence_refs` (sourced from `roi_forecast.evidence_refs`), age, `[Investigate in COMMAND]`.
3. **WHAT APEX KNOWS** — domain coverage bars (Business/Communication/Health/University/Finance/Research) with fact counts, tap → drills into KNOWLEDGE filtered by domain; "3 knowledge gaps →" link to KNOWLEDGE gaps.
4. **WHAT APEX REMEMBERS** — 3–5 recent memory sentences rendered per §9.3 rules ("APEX handled a voice request 2h ago" → "APEX helped you with a voice question 2h ago"), tap → MEMORY.
5. **LESSONS** — 3–5 plain-language lessons from `/api/intelligence/lessons?n=8`, "N applied today" badge.
6. **CIVILIZATION HEALTH** — DEMOTED to a small status strip (or removed from this page and moved to SYSTEM per §7.6). It is not user-facing intelligence.

Each item card: L0 = 1 sentence + confidence dot + timestamp; L1 (expanded) = 2-sentence context + evidence link + action CTAs; L2 = evidence panel.

Role-aware content:
- Master briefing = current SIE output (founder/empire framing).
- User briefing = personal briefing generated from user's domain activity (requires backend gate B-1, Section 36).

---

## SECTION 24: PROPOSED MEMORY EXPERIENCE MODEL

Per §9 and RD-3 §8.

**Section headers (user-visible):**
1. **What APEX remembers about you** (episodic, human_id-scoped) — timeline of last N days, plain-language summaries, tap to expand, per-item `[Correct]` and `[Forget this]` actions. Filter by category.
2. **Facts APEX knows about you** (semantic filtered by user context) — with confidence dots and source citations.
3. **Skills APEX has learned to do for you** (skill memory, per-human) — success rate, last used.
4. **Your chat history** (from `apex_chat_history_{humanId}`) — searchable, per-message `[Forget]` action.
5. **Bulk controls** — "Export everything APEX remembers", "Forget everything from before [date]", "Forget everything (irreversible)".

**Master addition (rendered only for Master):**
- Cross-user memory audit view (Layer 1/2 visibility per §6.2) — counts only, never content.
- Emergency access invocation link (cross-references F-11 UI).

**Removed from this surface:**
- Consolidation/reflexion/improvement counts → moved to SYSTEM → Memory technical health (§7.6).
- Raw layer names (episodic/semantic/procedural) → never surfaced to user.

---

## SECTION 25: PROPOSED KNOWLEDGE EXPERIENCE MODEL

Per §7.4 and §9.2.

**Option A (recommended): Merge into INTELLIGENCE.** Knowledge becomes the "WHAT APEX KNOWS" section of Intelligence; the standalone `#page-knowledge` page is removed. Users get one destination for intelligence, one for memory. This matches §7.4 layout ("BRIEFING / OPPORTUNITIES / WHAT APEX KNOWS / WHAT APEX REMEMBERS / LESSONS" — all in a single Intelligence page).

**Option B: Keep separate but reframe.** Knowledge becomes a focused fact-and-gap browser. Sections:
1. Domain coverage bars.
2. Recent facts (with confidence dots + source).
3. Open gaps with one-tap `[Investigate]` (POST to `/knowledge/requirements/:id/assess` or open COMMAND with gap context).
4. Contradictions (currently only surfaced as a count on items — should be a first-class list).

Open Decision O-1: Section 33 lists this as an unresolved product decision.

---

## SECTION 26: CROSS-DOMAIN INTELLIGENCE MODEL

Currently absent. Proposed:

The Intelligence surface must synthesize signals from LIFE & WORK (Finance, Communication, Business, Health, University, Research) into cross-domain briefing items and opportunities. Backend endpoints needed (not built here — see Section 36):

- **B-2: `/api/intelligence/cross-domain-briefing`** — aggregates per-domain data (existing finance/health/university/business/research routes each have their own state) and returns unified briefing.
- Existing `sie.js::generateExecutiveBriefing` is founder-scoped; a new `generatePersonalBriefing({human_id})` is required for role-adapted content.
- Opportunity engine already generates cross-domain opportunities (`lib/intelligence/opportunity-engine.js`); confirm its scoring includes life-domain signals for user-scoped opportunities.

**Cross-domain evidence bundle:** Every intelligence claim should carry a bundle `{ sources:[{type, id, ts}], derived_at, method }` — currently absent from all endpoints in this cluster.

---

## SECTION 27: INTELLIGENCE → ACTION MODEL

Every intelligence item must connect to an action:

```
FINDING (L0)     → SIGNIFICANCE (L1)              → RECOMMENDATION (L1)         → ACTION (L2)
"APEX detected"  → "This matters because…"        → "Consider doing X"          → [Approve/Reject/Ask]
```

Currently NONE of the three surfaces provides an action pathway. Every item is a dead-end display. Proposed patterns:
- Opportunity → `[Investigate]` opens COMMAND with pre-loaded context.
- Opportunity → `[Escalate to task]` creates a task in ACTIONS.
- Gap → `[Ask APEX to research]` declares a requirement + assigns to research agent.
- Fact contradiction → `[Resolve]` opens a lightweight adjudication UI.
- Memory entry → `[Correct]` `[Forget]` in-line.
- Briefing headline → `[Act on this]` maps to the single most important action.

---

## SECTION 28: EVIDENCE MODEL

Per §9.5, every fact / memory / recommendation carries:
- **Source** (web article URL, user statement, agent inference, API name, integration name)
- **Timestamp** (created_at + last_verified_at)
- **Confidence** (Decision 10 dot+label)
- **Freshness** (`_timeAgo(last_verified_at)`)

Canonical evidence bundle shape (proposed for all endpoints):
```json
{
  "evidence": {
    "sources": [
      { "type": "user_statement" | "web" | "integration" | "agent_inference" | "api",
        "label": "User said this in COMMAND",
        "ref": "...",
        "ts": "2026-08-30T12:00:00Z" }
    ],
    "confidence": 0.87,
    "verified_at": "2026-09-01T09:00:00Z",
    "method": "reflexion|consolidation|direct|inferred"
  }
}
```

Frontend contract:
- L0: no evidence — just a confidence dot.
- L1: "Based on: [top source label] · Verified [Xh ago]".
- L2: full evidence panel with per-source rows.

---

## SECTION 29: CONFIDENCE MODEL

Canonical per Decision 10:

```
● Cyan (#00d4ff)   High     ≥ 0.85
● Blue (#0066ff)   Good     0.65–0.84
● Amber (#f59e0b)  Medium   0.45–0.64
● Orange (#f97316) Low      0.25–0.44
● Red (#ef4444)    Very Low < 0.25
— Grey             Unknown  null
```

One shared utility function required: `apex.confidence.badge(value)` returning `{ dot, label, description, color }`. Used everywhere confidence is surfaced. Existing `_knRenderItem` tier table must be deleted and replaced. Memory semantic percentage render (line 20784) must be deleted. Opportunity "Score: 87" is NOT confidence — it must be relabeled or converted (composite_score is a bounded 0–100 opportunity ranking, not certainty; render as a tier: "Priority: High" or omit and rely on ordering).

---

## SECTION 30: KNOWLEDGE-GAP PRESENTATION

Per §7.4 and §13.3 ("What doesn't APEX know? → INTELLIGENCE → Knowledge → Gaps section"):

Gap card L0:
```
◈ APEX doesn't know [required_subject in plain English]
  Domain: Finance · Age: 3 days · Blocking: 1 decision
  [Ask APEX to research]  [Provide the answer]  [Mark not needed]
```

L1 (expanded):
- Which decision(s) this blocks (from `knowledge_gaps.decision_ref`).
- What APEX has already tried.
- Suggested resolution path.
- If `blocks_decision`: red urgency indicator.

Cross-surface: Every INTELLIGENCE briefing item that references missing information cross-links to the corresponding gap.

---

## SECTION 31: MOBILE MODEL

Per §16.

**INTELLIGENCE 375px:** Single column, card list, briefing headline collapsed to 2 lines with "expand" chevron, opportunities as scrollable card list, coverage bars stacked vertically, LESSONS as chip list.

**INTELLIGENCE 768–1023px:** Two-column: briefing + lessons left; opportunities + gaps right.

**INTELLIGENCE 1024+:** Three-column: briefing (2/3 width) + right rail with lessons + gaps stacked; opportunities as horizontal card row.

**MEMORY 375px:** Timeline of "What APEX remembers" as day-grouped list, action affordances as swipe-left-to-reveal (Correct / Forget). Search collapses to icon.

**MEMORY 768+:** Left rail category filter, main column timeline, right rail bulk controls.

**KNOWLEDGE 375px:** Coverage bars stacked, gap chip list, fact list with pagination.

**KNOWLEDGE 768+:** Two-column: coverage + gaps left; facts right.

All 44px minimum touch height on any interactive element.

---

## SECTION 32: PERFORMANCE MODEL

- **Caching strategy:** All three page fetchers routed through `cachedFetch(url, ttl)` — briefing 300s, health 300s, opportunities 60s, memory health 60s, semantic facts 60s, knowledge state 60s, gaps 30s.
- **Polling elimination:** No polling on these surfaces. WebSocket push replaces the need for polling.
- **WebSocket integration:** Extend `/ws/v10-events` schema with:
  - `opportunity.detected`
  - `briefing.regenerated`
  - `gap.declared`
  - `gap.resolved`
  - `fact.contradicted`
  - `memory.consolidated`
- **Stale-while-revalidate:** On page enter, render cached data instantly (with STALE indicator), fire fresh fetch, replace on completion.
- **Load budget:** Page should render to interactive state in ≤400ms with warm cache, ≤2s cold.

---

## SECTION 33: OPEN DECISIONS

- **O-1: Merge KNOWLEDGE into INTELLIGENCE, or keep separate?** §7.4 spec implies merge (single Intelligence page with WHAT APEX KNOWS section). RD-2/§11 six-destination model does not include Knowledge or Memory as first-class destinations — they may be intelligence sub-sections.
- **O-2: Keep or remove CIVILIZATION HEALTH from `#page-intelligence`?** Currently prominent; §7.6 says SYSTEM. Recommend remove.
- **O-3: Personal briefing for Users — implement now or defer?** Requires backend `generatePersonalBriefing({human_id})`. Alternative: hide briefing panel entirely for User role.
- **O-4: Memory correction flow — voice-driven (§9.4) or explicit UI or both?** §9.4 shows voice pattern; explicit UI is more discoverable.
- **O-5: Chat history visibility in Memory — expose per-message delete or just bulk "clear chat history"?**
- **O-6: Confidence for `composite_score` — treat as confidence (map to Decision 10 tier) or as priority (separate visual)?**
- **O-7: XSS defence — HTML escape at fetch time (frontend) or sanitize at write time (backend)?** Recommend defence in depth: both, but priority is frontend escape.
- **O-8: Gap "Ask APEX to research" — creates a task in ACTIONS or fires an agent directly?** Governance question.
- **O-9: How does User Memory surface behave when User has zero memory yet?** Onboarding empty state.
- **O-10: Where does contradiction adjudication UI live?** MEMORY, KNOWLEDGE, or COMMAND?
- **O-11: Backend role/human_id enforcement — implement in a shared middleware or per-route?** Consistency vs granularity.
- **O-12: The dead `#page-operation` DOM (V-11-F ghost-keep) — should intelligence surfaces be similarly ghost-kept if we merge?**

---

## SECTION 34: RECOMMENDED DECISIONS

- **O-1 → RECOMMENDED: KEEP SEPARATE for V-11-G.** Retain three destinations for backward compatibility; merge WHAT APEX KNOWS / WHAT APEX REMEMBERS sections INTO Intelligence AS WELL. Cross-link. Full merge (removing pages) is a V-11-H+ decision.
- **O-2 → RECOMMENDED: REMOVE from Intelligence, ADD to SYSTEM.** Aligns with §7.6. RESOLVED BY EXISTING LOCK (§7.6).
- **O-3 → RECOMMENDED: DEFER personal briefing to V-11-H (backend gate).** For V-11-G, hide briefing panel for User role and show a stub: "APEX is preparing your briefing." This preserves the surface without shipping Master content to Users.
- **O-4 → RECOMMENDED: BOTH. Explicit UI in Memory for discoverability; voice pattern retained via COMMAND.** RESOLVED BY EXISTING LOCK (§9.4 shows voice; §8.2 requires explicit UI).
- **O-5 → RECOMMENDED: Both per-message and bulk.** Per-message via context menu / swipe; bulk via "Forget all chat history" button.
- **O-6 → RECOMMENDED: Priority, not confidence.** Rename "Score:" to "Priority:" and map 0–100 to High/Medium/Low priority chips. Reserve Decision 10 dot exclusively for confidence.
- **O-7 → RECOMMENDED: Frontend escape (defensive) + backend sanitization (V-11-H+).** Add `_escapeHtml()` helper (may already exist elsewhere) and pipe every user-derived string through it.
- **O-8 → RECOMMENDED: Creates a research task in ACTIONS.** Preserves user-in-the-loop, aligns with §11 approval lifecycle.
- **O-9 → RECOMMENDED: Empty state with 3 example prompts** ("Ask APEX to remember something", "Tell APEX about a preference", etc.) — activation flow.
- **O-10 → RECOMMENDED: KNOWLEDGE.** Contradictions are knowledge-integrity concerns.
- **O-11 → RECOMMENDED: Shared middleware `requireOwnerScope(resourceType)`** attached per-route. Delegated to backend authorisation gates (§36).
- **O-12 → RECOMMENDED: Do not ghost-keep.** If merge happens post V-11-G, remove `#page-knowledge` DOM cleanly.

---

## SECTION 35: IMPLEMENTATION PACKAGES

Frontend-only packages authorised in this phase (no backend changes).

**G-1 (P0) — Frontend role gating on the three surfaces.**
- Add `apex-master-only` class to briefing panel (Master content until per-user briefing exists).
- Hide `_intLoadBriefing` result for `body.apex-role-user`; render placeholder stub.
- Gate `/memory/episodic/recent` UI: for User role, do not render Master memories (defence-in-depth; real fix is backend G-B1).
- Contract: no data change; visual/DOM gating only.

**G-2 (P0) — Fix `_loadMemorySemantic('')` broken initial state.**
- Change client to call `/memory/semantic/search?limit=20` without `q` on first load; catch backend 400 and render neutral empty state until user searches.
- OR pass a wildcard `q=*` if backend accepts (verify — currently returns 400 if `q` empty per `routes/memory.js:100`).
- Recommend: default L0 to "Search facts APEX knows about you…" prompt and only fetch on submit.

**G-3 (P0) — Route collision guard for `/api/intelligence/health`.**
- Confirm which route wins in production; add frontend shape-detection so page doesn't blank on unexpected response.
- (Real fix is backend deduplication — G-B2.)

**G-4 (P1) — Decision 10 confidence badge utility + adoption.**
- Add `_apexConfidenceBadge(value)` helper.
- Replace `_knRenderItem` tier text with `● High` dot+label.
- Replace `_loadMemorySemantic` percentage with `● High`.
- Convert `_intLoadOpportunities` "Score: 87" to `Priority: High` chip (composite_score is priority, not confidence).

**G-5 (P1) — `setState()` adoption across all six panels.**
- Migrate 6 panels (briefing, health, opportunities, memory health, memory episodic, memory semantic, knowledge state, knowledge items, knowledge gaps) to `window.setState()` with retry buttons.

**G-6 (P1) — Wire LESSONS panel on `#page-intelligence`.**
- Add `<div class="ds-panel">Recent Lessons</div>` per §7.4.
- Fetcher: `_intLoadLessons()` → `GET /api/intelligence/lessons?n=8`.

**G-7 (P1) — Domain coverage bars on `#page-knowledge`.**
- Backend: needs `/api/knowledge/coverage?by=domain` (see backend gate B-3) — DEFER visual to G-B3 backend approval.
- Interim frontend-only: display per-domain gap count from existing `/knowledge/gaps?domain_id=…` — 6 requests, cached.

**G-8 (P1) — Vocabulary sweep.**
- Map every uppercase enum on the three surfaces to human vocabulary. Table: FULLY_KNOWN → "Well established", CONFLICTING → "Sources disagree", BLOCKED → "Waiting on missing information", BLOCKING → "Blocking a decision", VERY HIGH → "Very high", etc.
- Remove pipeline boundary note (10436–10439).

**G-9 (P1) — Evidence L1 disclosure.**
- Add `[Evidence]` chevron on opportunity/knowledge/memory cards.
- Click expands inline showing source list, timestamp, confidence context.
- For opportunities: render `evidence_refs` currently ignored (line 20671).

**G-10 (P1) — Memory §9.3 translation rules.**
- Add `_apexMemoryLabel(record)` translator: episodic `voice-task-*` → "APEX handled a voice request".
- Remove technical labels (Episodic/Semantic/Reflexion) from user-visible headers; move to SYSTEM.

**G-11 (P2) — XSS escape helper for all rendered user strings.**
- `_escapeHtml(str)` utility.
- Apply to `f.fact`, `item.fact`, `o.title`, `o.description`, `ep.summary`, `g.required_subject`.

**G-12 (P2) — CSP compliance for memory search input.**
- Replace `oninput="…"` (line 10487) with `data-input="memorySearch"` per V-11-A event dispatcher.

**G-13 (P2) — Accessibility pass.**
- Add `aria-label` to all `↻ Refresh` buttons.
- Add `aria-busy="true"` on skeleton containers.
- Wrap sections in `<section role="region" aria-label="…">`.

**G-14 (P3) — Desktop multi-column layout.**
- 3-column layout on `#page-intelligence` at ≥1280px.
- 2-column layout on `#page-memory` and `#page-knowledge` at ≥1024px.

**G-15 (P3) — WebSocket integration (event surface only; backend push is a separate gate).**
- Subscribe to `/ws/v10-events` for `opportunity.detected`, `gap.declared`, `gap.resolved`, `briefing.regenerated`, `memory.consolidated`, `fact.contradicted`.
- Non-blocking: if events don't come, current cache-based refresh works.

---

## SECTION 36: BACKEND AUTHORISATION GATES

None implemented in this phase. Documented for future authorisation.

**G-B1 (P0) — Owner-scoped episodic memory.** Add `requireOwnerScope('episodic')` middleware to `/memory/episodic/recent`, `/memory/episodic/similar`, `/memory/episodic/failures`, `/memory/episodic/stats`, `/memory/working/*`. Filter by `req.humanId` derived from auth. Master with `x-emergency-access-token` header bypasses (per §6.4 protocol). Frontend G-1 gating is defence-in-depth; this is authoritative fix.

**G-B2 (P0) — Deduplicate `/api/intelligence/health` route.** Rename `/intelligence/health` in `intelligence-memory.js` to `/intelligence/memory-health` (or similar). Update any callers.

**G-B3 (P1) — `/api/intelligence/lessons` role scoping and Personal briefing.**
- `generatePersonalBriefing({human_id})` in `sie.js`.
- `/api/intelligence/briefing?scope=personal` returns user-scoped briefing.
- Master-scoped briefing remains at `/api/intelligence/briefing?scope=empire` (or default with role check).

**G-B4 (P1) — `/api/knowledge/coverage?by=domain`.** Return `{ domain, fact_count, gap_count, coverage_pct, avg_confidence }` per domain for domain-coverage bar UI.

**G-B5 (P1) — Evidence bundle contract.** Add `evidence:{sources, verified_at, method}` shape to opportunity, briefing, semantic fact, and knowledge item responses. Formalise in a shared schema.

**G-B6 (P2) — Sanitize fact text on write.** Semantic memory storeFact() should strip `<script>`, `<iframe>`, `on*=` attributes. Defence-in-depth alongside frontend escape.

**G-B7 (P2) — WebSocket push events.** Add `opportunity.detected`, `gap.declared`, `gap.resolved`, `briefing.regenerated`, `memory.consolidated`, `fact.contradicted` to `/ws/v10-events`.

**G-B8 (P2) — Semantic memory search accepts empty `q`.** Change `routes/memory.js:100` to return `recent facts` when `q` empty rather than 400.

**G-B9 (P2) — Knowledge gaps role/human_id scoping.** Gaps tagged to Master decisions should not surface to Users.

---

## SECTION 37: REGRESSION STRATEGY

**Existing suites that MUST continue passing (0 delta expected):**

| Suite | Baseline | Concern for V-11-G |
|---|---|---|
| V-11-A shell (28) | 28/28 | None — untouched surfaces |
| V-11-B universal state (29) | 29/29 | G-5 introduces new setState uses — regression risk if setState internals change; do not modify setState |
| V-11-D1 TODAY navigation (45) | 45/45 | None — TODAY untouched |
| V-11-D2 TODAY default+hash (37) | 37/37 | None |
| V-11-E COMMAND conversation (70) | 70/70 | None — COMMAND untouched |
| V-11-F LIFE & WORK (55) | 55/55 | None — LIFE & WORK untouched |

**New test suite `playwright-v11g-verify.js` — proposed assertion coverage:**

- **G-1 role gating (5 assertions):** Master sees briefing panel; User sees stub. Master sees memory episodic list; User sees "Your memory" filtered variant. Neither role sees Master-only strings for User.
- **G-2 semantic search empty state (2):** Page load does not render "Semantic memory unavailable"; explicit search populates.
- **G-3 route collision (1):** `/api/intelligence/health` responds with civilization schema (score+dimensions).
- **G-4 confidence badges (6):** Knowledge items render `● High` (not "Confidence: HIGH"); semantic facts render `● High` (not `78%`); opportunities render `Priority: High` chip (not `Score: 87`); tier utility is single source of truth.
- **G-5 setState adoption (9):** Each of the 9 panels transitions loading → ready → (retry on failure).
- **G-6 lessons panel (2):** Panel present on `#page-intelligence`; fetches from `/api/intelligence/lessons`.
- **G-7 domain coverage (6):** 6 coverage rows or bars present on `#page-knowledge`.
- **G-8 vocabulary sweep (10 forbidden strings):** Absence of `FULLY_KNOWN`, `CONFLICTING`, `BLOCKED`, `BLOCKING`, `VERY HIGH`, `UNCERTAIN`, `gap_type`, `required_subject`, `composite_score`, `KNOWN → INFERRED` from rendered DOM.
- **G-9 evidence L1 (3):** Expand chevron on opportunity/knowledge/memory card exposes evidence sub-panel with source + timestamp.
- **G-10 memory translation (3):** `voice-task-*` objectives never rendered raw; "Episodic/Semantic" headers absent from user-visible surface.
- **G-11 XSS escape (2):** Injecting `<img src=x onerror=alert(1)>` in a semantic fact does not execute.
- **G-12 CSP (1):** No inline `oninput` handlers on the three pages.
- **G-13 a11y (5):** All refresh buttons have `aria-label`; skeleton has `aria-busy`; sections have `role="region"`.
- **G-14 desktop layout (4):** At 1280px, `#page-intelligence` renders 3-column.
- **G-15 WebSocket (2):** Client subscribes to expected event names; ignores unknown events.
- **REG (5):** TODAY still renders; COMMAND still renders; no console errors on nav to the three pages; nav badges still update.

**Total proposed:** ~55 new assertions. Cumulative post-V-11-G: **~319 assertions across V-11-A through V-11-G.**

**Manual regression checklist:**
- Master smoke: visit each of the three pages; expect canonical briefing/opportunities/memory list/knowledge coverage.
- User smoke: visit each; expect user-scoped briefing stub, user-scoped memory, shared knowledge.
- Role swap (Master → User): all three pages re-render appropriately; no Master content leaks.
- Offline: skeleton → retry button; retry works when connectivity restored.

---

## END OF RECONNAISSANCE

Application code changed: NO
Production changed: NO
