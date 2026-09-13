-- Migration 045: Admission Rules — Constitution Article 2 (everything earns its place)
-- Every planned component lives here as a row with an explicit criterion.
-- The weekly cron in lib/civilization/admission-engine.js evaluates all active rules.

CREATE TABLE IF NOT EXISTS admission_rules (
  component          text        PRIMARY KEY,
  category           text        NOT NULL DEFAULT 'integration',
  criterion          jsonb       NOT NULL,
  status             text        NOT NULL DEFAULT 'dormant'
                                 CHECK (status IN ('dormant','available','tripped','building','live','decommissioned')),
  tripped_at         timestamptz,
  build_proposal_sent boolean    NOT NULL DEFAULT false,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Seed all known dormant components with their admission criteria
INSERT INTO admission_rules (component, category, criterion, status, notes) VALUES

-- Integrations blocked on external prerequisites
('whatsapp',       'integration', '{"requires":"meta_business_account","description":"WhatsApp Business API requires Meta Business verification.","alternative":"Use Telegram bot (already buildable at zero cost)"}', 'dormant', 'Telegram is the recommended alternative'),
('linkedin',       'integration', '{"requires":"linkedin_developer_approval","description":"LinkedIn API requires company approval for messages/posting access."}', 'dormant', NULL),
('apple_health',   'integration', '{"requires":"ios_shortcut_or_native_app","description":"HealthKit requires native iOS/macOS app. iOS Shortcut workaround is available now.","workaround":"POST /api/health/apple-shortcut"}', 'available', 'Shortcut endpoint exists — user must configure the iOS Shortcut'),
('open_banking',   'integration', '{"requires":"fca_tpp_registration_or_aggregator_contract","description":"UK Open Banking requires FCA TPP registration (6 weeks min) or a contracted aggregator (Yapily/TrueLayer).","lead_time_weeks":6}', 'dormant', NULL),
('sms_imessage',   'integration', '{"requires":"twilio_account_or_apple_messages_for_business","description":"SMS needs Twilio; iMessage needs Apple Messages for Business approval."}', 'dormant', NULL),
('voicemail',      'integration', '{"requires":"carrier_voicemail_api_or_twilio_transcription","description":"Carrier API access or Twilio transcription service needed."}', 'dormant', NULL),

-- Growth triggers (trip when usage meets threshold)
('telegram_bot',       'feature', '{"trigger":"user_requests_mobile_access","description":"Wire Telegram bot for mobile access to APEX from phone."}', 'dormant', 'Zero registration required — highest priority among integrations'),
('weekly_review_auto', 'feature', '{"trigger":"daily_briefing_delivered_7_consecutive_days","description":"Auto-generate weekly review once daily briefing is stable."}', 'dormant', NULL),
('bank_manual_entry',  'feature', '{"trigger":"user_logs_3_manual_expenses","description":"Activate manual bank entry form once user demonstrates need."}', 'dormant', NULL),
('recipe_engine',      'feature', '{"trigger":"nutrition_log_entries_gt_20","description":"Activate recipe suggestions from fridge contents after enough nutrition data exists."}', 'dormant', NULL),

-- Self-improvement features (trip when prerequisites are met)
('civilisation_score_public', 'feature', '{"trigger":"domain_scores_computed_7_consecutive_days","description":"Surface civilisation score on dashboard once stable computation exists."}', 'dormant', NULL),
('agent_factory',      'feature', '{"trigger":"admission_rules_tripped_gt_2","description":"Activate agent factory once multiple admission rules have been successfully tripped."}', 'dormant', NULL)

ON CONFLICT (component) DO NOTHING;
