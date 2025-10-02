/**
 * Twilio SMS Provider Types
 *
 * Type definitions for Twilio SMS integration
 */

/**
 * Parameters for sending an SMS via Twilio
 */
export interface SMSParams {
  to: string; // E.164 format (e.g., "+14155552671")
  message: string;
  from?: string; // Default: TWILIO_PHONE_NUMBER
}

/**
 * Result of SMS send operation
 */
export interface SMSSendResult {
  sid: string; // Twilio message SID
  success: boolean;
  error?: string;
}

/**
 * Twilio webhook event types (MessageStatus values)
 */
export type TwilioWebhookEventType =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered';

/**
 * Twilio webhook event payload
 *
 * Based on Twilio's Status Callback format:
 * https://www.twilio.com/docs/sms/tutorials/how-to-confirm-delivery-php#receive-status-events-in-your-web-application
 */
export interface TwilioWebhookEvent {
  MessageSid: string;
  MessageStatus: TwilioWebhookEventType;
  To: string;
  From: string;
  Body: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  // Additional fields that may be present
  SmsSid?: string;
  SmsStatus?: string;
  AccountSid?: string;
  ApiVersion?: string;
}

/**
 * Auto-response keywords
 */
export type AutoResponseKeyword = 'STOP' | 'START' | 'HELP';
