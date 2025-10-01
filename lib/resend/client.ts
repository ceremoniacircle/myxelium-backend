/**
 * Resend Email Client Configuration
 *
 * Configures and exports the Resend client instance for sending emails.
 *
 * Setup Instructions:
 * 1. Sign up at https://resend.com
 * 2. Get your API key from https://resend.com/api-keys
 * 3. Add RESEND_API_KEY to your .env.local file
 * 4. Verify your domain at https://resend.com/domains
 */

import { Resend } from 'resend';

// Get API key from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Validate API key exists
if (!RESEND_API_KEY) {
  console.error(
    '[Resend] RESEND_API_KEY environment variable is not set. Email sending will fail.'
  );
  console.error('[Resend] Get your API key from https://resend.com/api-keys');
}

// Create and export Resend client instance
export const resend = new Resend(RESEND_API_KEY);

// Default sender configuration
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@ceremonia.com';
export const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME || 'Ceremonia';
export const DEFAULT_FROM = `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;

// Rate limit configuration (Resend free tier: 100 emails/day, paid: 100/second)
export const RATE_LIMIT_PER_MINUTE = 100;
export const RATE_LIMIT_PER_SECOND = 10;

/**
 * Check if Resend is properly configured
 */
export function isResendConfigured(): boolean {
  return !!RESEND_API_KEY;
}
