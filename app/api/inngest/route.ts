/**
 * Inngest API Route
 *
 * Serves the Inngest webhook handler for Next.js App Router.
 * This endpoint is used by Inngest to trigger and manage functions.
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';

// Import all Inngest functions
import { preEventFunnel } from '@/inngest/functions/event-funnel';
import {
  postEventFunnel,
  sendResourcesEmail,
  sendNurtureEmail,
  sendReengagementMessage,
  sendFinalFollowup,
} from '@/inngest/functions/post-event-funnel';
import { sendMessage } from '@/inngest/functions/send-message';

/**
 * Register all Inngest functions
 */
const functions = [
  // Pre-event campaign
  preEventFunnel,

  // Post-event campaigns
  postEventFunnel,
  sendResourcesEmail,
  sendNurtureEmail,
  sendReengagementMessage,
  sendFinalFollowup,

  // Generic message sender
  sendMessage,
];

/**
 * Create Inngest handler for Next.js App Router
 */
const handler = serve({
  client: inngest,
  functions,
  streaming: 'allow', // Enable streaming for better performance
});

/**
 * Export HTTP methods
 */
export { handler as GET, handler as POST, handler as PUT };
