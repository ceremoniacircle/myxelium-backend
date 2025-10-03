# =============================================================================
# GHERKIN FEATURE SPECIFICATION
# Generated from: /Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/docs/SLC_PLAN.md
# Generated on: 2025-10-03
# Feature: Admin Dashboard - Message Monitoring
# Coverage: 6 acceptance criteria, 16 scenarios
#
# AI AGENT NOTES:
# - All endpoints require basic authentication (deferred JWT to post-SLC)
# - All list endpoints support filtering, pagination, and sorting
# - All responses return within 2 seconds (performance requirement)
# - CSV export includes all relevant data fields
# - Real-time updates via polling (30-second intervals)
# =============================================================================

@admin @api @dashboard
Feature: Admin Dashboard for Message Monitoring
  Admin API endpoints for viewing message history, contact details,
  event analytics, and CSV export with filtering and access control.

  As a Ceremonía marketing team member
  I want to monitor funnel performance and message delivery
  So that I can troubleshoot issues and measure campaign success

  Background:
    Given I am authenticated as an admin user
    And the database contains test data

  # ============================================================================
  # HAPPY PATH SCENARIOS - Message Listing
  # ============================================================================

  @smoke @happy-path
  Scenario: List all sent messages with pagination
    Given 100 sent_messages exist in database
    When I send GET to "/api/admin/messages?page=1&limit=20"
    Then the response status should be 200
    And the response JSON should match schema:
      """
      {
        "messages": [
          {
            "id": "<uuid>",
            "contact_id": "<uuid>",
            "event_id": "<uuid>",
            "channel": "<email|sms>",
            "provider": "<resend|twilio>",
            "status": "<queued|sent|delivered|opened|clicked|failed>",
            "subject": "<string|null>",
            "sent_at": "<iso8601-timestamp>",
            "delivered_at": "<iso8601-timestamp|null>",
            "opened_at": "<iso8601-timestamp|null>",
            "clicked_at": "<iso8601-timestamp|null>",
            "contact": {
              "email": "<email>",
              "first_name": "<string>",
              "last_name": "<string>"
            },
            "event": {
              "title": "<string>"
            }
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 100,
          "total_pages": 5
        }
      }
      """
    And the response time should be less than 2000 milliseconds

  @happy-path @filtering
  Scenario: Filter messages by event ID
    Given the following sent_messages exist:
      | contact_email    | event_id                              | channel | status    |
      | alice@example.com | 550e8400-e29b-41d4-a716-446655440000 | email   | delivered |
      | bob@example.com   | 550e8400-e29b-41d4-a716-446655440000 | sms     | sent      |
      | carol@example.com | 660e9500-e29b-41d4-a716-446655440111 | email   | opened    |
    When I send GET to "/api/admin/messages?eventId=550e8400-e29b-41d4-a716-446655440000"
    Then the response should include 2 messages
    And all messages should have event_id "550e8400-e29b-41d4-a716-446655440000"
    And the message for carol@example.com should NOT be included

  @happy-path @filtering
  Scenario: Filter messages by channel (email or SMS)
    Given 50 email messages and 30 SMS messages exist
    When I send GET to "/api/admin/messages?channel=sms"
    Then the response should include exactly 30 messages
    And all messages should have channel "sms"

  @happy-path @filtering
  Scenario: Filter messages by status
    Given messages exist with various statuses
    When I send GET to "/api/admin/messages?status=failed"
    Then only messages with status "failed" should be returned
    And the response should include error_message field for failed messages

  @happy-path @filtering
  Scenario: Filter messages by contact ID
    Given a contact "alice@example.com" has 5 sent messages
    And a contact "bob@example.com" has 3 sent messages
    When I send GET to "/api/admin/messages?contactId=<alice-contact-id>"
    Then the response should include exactly 5 messages
    And all messages should be for contact alice@example.com

  # ============================================================================
  # HAPPY PATH SCENARIOS - Contact Message History
  # ============================================================================

  @happy-path @contact-detail
  Scenario: View complete message history for a contact
    Given a contact exists with:
      | id         | 123e4567-e89b-12d3-a456-426614174000 |
      | email      | alice@example.com                    |
      | first_name | Alice                                |
    And the contact has the following message history:
      | channel | step | status    | sent_at              |
      | email   | 0    | opened    | 2025-10-01T10:00:00Z |
      | email   | 1    | delivered | 2025-10-02T10:00:00Z |
      | sms     | 2    | delivered | 2025-10-03T13:00:00Z |
      | email   | 3    | clicked   | 2025-10-03T15:00:00Z |
    When I send GET to "/api/admin/contacts/123e4567-e89b-12d3-a456-426614174000"
    Then the response status should be 200
    And the response should include contact details:
      """
      {
        "contact": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "email": "alice@example.com",
          "first_name": "Alice",
          "phone": "<string|null>",
          "consent_email": true,
          "consent_sms": "<boolean>"
        },
        "message_history": [
          {
            "channel": "email",
            "step": 0,
            "status": "opened",
            "sent_at": "2025-10-01T10:00:00Z"
          },
          {
            "channel": "email",
            "step": 1,
            "status": "delivered",
            "sent_at": "2025-10-02T10:00:00Z"
          },
          {
            "channel": "sms",
            "step": 2,
            "status": "delivered",
            "sent_at": "2025-10-03T13:00:00Z"
          },
          {
            "channel": "email",
            "step": 3,
            "status": "clicked",
            "sent_at": "2025-10-03T15:00:00Z"
          }
        ],
        "enrollments": [
          {
            "event_id": "<uuid>",
            "event_title": "AI Automation Masterclass",
            "attended": true,
            "enrolled_at": "<iso8601-timestamp>"
          }
        ]
      }
      """

  # ============================================================================
  # HAPPY PATH SCENARIOS - Event Analytics
  # ============================================================================

  @happy-path @analytics
  Scenario: View funnel analytics for a specific event
    Given an event exists with id "550e8400-e29b-41d4-a716-446655440000"
    And the event has the following data:
      | metric                | count |
      | total_enrollments     | 100   |
      | total_attended        | 35    |
      | emails_sent           | 300   |
      | emails_delivered      | 285   |
      | emails_opened         | 120   |
      | emails_clicked        | 45    |
      | sms_sent              | 100   |
      | sms_delivered         | 98    |
    When I send GET to "/api/admin/events/550e8400-e29b-41d4-a716-446655440000/analytics"
    Then the response status should be 200
    And the response JSON should be:
      """
      {
        "event": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "AI Automation Masterclass",
          "scheduled_at": "<iso8601-timestamp>",
          "status": "completed"
        },
        "metrics": {
          "enrolled": 100,
          "attended": 35,
          "attendance_rate": 0.35,
          "emails_sent": 300,
          "emails_delivered": 285,
          "emails_opened": 120,
          "emails_clicked": 45,
          "email_delivery_rate": 0.95,
          "email_open_rate": 0.40,
          "email_click_rate": 0.15,
          "sms_sent": 100,
          "sms_delivered": 98,
          "sms_delivery_rate": 0.98
        },
        "funnel": [
          { "stage": "enrolled", "count": 100, "rate": 1.00 },
          { "stage": "attended", "count": 35, "rate": 0.35 },
          { "stage": "email_opened", "count": 120, "rate": 0.40 },
          { "stage": "email_clicked", "count": 45, "rate": 0.15 }
        ]
      }
      """

  @happy-path @analytics
  Scenario: Analytics endpoint calculates rates correctly
    Given an event has:
      | total_enrollments | 50  |
      | total_attended    | 20  |
      | emails_delivered  | 150 |
      | emails_opened     | 75  |
    When the analytics are calculated
    Then the attendance_rate should be 0.40 (20/50)
    And the email_open_rate should be 0.50 (75/150)

  # ============================================================================
  # HAPPY PATH SCENARIOS - CSV Export
  # ============================================================================

  @happy-path @export
  Scenario: Export messages to CSV with all data fields
    Given 10 sent_messages exist with complete data
    When I send GET to "/api/admin/messages/export?format=csv"
    Then the response status should be 200
    And the response header "Content-Type" should be "text/csv"
    And the response header "Content-Disposition" should be "attachment; filename=messages_2025-10-03.csv"
    And the CSV should have headers:
      """
      id,contact_email,contact_name,event_title,channel,provider,status,subject,sent_at,delivered_at,opened_at,clicked_at,error_message
      """
    And the CSV should contain 10 data rows
    And each row should include all exported fields

  @happy-path @export
  Scenario: Export filtered messages to CSV
    Given 100 messages exist with various filters
    When I send GET to "/api/admin/messages/export?format=csv&eventId=550e8400&status=failed"
    Then only messages matching filters should be exported
    And the CSV filename should indicate filters: "messages_event-550e8400_status-failed_2025-10-03.csv"

  # ============================================================================
  # ERROR SCENARIOS - Authentication
  # ============================================================================

  @error-handling @auth
  Scenario: Reject request without authentication
    Given I have no authentication credentials
    When I send GET to "/api/admin/messages"
    Then the response status should be 401
    And the response JSON should be:
      """
      {
        "error": "Authentication required"
      }
      """

  @error-handling @auth
  Scenario: Reject request with invalid credentials
    Given I have invalid authentication credentials
    When I send GET to "/api/admin/messages"
    Then the response status should be 401
    And the response JSON should be:
      """
      {
        "error": "Invalid credentials"
      }
      """

  # ============================================================================
  # ERROR SCENARIOS - Validation
  # ============================================================================

  @error-handling @validation
  Scenario: Reject invalid pagination parameters
    When I send GET to "/api/admin/messages?page=-1&limit=1000"
    Then the response status should be 400
    And the response JSON should be:
      """
      {
        "error": "Validation failed",
        "details": {
          "page": "Must be positive integer",
          "limit": "Must be between 1 and 100"
        }
      }
      """

  @error-handling @not-found
  Scenario: Return 404 when contact does not exist
    When I send GET to "/api/admin/contacts/00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
    And the response JSON should be:
      """
      {
        "error": "Contact not found"
      }
      """

  # ============================================================================
  # EDGE CASES - Performance
  # ============================================================================

  @edge-case @performance
  Scenario: Ensure query performance with large dataset
    Given 10000 sent_messages exist in database
    When I send GET to "/api/admin/messages?page=1&limit=50"
    Then the response time should be less than 2000 milliseconds
    And the database query should use proper indexes
    And the query should include only necessary joins

  @edge-case @real-time
  Scenario: Admin dashboard shows recent status updates (polling)
    Given I am viewing the messages list
    And a sent_message has status "sent"
    When a webhook updates the message status to "delivered" after 30 seconds
    And the frontend polls "/api/admin/messages" every 30 seconds
    Then the next poll response should include updated status "delivered"
    And the delivered_at timestamp should be populated

