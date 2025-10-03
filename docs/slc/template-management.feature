# =============================================================================
# GHERKIN FEATURE SPECIFICATION
# Generated from: /Users/austinmao/Documents/GitHub/ceremonia-v2/myxelium-backend/docs/SLC_PLAN.md
# Generated on: 2025-10-03
# Feature: Email/SMS Template Management
# Coverage: 6 acceptance criteria, 13 scenarios
#
# AI AGENT NOTES:
# - Templates stored in /templates directory (version controlled)
# - Variable replacement uses {{variableName}} syntax
# - All email templates have HTML + plain text versions
# - SMS templates strictly limited to 160 characters
# - Unsubscribe links required for all emails (CAN-SPAM)
# - Brand voice compliance validated against brand guidelines
# =============================================================================

@templates @content
Feature: Email and SMS Template Management
  Static template system for all message types with personalization,
  character limits, and compliance requirements.

  As the Myxelium backend system
  I want to render message templates with personalized variables
  So that contacts receive brand-consistent, compliant communications

  Background:
    Given the template directory exists at "/templates"
    And brand guidelines are loaded from config

  # ============================================================================
  # HAPPY PATH SCENARIOS - Template Rendering
  # ============================================================================

  @smoke @happy-path
  Scenario: Render welcome email template with personalized variables
    Given the template file "/templates/email/welcome.html" exists
    And the template contains:
      """
      <h1>You're registered for {{eventTitle}}!</h1>
      <p>Hi {{firstName}},</p>
      <p>We're excited to have you join us for <strong>{{eventTitle}}</strong> on {{eventDate}}.</p>
      <p><a href="{{joinUrl}}">Click here to join</a> when it's time.</p>
      <p><small><a href="{{unsubscribeUrl}}">Unsubscribe</a></small></p>
      """
    When the template is rendered with variables:
      | variable        | value                                |
      | firstName       | Alice                                |
      | eventTitle      | AI Automation Masterclass            |
      | eventDate       | October 10, 2025 at 2:00 PM MDT      |
      | joinUrl         | https://zoom.us/j/12345?pwd=abc      |
      | unsubscribeUrl  | https://ceremonia.com/unsubscribe/token123 |
    Then the rendered HTML should be:
      """
      <h1>You're registered for AI Automation Masterclass!</h1>
      <p>Hi Alice,</p>
      <p>We're excited to have you join us for <strong>AI Automation Masterclass</strong> on October 10, 2025 at 2:00 PM MDT.</p>
      <p><a href="https://zoom.us/j/12345?pwd=abc">Click here to join</a> when it's time.</p>
      <p><small><a href="https://ceremonia.com/unsubscribe/token123">Unsubscribe</a></small></p>
      """

  @happy-path @personalization
  Scenario: Render T-24h reminder email with all variables replaced
    Given the template "/templates/email/reminder-24h.html" exists
    When the template is rendered with contact and event data
    Then all {{variable}} placeholders should be replaced
    And no {{...}} syntax should remain in output
    And the subject line should be "Reminder: {{eventTitle}} starts tomorrow" → "Reminder: AI Automation Masterclass starts tomorrow"

  @happy-path @text-fallback
  Scenario: Render plain text version of email for email clients without HTML
    Given the template "/templates/email/welcome.txt" exists with:
      """
      You're registered for {{eventTitle}}!

      Hi {{firstName}},

      We're excited to have you join us for {{eventTitle}} on {{eventDate}}.

      Join here: {{joinUrl}}

      ---
      Unsubscribe: {{unsubscribeUrl}}
      """
    When the template is rendered with same variables as HTML version
    Then the plain text output should have no HTML tags
    And the plain text should be readable in any email client
    And the plain text should contain same information as HTML version

  # ============================================================================
  # HAPPY PATH SCENARIOS - SMS Templates
  # ============================================================================

  @happy-path @sms
  Scenario: Render T-1h SMS reminder template under 160 character limit
    Given the template "/templates/sms/reminder-1h.txt" exists with:
      """
      Hi {{firstName}}! {{eventTitle}} starts in 1 hour. Join: {{joinUrl}} - Ceremonía. Reply STOP to opt-out.
      """
    When the template is rendered with:
      | firstName  | Alice                      |
      | eventTitle | AI Masterclass             |
      | joinUrl    | https://zoom.us/j/12345    |
    Then the rendered SMS should be:
      """
      Hi Alice! AI Masterclass starts in 1 hour. Join: https://zoom.us/j/12345 - Ceremonía. Reply STOP to opt-out.
      """
    And the character count should be exactly 106 characters
    And the character count should be less than or equal to 160

  @happy-path @sms
  Scenario: Render re-engagement SMS for no-shows
    Given the template "/templates/sms/reengagement.txt" exists
    When the template is rendered with contact data
    Then the SMS should contain "Sorry we missed you"
    And the SMS should contain "Watch the replay"
    And the SMS should contain Zoom replay URL
    And the SMS should contain "Reply STOP to opt-out"
    And the character count should be ≤ 160

  # ============================================================================
  # HAPPY PATH SCENARIOS - Unsubscribe Links
  # ============================================================================

  @happy-path @compliance
  Scenario: All email templates include unsubscribe link
    Given the following email templates exist:
      | template_file             |
      | /templates/email/welcome.html |
      | /templates/email/reminder-24h.html |
      | /templates/email/reminder-1h.html |
      | /templates/email/thank-you.html |
      | /templates/email/sorry-missed.html |
    When each template is validated for CAN-SPAM compliance
    Then each template should contain {{unsubscribeUrl}} variable
    And each template should have link text "Unsubscribe" or "Opt out"
    And the unsubscribe link should be visible (not hidden)

  @happy-path @compliance
  Scenario: Unsubscribe link updates contact consent in database
    Given a contact exists with consent_email = true
    When the contact clicks unsubscribe link with token "unsub_abc123"
    And a GET request is received at "/api/unsubscribe?token=unsub_abc123"
    Then the token should be validated
    And the contact's consent_email should be updated to false
    And the response should display message "You have been unsubscribed"
    And the contact should receive confirmation email

  # ============================================================================
  # HAPPY PATH SCENARIOS - Mobile Responsiveness
  # ============================================================================

  @happy-path @responsive
  Scenario: HTML email templates are mobile-responsive
    Given the template "/templates/email/welcome.html" includes CSS:
      """
      <style>
        @media only screen and (max-width: 600px) {
          .content { width: 100% !important; }
          .button { display: block !important; width: 100% !important; }
        }
      </style>
      """
    When the email is rendered on mobile device (viewport 375px)
    Then the content should scale to 100% width
    And the CTA button should be full-width and tappable
    And all text should be readable without zooming

  # ============================================================================
  # ERROR SCENARIOS - Variable Validation
  # ============================================================================

  @error-handling @validation
  Scenario: Handle missing variable with fallback value
    Given the template contains "Hi {{firstName}},"
    And the contact has first_name = null
    When the template is rendered
    Then the {{firstName}} should be replaced with fallback "there"
    And the rendered output should be "Hi there,"

  @error-handling @validation
  Scenario: Warn when required variable is missing from data
    Given the template contains "Join {{joinUrl}}"
    And the render data does not include joinUrl variable
    When the template rendering is attempted
    Then a warning should be logged "Missing required variable: joinUrl"
    And the template should render with placeholder "[Missing joinUrl]"
    And an alert should be sent to admin

  # ============================================================================
  # ERROR SCENARIOS - Character Limit Enforcement
  # ============================================================================

  @error-handling @sms-limit
  Scenario: Reject SMS template exceeding 160 character limit
    Given an SMS template renders to 165 characters after variable replacement
    When the SMS send is attempted
    Then the send should fail with error "SMS body exceeds 160 character limit (165 chars)"
    And the message should not be sent
    And an admin alert should be created with template slug and character count

  @error-handling @sms-limit
  Scenario Outline: Validate SMS character count for different variable lengths
    Given the SMS template is "Hi {{firstName}}! {{eventTitle}} starts soon. Join: {{joinUrl}} - Ceremonía. STOP to opt-out."
    When the template is rendered with:
      | firstName  | <first_name> |
      | eventTitle | <event_title> |
      | joinUrl    | <join_url>    |
    Then the character count should be <char_count>
    And the validation result should be <result>

    Examples:
      | first_name | event_title           | join_url                  | char_count | result  |
      | Al         | Webinar               | zoom.us/j/1               | 85         | valid   |
      | Alexandra  | AI Automation Workshop | zoom.us/j/123456789?pwd=x | 125        | valid   |
      | Christopher | Advanced Machine Learning Masterclass | zoom.us/j/999999999?pwd=verylongpassword123 | 175        | invalid |

  # ============================================================================
  # HAPPY PATH SCENARIOS - Brand Voice Validation
  # ============================================================================

  @happy-path @brand-compliance
  Scenario: Templates use Ceremonía brand voice and tone
    Given brand guidelines specify:
      | attribute | value                    |
      | voice     | Warm and inviting        |
      | tone      | Professional yet friendly |
      | avoid     | Jargon, exclamation marks |
    When all email templates are validated
    Then templates should use "We're excited" not "We are thrilled!!!"
    And templates should use "Join us" not "Attend our session"
    And templates should avoid technical jargon like "leverage synergies"

