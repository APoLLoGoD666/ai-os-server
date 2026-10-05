-- Migration 051: Seed missing executive roles (CSO, CIO, CGO, CRO, CHO, CLO)
-- Migration 048 only seeded CTO/COO/CFO. The remaining 6 roles were added to
-- lib/executive/registry.js but had no rows in executive_roles, making them
-- unreachable via the DB-driven trigger path in trigger-evaluator.js.
-- All 6 use empty trigger conditions so _matches() falls through to the
-- description-keyword matching logic added in the last patch.

INSERT INTO executive_roles (role, domain, triggers, weight, veto, prompt_ref) VALUES
  ('cso', 'strategy',
   '{"description":"Consulted on strategy, roadmap, vision, priorities, initiatives, and direction tasks"}',
   0.9, false, 'lib/executive/registry.js:CSO'),

  ('cio', 'intelligence',
   '{"description":"Consulted on memory policy, cognitive policy, knowledge decay, learning rate, retention, benchmarks"}',
   0.9, false, 'lib/executive/registry.js:CIO'),

  ('cgo', 'growth',
   '{"description":"Consulted on new features, opportunities, experiments, capabilities, growth, expansion"}',
   0.8, false, 'lib/executive/registry.js:CGO'),

  ('cro', 'risk',
   '{"description":"Consulted on risk, threats, vulnerabilities, incidents, outages — always triggered on critical complexity"}',
   1.0, false, 'lib/executive/registry.js:CRO'),

  ('cho', 'health',
   '{"description":"Consulted on health, recovery, burnout, cognitive load, wellbeing, fatigue"}',
   0.7, false, 'lib/executive/registry.js:CHO'),

  ('clo', 'legal',
   '{"description":"Consulted on legal matters, compliance, contracts, regulation, GDPR, privacy, audits"}',
   0.9, false, 'lib/executive/registry.js:CLO')

ON CONFLICT (role) DO NOTHING;
