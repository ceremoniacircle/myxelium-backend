# Inngest Implementation Verification Checklist

Use this checklist to verify the Inngest job queue system is working correctly.

## Pre-Testing Setup

### Environment Setup
- [ ] `.env.local` file created with all required variables
- [ ] `SUPABASE_URL` set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set correctly
- [ ] `INNGEST_EVENT_KEY` set (or use `test` for local dev)
- [ ] `INNGEST_SIGNING_KEY` set (or use `test` for local dev)
- [ ] Database migrations run successfully

### Dependencies
- [ ] `npm install` completed without errors
- [ ] `inngest` package installed (check `package.json`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)

### Database
- [ ] All tables exist in Supabase
- [ ] Migration `20250930_add_inngest_templates.sql` applied
- [ ] Message templates exist (check `message_templates` table)
- [ ] At least one test event exists in `events` table

## Functional Testing

### 1. Inngest Dev Server
- [ ] Run `npm run inngest:dev`
- [ ] Server starts without errors
- [ ] Dashboard accessible at http://localhost:8288
- [ ] Dashboard shows "Myxelium Event Funnel Orchestration" app

### 2. Next.js Dev Server
- [ ] Run `npm run dev` in separate terminal
- [ ] Server starts on http://localhost:3000
- [ ] No compilation errors in console
- [ ] `/api/inngest` endpoint accessible

### 3. Function Registration
- [ ] Open http://localhost:8288/functions
- [ ] See "pre-event-funnel" function listed
- [ ] See "post-event-funnel" function listed
- [ ] See "send-message" function listed
- [ ] See "post-event-send-resources" function listed
- [ ] See "post-event-send-nurture" function listed
- [ ] See "post-event-send-reengagement" function listed
- [ ] See "post-event-send-final-followup" function listed

### 4. Pre-Event Funnel Test
- [ ] Run `npm run inngest:test:pre`
- [ ] Script completes without errors
- [ ] See "Event triggered successfully" message
- [ ] Open http://localhost:8288/runs
- [ ] See new run for "pre-event-funnel"
- [ ] Click on run to view details
- [ ] See "send-welcome-email" step completed
- [ ] See "wait-24h-reminder" step (sleeping or skipped)
- [ ] See "wait-1h-reminder" step (sleeping or skipped)

### 5. Pre-Event Funnel Console Output
Check terminal for placeholder messages:
- [ ] See "=== MESSAGE SEND (PLACEHOLDER) ===" for welcome email
- [ ] Message includes contact email
- [ ] Message includes event title
- [ ] Message includes join URL
- [ ] Message channel is "email"
- [ ] Template is "welcome-email"

### 6. Database Records
Query `sent_messages` table:
- [ ] New record exists for welcome email
- [ ] `contact_id` matches test contact
- [ ] `channel` is 'email'
- [ ] `status` is 'sent'
- [ ] `provider` is 'resend' (placeholder)
- [ ] `body_text` contains welcome message
- [ ] `sent_at` timestamp is recent

### 7. Post-Event Funnel Test
- [ ] Run `npm run inngest:test:post`
- [ ] Script completes without errors
- [ ] See "Event triggered successfully" message
- [ ] Open http://localhost:8288/runs
- [ ] See new run for "post-event-funnel"
- [ ] Click on run to view details
- [ ] See "fetch-registrations" step completed
- [ ] See "process-registration-*" steps for each registration

### 8. Message Sender Test
- [ ] Run `npm run inngest:test` (or `npm run inngest:test:all`)
- [ ] See message send function executed
- [ ] Check console for placeholder message
- [ ] Verify database record created

### 9. Enrollment API Integration
Create a test enrollment:
```bash
curl -X POST http://localhost:3000/api/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "email": "integration-test@example.com",
    "firstName": "Integration",
    "lastName": "Test",
    "eventId": "YOUR_TEST_EVENT_ID"
  }'
```

Verify:
- [ ] API returns 201 status
- [ ] Response includes `registrationId`
- [ ] Response includes `contactId`
- [ ] Response includes success message
- [ ] Console shows "Triggered pre-event funnel" message
- [ ] Inngest dashboard shows new run for "pre-event-funnel"
- [ ] Database has new `sent_messages` record

### 10. Idempotency Test
- [ ] Trigger same event twice with `npm run inngest:test:pre`
- [ ] Second run should execute without duplicating messages
- [ ] Check database for duplicate records (should not exist)
- [ ] Inngest dashboard shows both runs completed successfully

### 11. Consent Checking
Create contact without SMS consent:
- [ ] Insert contact with `consent.sms.granted = false`
- [ ] Trigger pre-event funnel
- [ ] Verify email steps execute
- [ ] Verify SMS steps are skipped
- [ ] Console shows "Skipping SMS - no consent" messages

### 12. Event Validation
Test with cancelled event:
- [ ] Update test event status to 'cancelled'
- [ ] Trigger pre-event funnel
- [ ] Verify welcome email still sends (immediate)
- [ ] Verify 24h and 1h reminders are skipped
- [ ] Console shows "Event no longer valid" messages

