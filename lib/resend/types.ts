/**
 * Resend Email Provider Types
 *
 * Type definitions for Resend email integration
 */

/**
 * Parameters for sending an email via Resend
 */
export interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string; // Default: "Ceremonia <noreply@ceremonia.com>"
}

/**
 * Result of email send operation
 */
export interface EmailSendResult {
  id: string; // Resend message ID
  success: boolean;
  error?: string;
}

/**
 * Resend webhook event types
 */
export type ResendWebhookEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

/**
 * Resend webhook event payload
 */
export interface ResendWebhookEvent {
  type: ResendWebhookEventType;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // Additional fields based on event type
    link?: string; // For email.clicked
    bounce_type?: 'hard' | 'soft'; // For email.bounced
    complaint_type?: string; // For email.complained
  };
}