# =============================================================================
# COVERAGE REPORT
# =============================================================================
#
# ✓ FULLY COVERED ACCEPTANCE CRITERIA:
# - AC-5.1: All templates render correctly with personalized variables → Scenario: "Render welcome email template with personalized variables"
# - AC-5.2: HTML emails are mobile-responsive → Scenario: "HTML email templates are mobile-responsive"
# - AC-5.3: Plain text fallbacks provided for all emails → Scenario: "Render plain text version of email for email clients without HTML"
# - AC-5.4: Unsubscribe links work and update consent in DB → Scenarios: "All email templates include unsubscribe link", "Unsubscribe link updates contact consent in database"
# - AC-5.5: SMS templates stay under 160 characters → Scenarios: "Render T-1h SMS reminder template under 160 character limit", "Reject SMS template exceeding 160 character limit"
# - AC-5.6: Templates use Ceremonía brand voice and tone → Scenario: "Templates use Ceremonía brand voice and tone"
#
# ✓ ADDITIONAL COVERAGE:
# - Variable fallback for missing data
# - Missing variable warnings
# - Character count validation with variable length scenarios
# - CAN-SPAM compliance (unsubscribe required)
# - TCPA compliance (STOP keyword in SMS)
#
# ❌ NOT COVERED (OUT OF SCOPE):
# - AI-generated templates (deferred to post-SLC)
# - A/B testing variants (deferred to post-SLC)
# - Template versioning (manual Git versioning sufficient for SLC)
# - Multi-language support (English-only for SLC)
#
# STATISTICS:
# - Total Scenarios: 13
# - Happy Path: 8
# - Error Scenarios: 4
# - Compliance: 2
# - Coverage: 100% of acceptance criteria
# =============================================================================