### 13. Time-Based Delays
For events in the future:
- [ ] Create event scheduled 48 hours from now
- [ ] Trigger pre-event funnel
- [ ] Verify welcome email sends immediately
- [ ] Check Inngest dashboard for "sleeping" steps
- [ ] See "wait-24h-reminder" with countdown timer
- [ ] See "wait-1h-reminder" with countdown timer

## Error Handling

### 14. Retry Behavior
- [ ] Force an error in send-message function (edit code temporarily)
- [ ] Trigger event
- [ ] Verify function retries automatically
- [ ] Check Inngest dashboard for retry attempts
- [ ] See exponential backoff (1m, 5m, 30m)
- [ ] After 4 attempts, see error state
- [ ] Check database for error_code and error_message

### 15. Missing Data
- [ ] Trigger event with invalid contactId
- [ ] Verify function handles error gracefully
- [ ] Check console for error logs
- [ ] Verify no database records created

### 16. Network Failures
- [ ] Stop Supabase connection temporarily
- [ ] Trigger event
- [ ] Verify Inngest retries
- [ ] Restore connection
- [ ] Verify function completes on retry

## Performance

### 17. Rate Limiting
- [ ] Trigger 50+ events rapidly (use script loop)
- [ ] Verify throttle limits work (50 concurrent/minute)
- [ ] Check Inngest dashboard for queued runs
- [ ] Verify all eventually complete

### 18. Parallel Processing
- [ ] Create event with 10+ registrations
- [ ] Trigger post-event funnel
- [ ] Verify all registrations process in parallel
- [ ] Check Inngest dashboard for concurrent steps
- [ ] All complete successfully

## Monitoring & Debugging

### 19. Inngest Dashboard
- [ ] View all runs: http://localhost:8288/runs
- [ ] Filter by function name
- [ ] Filter by status (running, completed, failed)
- [ ] View function details
- [ ] View event payload
- [ ] View step-by-step execution
- [ ] View retry history

### 20. Logging
- [ ] Console logs show structured data
- [ ] Function names included in logs
- [ ] Contact emails visible in logs
- [ ] Event titles visible in logs
- [ ] Error details logged completely

### 21. Database Queries
Run these queries to verify data:

```sql
-- Recent message sends
SELECT
  sm.id,
  c.email,
  sm.channel,
  sm.status,
  mt.slug AS template,
  sm.sent_at
FROM sent_messages sm
JOIN contacts c ON sm.contact_id = c.id
LEFT JOIN message_templates mt ON sm.template_id = mt.id
ORDER BY sm.created_at DESC
LIMIT 10;

-- Registrations with reminders
SELECT
  r.id,
  c.email,
  e.title,
  r.reminders_sent
FROM registrations r
JOIN contacts c ON r.contact_id = c.id
JOIN events e ON r.event_id = e.id
WHERE r.reminders_sent != '[]'::jsonb
ORDER BY r.created_at DESC;

-- Message templates
SELECT slug, name, channel, is_active
FROM message_templates
ORDER BY created_at DESC;
```

- [ ] All queries return expected data
- [ ] No orphaned records
- [ ] Timestamps are accurate

## Documentation

### 22. Documentation Completeness
- [ ] README files exist and are readable
- [ ] Code comments are clear
- [ ] API documentation is accurate
- [ ] Environment variables documented
- [ ] Deployment steps documented

### 23. Example Usage
- [ ] Quick start guide works end-to-end
- [ ] Test scripts work as documented
- [ ] NPM scripts work as documented
- [ ] Environment setup is clear

## Cleanup

### 24. Test Data
- [ ] Test contacts can be deleted
- [ ] Test events can be deleted
- [ ] Test messages can be deleted
- [ ] No orphaned records remain

### 25. Reset State
- [ ] Can reset to clean state
- [ ] Re-run tests produce same results
- [ ] No duplicate data created

## Production Readiness

### 26. Environment Variables
- [ ] All production variables documented
- [ ] Sensitive data not in code
- [ ] `.env.example` is complete
- [ ] `.gitignore` excludes `.env.local`

### 27. Error Handling
- [ ] All external calls wrapped in try/catch
- [ ] Errors logged with context
- [ ] Graceful degradation where possible
- [ ] User-friendly error messages

### 28. Security
- [ ] No secrets in code
- [ ] Database queries use parameterized inputs
- [ ] API endpoints validate input
- [ ] Consent checked before sending

### 29. Scalability
- [ ] Rate limits configured
- [ ] Database indexes present
- [ ] Functions are idempotent
- [ ] Can handle concurrent requests

### 30. Monitoring
- [ ] Inngest dashboard accessible
- [ ] Database queries performant
- [ ] Logs are structured
- [ ] Errors are trackable

## Final Verification

### All Systems Go
- [ ] All tests above passed
- [ ] No errors in console
- [ ] Dashboard shows healthy state
- [ ] Database is consistent
- [ ] Documentation is complete

### Ready for Next Steps
- [ ] Resend integration can begin
- [ ] Twilio integration can begin
- [ ] Webhook handlers can be added
- [ ] Production deployment can proceed

---

## Notes

Use this space to record any issues or observations:

```
Date: ___________
Tester: ___________

Issues Found:


Observations:


Performance Notes:


```

---

**Checklist Version:** 1.0.0
**Last Updated:** 2025-09-30
**Total Items:** 30 categories, 100+ individual checks
