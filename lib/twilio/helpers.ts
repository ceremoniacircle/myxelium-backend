/**
 * Twilio Helper Functions
 *
 * Utility functions for phone number validation, SMS formatting, and quiet hours
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { QUIET_HOURS_START, QUIET_HOURS_END, SMS_MAX_LENGTH } from './client';
import type { AutoResponseKeyword } from './types';

/**
 * Validate phone number format (E.164)
 *
 * @param phone - Phone number to validate
 * @returns True if valid E.164 format
 *
 * @example
 * ```typescript
 * validatePhoneNumber("+14155552671") // true
 * validatePhoneNumber("415-555-2671") // false
 * validatePhoneNumber("+1415555267") // false (too short)
 * ```
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;

  try {
    // Check if it's a valid phone number
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
}

/**
 * Normalize phone number to E.164 format
 *
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code (e.g., 'US')
 * @returns Phone number in E.164 format (+1234567890)
 *
 * @example
 * ```typescript
 * normalizePhoneNumber("(415) 555-2671", "US") // "+14155552671"
 * normalizePhoneNumber("415-555-2671", "US") // "+14155552671"
 * normalizePhoneNumber("+14155552671") // "+14155552671"
 * ```
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: string = 'US'
): string {
  if (!phone) return '';

  try {
    // Remove any whitespace
    phone = phone.trim();

    // If already in E.164 format and valid, return as-is
    if (phone.startsWith('+') && isValidPhoneNumber(phone)) {
      const phoneNumber = parsePhoneNumber(phone);
      return phoneNumber.number;
    }

    // Parse with default country
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phoneNumber = parsePhoneNumber(phone, defaultCountry as any);

    if (!phoneNumber) {
      throw new Error('Invalid phone number');
    }

    // Return E.164 format
    return phoneNumber.number;
  } catch (err) {
    console.error('[normalizePhoneNumber] Error normalizing phone:', err);
    return phone; // Return original if normalization fails
  }
}

/**
 * Personalize SMS template by replacing {{token}} placeholders with actual values
 *
 * @param template - Template string with {{token}} placeholders
 * @param data - Key-value pairs for token replacement
 * @returns Personalized string with tokens replaced
 *
 * @example
 * ```typescript
 * const result = personalizeSMSTemplate(
 *   "Hi {{firstName}}, join {{eventTitle}}!",
 *   { firstName: "John", eventTitle: "AI Webinar" }
 * );
 * // Returns: "Hi John, join AI Webinar!"
 * ```
 */
