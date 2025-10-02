/**
 * Zoom Helper Functions
 *
 * Utility functions for Zoom webhook processing
 */

import crypto from 'crypto';
import type { ZoomWebhookEvent, ZoomWebhookVerificationResponse } from './types';

/**
 * Verify Zoom webhook signature using HMAC SHA-256
 *
 * Zoom signature format: v0={HMAC_SHA256(message, secretToken)}
 * where message = `v0:{timestamp}:{requestBody}`
 *
 * @param payload - Raw request body string
 * @param timestamp - x-zm-request-timestamp header
 * @param signature - x-zm-signature header
 * @param secretToken - Zoom webhook secret token
 * @returns True if signature is valid
 *
 * @example
 * ```typescript
 * const isValid = verifyZoomWebhookSignature(
 *   rawBody,
 *   request.headers.get('x-zm-request-timestamp'),
 *   request.headers.get('x-zm-signature'),
 *   process.env.ZOOM_WEBHOOK_SECRET_TOKEN
 * );
 * ```
 */
export function verifyZoomWebhookSignature(
  payload: string,
  timestamp: string | null,
  signature: string | null,
  secretToken: string
): boolean {
  if (!timestamp || !signature) {
    return false;
  }

  // Build the message: v0:{timestamp}:{requestBody}
  const message = `v0:${timestamp}:${payload}`;

  // Calculate HMAC SHA-256
  const hmac = crypto.createHmac('sha256', secretToken);
  hmac.update(message);
  const calculatedSignature = `v0=${hmac.digest('hex')}`;

  // Compare signatures (timing-safe comparison)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    // Buffer lengths don't match - invalid signature
    return false;
  }
}

/**
 * Handle Zoom's webhook URL verification challenge
 *
 * When setting up a webhook in Zoom, they send a plainToken that must be
 * encrypted using the webhook secret and returned.
 *
 * @param plainToken - Token sent by Zoom in verification request
 * @param secretToken - Zoom webhook secret token
 * @returns Object with plainToken and encryptedToken
 *
 * @example
 * ```typescript
 * const response = handleZoomChallenge(
 *   payload.payload.plainToken,
 *   process.env.ZOOM_WEBHOOK_SECRET_TOKEN
 * );
 * // Returns: { plainToken: "abc123", encryptedToken: "def456..." }
 * ```
 */
export function handleZoomChallenge(
  plainToken: string,
  secretToken: string
): ZoomWebhookVerificationResponse {
  // Create HMAC SHA-256 hash of plainToken
  const hmac = crypto.createHmac('sha256', secretToken);
  hmac.update(plainToken);
  const encryptedToken = hmac.digest('hex');

  return {
    plainToken,
    encryptedToken,
  };
}

/**
 * Extract participant email from Zoom webhook event
 *
 * Handles both meetings and webinars
 *
 * @param event - Zoom webhook event
 * @returns Participant email or null if not found
 */
export function extractParticipantEmail(event: ZoomWebhookEvent): string | null {
  return event.payload?.object?.participant?.email || null;
}

/**
 * Extract participant name from Zoom webhook event
 *
 * @param event - Zoom webhook event
 * @returns Participant name or null if not found
 */
export function extractParticipantName(event: ZoomWebhookEvent): string | null {
  return event.payload?.object?.participant?.user_name || null;
}

/**
 * Extract meeting/webinar ID from Zoom webhook event
 *
 * @param event - Zoom webhook event
 * @returns Meeting/Webinar ID as string
 */
export function extractMeetingId(event: ZoomWebhookEvent): string | null {
  return event.payload?.object?.id || null;
}

/**
 * Determine if event is a meeting or webinar based on event type
 *
 * @param event - Zoom webhook event
 * @returns 'zoom_meeting' or 'zoom_webinar'
 */
export function getZoomPlatformType(
  event: ZoomWebhookEvent
): 'zoom_meeting' | 'zoom_webinar' {
  const eventType = event.event;

  if (eventType.startsWith('webinar.')) {
    return 'zoom_webinar';
  }

  return 'zoom_meeting';
}

/**
 * Calculate attendance duration in minutes
 *
 * @param joinTime - ISO 8601 join time
 * @param leaveTime - ISO 8601 leave time
 * @returns Duration in minutes (rounded)
 */
export function calculateAttendanceDuration(
  joinTime: string,
  leaveTime: string
): number {
  try {
    const joinDate = new Date(joinTime);
    const leaveDate = new Date(leaveTime);

    const durationMs = leaveDate.getTime() - joinDate.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    return Math.max(0, durationMinutes); // Ensure non-negative
  } catch (error) {
    console.error('[zoom-helpers] Error calculating duration:', error);
    return 0;
  }
}

/**
 * Check if event is a participant join event
 *
 * @param event - Zoom webhook event
 * @returns True if participant joined
 */
export function isParticipantJoinEvent(event: ZoomWebhookEvent): boolean {
  return (
    event.event === 'meeting.participant_joined' ||
    event.event === 'webinar.participant_joined'
  );
}

/**
 * Check if event is a participant leave event
 *
 * @param event - Zoom webhook event
 * @returns True if participant left
 */
export function isParticipantLeaveEvent(event: ZoomWebhookEvent): boolean {
  return (
    event.event === 'meeting.participant_left' ||
    event.event === 'webinar.participant_left'
  );
}

/**
 * Check if event is a meeting/webinar ended event
 *
 * @param event - Zoom webhook event
 * @returns True if meeting/webinar ended
 */
export function isMeetingEndedEvent(event: ZoomWebhookEvent): boolean {
  return event.event === 'meeting.ended' || event.event === 'webinar.ended';
}

/**
 * Check if event is a meeting/webinar started event
 *
 * @param event - Zoom webhook event
 * @returns True if meeting/webinar started
 */
export function isMeetingStartedEvent(event: ZoomWebhookEvent): boolean {
  return event.event === 'meeting.started' || event.event === 'webinar.started';
}

/**
 * Format Zoom event timestamp to ISO 8601
 *
 * @param eventTs - Unix timestamp in milliseconds
 * @returns ISO 8601 timestamp string
 */
export function formatZoomTimestamp(eventTs: number): string {
  return new Date(eventTs).toISOString();
}
