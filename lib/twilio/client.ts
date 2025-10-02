/**
 * Twilio SMS Client Configuration
 *
 * Configures and exports the Twilio client instance for sending SMS messages.
 *
 * Setup Instructions:
 * 1. Sign up at https://www.twilio.com/try-twilio
 * 2. Get your Account SID and Auth Token from https://console.twilio.com
 * 3. Purchase a phone number at https://console.twilio.com/us1/develop/phone-numbers/manage/search
 * 4. Add credentials to your .env.local file:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_PHONE_NUMBER (in E.164 format: +1234567890)
 */

import twilio from 'twilio';

// Get credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Validate credentials exist
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error(
    '[Twilio] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variable is not set. SMS sending will fail.'
  );
  console.error('[Twilio] Get your credentials from https://console.twilio.com');
}

if (!TWILIO_PHONE_NUMBER) {
  console.error(
    '[Twilio] TWILIO_PHONE_NUMBER environment variable is not set. SMS sending will fail.'
  );
  console.error('[Twilio] Purchase a phone number at https://console.twilio.com/us1/develop/phone-numbers/manage/search');
}

// Create and export Twilio client instance
export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Rate limit configuration (Twilio default: 100 messages/second per account)
export const RATE_LIMIT_PER_MINUTE = 100;
export const RATE_LIMIT_PER_SECOND = 10;

// SMS length limits
export const SMS_MAX_LENGTH = 160; // Single SMS segment
export const SMS_MAX_LENGTH_EXTENDED = 1600; // Maximum for multi-segment

// Quiet hours (9am-9pm local time)
export const QUIET_HOURS_START = 9; // 9 AM
export const QUIET_HOURS_END = 21; // 9 PM

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}
