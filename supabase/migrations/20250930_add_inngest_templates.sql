-- Add missing message templates for Inngest job queue
-- These templates will be used by the pre-event and post-event funnels

-- 1-hour reminder templates
INSERT INTO message_templates (slug, name, channel, subject_template, variables, required_variables, generation_prompt, is_active)
VALUES
  (
    'reminder-1h',
    '1 Hour Reminder Email',
    'email',
    'Starting in 1 hour: {{eventTitle}}',
    '["firstName", "eventTitle", "eventDate", "joinUrl"]'::JSONB,
    '["firstName", "joinUrl"]'::JSONB,
    'Generate an urgent reminder email 1 hour before the event starts',
    TRUE
  ),
  (
    'reminder-1h-sms',
    '1 Hour Reminder SMS',
    'sms',
    NULL,
    '["firstName", "eventTitle", "joinUrl"]'::JSONB,
    '["joinUrl"]'::JSONB,
    'Generate a concise SMS reminder 1 hour before the event (max 160 chars)',
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- Post-event templates for attended path
INSERT INTO message_templates (slug, name, channel, subject_template, variables, required_variables, generation_prompt, is_active)
VALUES
  (
    'thank-you',
    'Thank You Email (Attended)',
    'email',
    'Thank you for attending {{eventTitle}}!',
    '["firstName", "eventTitle", "replayUrl", "resourcesUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate a warm thank you email for event attendees with replay and resources',
    TRUE
  ),
  (
    'resources',
    'Resources Email (Attended)',
    'email',
    'Resources from {{eventTitle}}',
    '["firstName", "eventTitle", "resourcesUrl", "replayUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate an email with event resources, slides, and materials for attendees',
    TRUE
  ),
  (
    'nurture',
    'Nurture Email (Attended)',
    'email',
    'Next steps after {{eventTitle}}',
    '["firstName", "eventTitle", "offerUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate a nurture email with next steps, offers, or engagement opportunities',
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- Post-event templates for no-show path
INSERT INTO message_templates (slug, name, channel, subject_template, variables, required_variables, generation_prompt, is_active)
VALUES
  (
    'sorry-missed',
    'Sorry We Missed You (No-show)',
    'email',
    'We missed you at {{eventTitle}}',
    '["firstName", "eventTitle", "replayUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate a friendly email for no-shows with replay link and re-engagement opportunity',
    TRUE
  ),
  (
    'reengagement',
    'Re-engagement Email (No-show)',
    'email',
    'Still interested in {{eventTitle}}?',
    '["firstName", "eventTitle", "replayUrl", "nextEventUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate a re-engagement email for no-shows with replay and next event invitation',
    TRUE
  ),
  (
    'final-followup',
    'Final Follow-up (No-show)',
    'email',
    'Last chance: Resources from {{eventTitle}}',
    '["firstName", "eventTitle", "resourcesUrl"]'::JSONB,
    '["firstName"]'::JSONB,
    'Generate a final low-priority follow-up email with resources for no-shows',
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added Inngest message templates';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pre-event: reminder-1h, reminder-1h-sms';
  RAISE NOTICE 'Post-event (attended): thank-you, resources, nurture';
  RAISE NOTICE 'Post-event (no-show): sorry-missed, reengagement, final-followup';
  RAISE NOTICE '========================================';
END $$;
