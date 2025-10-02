/**
 * Zoom Webhook Types
 *
 * Type definitions for Zoom webhook events
 */

/**
 * Zoom webhook event types we handle
 */
export type ZoomWebhookEventType =
  | 'meeting.started'
  | 'meeting.ended'
  | 'meeting.participant_joined'
  | 'meeting.participant_left'
  | 'webinar.started'
  | 'webinar.ended'
  | 'webinar.participant_joined'
  | 'webinar.participant_left'
  | 'endpoint.url_validation';

/**
 * Zoom webhook event payload
 */
export interface ZoomWebhookEvent {
  event: ZoomWebhookEventType;
  event_ts: number; // Unix timestamp in milliseconds
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string; // Meeting/Webinar ID
      host_id: string;
      topic: string;
      type: number;
      start_time?: string;
      end_time?: string;
      duration?: number;
      timezone?: string;
      participant?: {
        user_id: string;
        user_name: string;
        email: string;
        join_time: string;
        leave_time?: string;
        id: string; // Participant ID
        registrant_id?: string;
      };
    };
  };
}

/**
 * Zoom URL verification challenge (sent when configuring webhook)
 */
export interface ZoomWebhookVerification {
  event: 'endpoint.url_validation';
  payload: {
    plainToken: string;
  };
}

/**
 * Zoom URL verification response
 */
export interface ZoomWebhookVerificationResponse {
  plainToken: string;
  encryptedToken: string;
}