export function personalizeSMSTemplate(
  template: string,
  data: Record<string, string | null | undefined>
): string {
  if (!template) return '';

  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    const value = data[token];
    // Return empty string for missing/null/undefined values
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Truncate SMS to specified length, adding ellipsis if needed
 *
 * @param message - SMS message text
 * @param maxLength - Maximum length (default: 160 for single SMS segment)
 * @returns Truncated message
 *
 * @example
 * ```typescript
 * truncateSMS("This is a very long message...", 20)
 * // Returns: "This is a very lo..."
 * ```
 */
export function truncateSMS(message: string, maxLength: number = SMS_MAX_LENGTH): string {
  if (!message) return '';

  if (message.length <= maxLength) {
    return message;
  }

  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Check if current time is within quiet hours (9am-9pm local time)
 *
 * @param timezone - Timezone identifier (e.g., 'America/Los_Angeles')
 * @param time - Date object to check (defaults to now)
 * @returns True if within quiet hours (9am-9pm)
 *
 * @example
 * ```typescript
 * isWithinQuietHours("America/Los_Angeles", new Date("2025-10-01T14:00:00Z"))
 * // Returns: true (if it's between 9am-9pm in LA timezone)
 * ```
 */
export function isWithinQuietHours(
  timezone: string,
  time: Date = new Date()
): boolean {
  try {
    // Get hour in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });

    const hourString = formatter.format(time);
    const hour = parseInt(hourString, 10);

    // Check if within quiet hours (9am-9pm)
    return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
  } catch (err) {
    console.error('[isWithinQuietHours] Error checking quiet hours:', err);
    // Default to allowing sends if timezone parsing fails
    return true;
  }
}

/**
 * Calculate next available send time if outside quiet hours
 *
 * @param timezone - Timezone identifier
 * @param time - Date object to check (defaults to now)
 * @returns Next available send time (next 9am if outside quiet hours)
 */
export function getNextQuietHoursSendTime(
  timezone: string,
  time: Date = new Date()
): Date {
  if (isWithinQuietHours(timezone, time)) {
    return time; // Can send now
  }

  try {
    // Get current hour in timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });

    const hourString = formatter.format(time);
    const hour = parseInt(hourString, 10);

    // Create a new date for next 9am
    const nextSendTime = new Date(time);

    if (hour < QUIET_HOURS_START) {
      // Before 9am - send today at 9am
      nextSendTime.setHours(QUIET_HOURS_START, 0, 0, 0);
    } else {
      // After 9pm - send tomorrow at 9am
      nextSendTime.setDate(nextSendTime.getDate() + 1);
      nextSendTime.setHours(QUIET_HOURS_START, 0, 0, 0);
    }

    return nextSendTime;
  } catch (err) {
    console.error('[getNextQuietHoursSendTime] Error calculating next send time:', err);
    return time; // Return original time if calculation fails
  }
}

/**
 * Handle auto-response keywords (STOP, START, HELP)
 *
 * @param keyword - Keyword to check (case-insensitive)
 * @returns Auto-response message or null if not a keyword
 *
 * @example
 * ```typescript
 * handleAutoResponse("STOP")
 * // Returns: "You have successfully been unsubscribed..."
 *
 * handleAutoResponse("HELP")
 * // Returns: "Ceremonia: Reply STOP to unsubscribe..."
 *
 * handleAutoResponse("HELLO")
 * // Returns: null
 * ```
 */
export function handleAutoResponse(keyword: string): string | null {
  if (!keyword) return null;

  const normalized = keyword.trim().toUpperCase();

  switch (normalized as AutoResponseKeyword) {
    case 'STOP':
    case 'STOPALL':
    case 'UNSUBSCRIBE':
    case 'CANCEL':
    case 'END':
    case 'QUIT':
      return 'You have successfully been unsubscribed. You will not receive any more messages from us. Reply START to resubscribe.';

    case 'START':
    case 'YES':
    case 'UNSTOP':
      return 'You have successfully been re-subscribed to messages from us. Reply HELP for help. Reply STOP to unsubscribe.';

    case 'HELP':
    case 'INFO':
      return 'Ceremonia: Reply STOP to unsubscribe, START to resubscribe. Msg&Data rates may apply.';

    default:
      return null;
  }
}

/**
 * Check if a keyword is an auto-response keyword
 *
 * @param keyword - Keyword to check
 * @returns True if it's an auto-response keyword
 */
export function isAutoResponseKeyword(keyword: string): boolean {
  return handleAutoResponse(keyword) !== null;
}

/**
 * Build personalization data for SMS templates
 *
 * @param contact - Contact data
 * @param event - Event data (optional)
 * @param registration - Registration data (optional)
 * @returns Object with all available tokens for personalization
 */
export function buildSMSPersonalizationData(
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  },
  event?: {
    title?: string | null;
    scheduled_at?: string | null;
    timezone?: string | null;
  } | null,
  registration?: {
    platform_join_url?: string | null;
  } | null
): Record<string, string> {
  const data: Record<string, string> = {
    firstName: contact.first_name || '',
    lastName: contact.last_name || '',
    phone: contact.phone || '',
  };

  if (event) {
    data.eventTitle = event.title || '';

    if (event.scheduled_at) {
      // Format date for SMS (shorter format)
      try {
        const date = new Date(event.scheduled_at);
        const formatter = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: event.timezone || 'America/Los_Angeles',
        });
        data.eventDate = formatter.format(date);
      } catch {
        data.eventDate = event.scheduled_at;
      }
    }
  }

  if (registration?.platform_join_url) {
    data.joinUrl = registration.platform_join_url;
  }

  return data;
}