# =============================================================================
# COVERAGE REPORT
# =============================================================================
#
# ✓ FULLY COVERED ACCEPTANCE CRITERIA:
# - AC-6.1: Message list shows status updates in real-time → Scenario: "Admin dashboard shows recent status updates (polling)"
# - AC-6.2: Contact detail view shows complete message history → Scenario: "View complete message history for a contact"
# - AC-6.3: Event analytics show funnel metrics → Scenario: "View funnel analytics for a specific event"
# - AC-6.4: Filters work correctly and return results quickly (<2s) → Scenarios: All filtering scenarios + performance scenario
# - AC-6.5: CSV export includes all relevant data fields → Scenario: "Export messages to CSV with all data fields"
# - AC-6.6: Dashboard is accessible only to authorized users → Scenarios: "Reject request without authentication", "Reject request with invalid credentials"
#
# ✓ ADDITIONAL COVERAGE:
# - Pagination support
# - Multiple filter combinations (event, channel, status, contact)
# - Analytics rate calculations
# - CSV export with filters
# - Invalid pagination parameters
# - 404 handling for non-existent resources
# - Performance with large datasets
#
# ❌ NOT COVERED (OUT OF SCOPE):
# - JWT authentication (using basic auth for SLC, JWT deferred to post-SLC)
# - Role-based access control (single admin role for SLC)
# - WebSocket real-time updates (polling sufficient for SLC)
# - Data visualization charts (raw metrics provided, visualization deferred)
#
# API ENDPOINT COVERAGE:
# ✓ GET /api/admin/messages (List: 1, Filters: 4, Pagination: 1, Auth errors: 2)
# ✓ GET /api/admin/contacts/:id (Success: 1, Not found: 1)
# ✓ GET /api/admin/events/:id/analytics (Success: 1, Calculations: 1)
# ✓ GET /api/admin/messages/export (CSV: 1, Filtered CSV: 1)
#
# STATISTICS:
# - Total Scenarios: 16
# - Happy Path: 10
# - Error Scenarios: 4
# - Edge Cases: 2
# - Coverage: 100% of acceptance criteria
# =============================================================================
