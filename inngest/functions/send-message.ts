/**
 * Generic Message Sender Function
 *
 * Reusable Inngest function for sending messages across channels.
 * Integrated with Resend for email delivery and placeholder for SMS/Twilio.
 */

import { inngest } from '@/inngest/client';
import {
  createMessageSend,
  updateMessageSendStatus,
  hasConsent,
  getMessageData,
  type MessageChannel,
  type TemplateType,
} from '@/lib/inngest/helpers';
import { resend, DEFAULT_FROM, isResendConfigured } from '@/lib/resend/client';
import { personalizeTemplate, buildPersonalizationData, textToHtml } from '@/lib/resend/helpers';
import { twilioClient, TWILIO_PHONE_NUMBER, isTwilioConfigured } from '@/lib/twilio/client';
import {
  validatePhoneNumber,
  normalizePhoneNumber,
  personalizeSMSTemplate,
  buildSMSPersonalizationData,
  truncateSMS,
  isWithinQuietHours,
  getNextQuietHoursSendTime,
} from '@/lib/twilio/helpers';
import { NonRetriableError } from 'inngest';

interface SendMessageInput {
  contactId: string;
  registrationId?: string;
  campaignId?: string;
  templateType: TemplateType;
  channel: MessageChannel;
  stepType?: string; // For idempotency (e.g., 'welcome', '24h-reminder', '1h-reminder')
}

/**
 * Send Message Function
 *
 * Idempotent message sending with consent checks and placeholder logging.
 * Will be enhanced with actual Resend/Twilio integration in future.
 */
export const sendMessage = inngest.createFunction(
  {
    id: 'send-message',
    name: 'Send Message (Generic)',
    retries: 4,
    rateLimit: {
      limit: 100, // Max 100 messages per period
      period: '1m', // Per minute
    },
  },
  { event: 'message.send' },
  async ({ event, step }) => {
    const { contactId, registrationId, campaignId, templateType, channel, stepType } = event.data as SendMessageInput;

    // Step 1: Check consent
    const consentGranted = await step.run('check-consent', async () => {
      const hasValidConsent = await hasConsent(contactId, channel);

      if (!hasValidConsent) {
        console.log(`[send-message] No consent for ${channel} from contact ${contactId}`);
      }

      return hasValidConsent;
    });

    if (!consentGranted) {
      return {
        success: false,
        skipped: true,
        reason: 'no_consent',
        contactId,
        channel,
      };
    }

    // Step 2: Fetch message data
    const messageData = await step.run('fetch-message-data', async () => {
      return await getMessageData(contactId, registrationId);
    });

    const { contact, registration, event: eventData } = messageData;

    // Step 3: Create message send record
    const messageId = await step.run('create-message-record', async () => {
      const recipientEmail = channel === 'email' ? contact.email : undefined;
      const recipientPhone = channel === 'sms' ? contact.phone : undefined;

      // Build subject and body (placeholder for now)
      let subject: string | undefined;
      let bodyText = '';

      if (channel === 'email') {
        switch (templateType) {
          case 'welcome-email':
            subject = `You're registered for ${eventData?.title || 'the event'}!`;
            bodyText = `Hi ${contact.first_name || 'there'},\n\nYou're all set for "${eventData?.title}"!\n\nJoin URL: ${registration?.platform_join_url || 'Coming soon'}\n\nSee you there!`;
            break;
          case 'reminder-24h':
            subject = `Tomorrow: ${eventData?.title || 'Your Event'}`;
            bodyText = `Hi ${contact.first_name || 'there'},\n\nReminder: "${eventData?.title}" is happening tomorrow!\n\nJoin URL: ${registration?.platform_join_url}\n\nSee you soon!`;
            break;
          case 'reminder-1h':
            subject = `Starting in 1 hour: ${eventData?.title || 'Your Event'}`;
            bodyText = `Hi ${contact.first_name || 'there'},\n\n"${eventData?.title}" starts in 1 hour!\n\nJoin now: ${registration?.platform_join_url}\n\nSee you there!`;
            break;
          case 'thank-you':
            subject = `Thank you for attending ${eventData?.title || 'our event'}!`;
            bodyText = `Hi ${contact.first_name || 'there'},\n\nThank you for joining "${eventData?.title}"!\n\n${eventData?.replay_url ? `Replay: ${eventData.replay_url}` : 'Replay coming soon!'}\n\nWe hope you enjoyed it!`;
            break;
          case 'sorry-missed':
            subject = `We missed you at ${eventData?.title || 'our event'}`;
            bodyText = `Hi ${contact.first_name || 'there'},\n\nWe missed you at "${eventData?.title}"!\n\n${eventData?.replay_url ? `Watch the replay: ${eventData.replay_url}` : 'Replay coming soon!'}\n\nHope to see you next time!`;
            break;
          default:
            subject = 'Message from Ceremonia';
            bodyText = `Hi ${contact.first_name || 'there'},\n\nYou have a message.`;
        }
      } else if (channel === 'sms') {
        switch (templateType) {
          case 'reminder-24h-sms':
            bodyText = `Hi ${contact.first_name}! Reminder: "${eventData?.title}" tomorrow. Join: ${registration?.platform_join_url}`;
            break;
          case 'reminder-1h-sms':
            bodyText = `"${eventData?.title}" starts in 1 hour! Join now: ${registration?.platform_join_url}`;
            break;
          default:
            bodyText = `Message from Ceremonia`;
        }
      }

      return await createMessageSend({
        contactId,
        registrationId,
        campaignId,
        templateSlug: templateType,
        channel,
        recipientEmail,
        recipientPhone,
        subject,
        bodyText,
        status: 'queued',
      });
    });

    // Step 4: Send message via Resend (email) or placeholder (SMS)
    const sendResult = await step.run('send-message', async () => {
      if (channel === 'email') {
        // === EMAIL SENDING VIA RESEND ===

        // Check if Resend is configured
        if (!isResendConfigured()) {
          const error = 'Resend API key not configured. Set RESEND_API_KEY environment variable.';
          console.error(`[send-message] ${error}`);
          throw new NonRetriableError(error);
        }

        // Validate recipient email
        if (!contact.email) {
          const error = 'Contact has no email address';
          console.error(`[send-message] ${error} - Contact ID: ${contactId}`);
          throw new NonRetriableError(error);
        }

        // Build personalization data
        const personalizationData = buildPersonalizationData(contact, eventData, registration);

        // Build subject and body (with template variables replaced)
        let subject: string;
        let bodyText: string;
        let bodyHtml: string;

        switch (templateType) {
          case 'welcome-email':
            subject = personalizeTemplate(
              "You're registered for {{eventTitle}}!",
              personalizationData
            );
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\nYou're all set for "{{eventTitle}}"!\n\nJoin URL: {{joinUrl}}\n\nSee you there!\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
            break;

          case 'reminder-24h':
            subject = personalizeTemplate(
              'Tomorrow: {{eventTitle}}',
              personalizationData
            );
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\nReminder: "{{eventTitle}}" is happening tomorrow!\n\nEvent Date: {{eventDate}}\n\nJoin URL: {{joinUrl}}\n\nSee you soon!\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
            break;

          case 'reminder-1h':
            subject = personalizeTemplate(
              'Starting in 1 hour: {{eventTitle}}',
              personalizationData
            );
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\n"{{eventTitle}}" starts in 1 hour!\n\nJoin now: {{joinUrl}}\n\nSee you there!\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
            break;

          case 'thank-you':
            subject = personalizeTemplate(
              'Thank you for attending {{eventTitle}}!',
              personalizationData
            );
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\nThank you for joining "{{eventTitle}}"!\n\n${eventData?.replay_url ? `Replay: ${eventData.replay_url}` : 'Replay coming soon!'}\n\nWe hope you enjoyed it!\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
            break;

          case 'sorry-missed':
            subject = personalizeTemplate(
              'We missed you at {{eventTitle}}',
              personalizationData
            );
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\nWe missed you at "{{eventTitle}}"!\n\n${eventData?.replay_url ? `Watch the replay: ${eventData.replay_url}` : 'Replay coming soon!'}\n\nHope to see you next time!\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
            break;

          default:
            subject = 'Message from Ceremonia';
            bodyText = personalizeTemplate(
              `Hi {{firstName}},\n\nYou have a message.\n\nBest,\nThe Ceremonia Team`,
              personalizationData
            );
            bodyHtml = textToHtml(bodyText);
        }

        try {
          console.log(`[send-message] Sending email to ${contact.email} via Resend`);
          console.log(`[send-message] Template: ${templateType}, Subject: ${subject}`);

          // Send email via Resend
          const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM,
            to: contact.email,
            subject,
            html: bodyHtml,
            text: bodyText,
          });

          if (error) {
            // Handle Resend-specific errors
            console.error('[send-message] Resend API error:', error);

            // Check for rate limiting (429)
            if (error.message?.includes('rate limit') || error.message?.includes('429')) {
              // Throw retriable error for rate limiting - Inngest will retry with backoff
              throw new Error(`Rate limit exceeded: ${error.message}`);
            }

            // Check for invalid recipient (non-retriable)
            if (
              error.message?.includes('invalid') ||
              error.message?.includes('bounce') ||
              error.message?.includes('unsubscribe')
            ) {
              throw new NonRetriableError(`Invalid recipient: ${error.message}`);
            }

            // Other errors - retriable
            throw new Error(`Resend error: ${error.message}`);
          }

          console.log(`[send-message] Email sent successfully - Resend ID: ${data?.id}`);

          return {
            success: true,
            providerMessageId: data?.id || `resend-${Date.now()}`,
            provider: 'resend',
          };
        } catch (error: any) {
          // Re-throw NonRetriableError as-is
          if (error instanceof NonRetriableError) {
            throw error;
          }

          // Log and re-throw for Inngest retry logic
          console.error('[send-message] Error sending email:', error);
          throw error;
        }
      } else if (channel === 'sms') {
        // === SMS SENDING VIA TWILIO ===

        // Check if Twilio is configured
        if (!isTwilioConfigured()) {
          const error = 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.';
          console.error(`[send-message] ${error}`);
          throw new NonRetriableError(error);
        }

        // Validate recipient phone number
        if (!contact.phone) {
          const error = 'Contact has no phone number';
          console.error(`[send-message] ${error} - Contact ID: ${contactId}`);
          throw new NonRetriableError(error);
        }

        // Validate and normalize phone number
        const normalizedPhone = normalizePhoneNumber(contact.phone);
        if (!validatePhoneNumber(normalizedPhone)) {
          const error = `Invalid phone number format: ${contact.phone}`;
          console.error(`[send-message] ${error}`);
          throw new NonRetriableError(error);
        }

        // Check quiet hours (9am-9pm local time)
        const timezone = eventData?.timezone || 'America/Los_Angeles';
        const now = new Date();

        if (!isWithinQuietHours(timezone, now)) {
          const nextSendTime = getNextQuietHoursSendTime(timezone, now);
          const delayMs = nextSendTime.getTime() - now.getTime();

          console.log(
            `[send-message] Outside quiet hours. Delaying SMS until ${nextSendTime.toISOString()} (${delayMs}ms)`
          );

          // Schedule send for next quiet hours window
          // For now, we'll throw an error to retry later
          // TODO: Use Inngest's step.sleep() or step.waitForEvent() for better scheduling
          throw new Error(`Outside quiet hours. Retry after ${nextSendTime.toISOString()}`);
        }

        // Build personalization data
        const personalizationData = buildSMSPersonalizationData(contact, eventData, registration);

        // Build SMS message based on template
        let smsBody: string;

        switch (templateType) {
          case 'reminder-24h-sms':
            smsBody = personalizeSMSTemplate(
              'Hi {{firstName}}! Reminder: "{{eventTitle}}" tomorrow at {{eventDate}}. Join: {{joinUrl}}',
              personalizationData
            );
            break;

          case 'reminder-1h-sms':
            smsBody = personalizeSMSTemplate(
              '"{{eventTitle}}" starts in 1 hour! Join now: {{joinUrl}}',
              personalizationData
            );
            break;

          case 'welcome-sms':
            smsBody = personalizeSMSTemplate(
              'Hi {{firstName}}! You\'re registered for "{{eventTitle}}". Join link: {{joinUrl}}',
              personalizationData
            );
            break;

          case 'thank-you-sms':
            smsBody = personalizeSMSTemplate(
              'Thanks for joining "{{eventTitle}}", {{firstName}}! Hope you enjoyed it.',
              personalizationData
            );
            break;

          default:
            smsBody = personalizeSMSTemplate(
              'Message from Ceremonia',
              personalizationData
            );
        }

        // Truncate if too long (keep under 160 chars for single segment)
        smsBody = truncateSMS(smsBody, 160);

        try {
          console.log(`[send-message] Sending SMS to ${normalizedPhone} via Twilio`);
          console.log(`[send-message] Template: ${templateType}, Body: ${smsBody}`);

          // Send SMS via Twilio
          const message = await twilioClient.messages.create({
            body: smsBody,
            from: TWILIO_PHONE_NUMBER,
            to: normalizedPhone,
            // Enable status callbacks
            statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/api/webhooks/twilio`,
          });

          console.log(`[send-message] SMS sent successfully - Twilio SID: ${message.sid}`);

          return {
            success: true,
            providerMessageId: message.sid,
            provider: 'twilio',
          };
        } catch (error: any) {
          console.error('[send-message] Twilio API error:', error);

          // Check for invalid phone number (non-retriable)
          if (
            error.code === 21211 || // Invalid 'To' phone number
            error.code === 21614 || // 'To' number not verified (trial account)
            error.code === 21408    // Permission to send to this number is blocked
          ) {
            throw new NonRetriableError(`Invalid recipient: ${error.message}`);
          }

          // Check for rate limiting (retriable)
          if (error.code === 20429 || error.message?.includes('rate limit')) {
            throw new Error(`Rate limit exceeded: ${error.message}`);
          }

          // Check for insufficient balance (non-retriable)
          if (error.code === 21606) {
            throw new NonRetriableError(`Insufficient account balance: ${error.message}`);
          }

          // Other errors - retriable
          throw new Error(`Twilio error: ${error.message}`);
        }
      } else {
        // Unsupported channel
        throw new NonRetriableError(`Unsupported channel: ${channel}`);
      }
    });

    // Step 5: Update message status
    await step.run('update-message-status', async () => {
      await updateMessageSendStatus(messageId, 'sent', {
        providerMessageId: sendResult.providerMessageId,
        provider: sendResult.provider,
        sentAt: new Date().toISOString(),
      });
    });

    return {
      success: true,
      messageId,
      contactId,
      channel,
      templateType,
      provider: sendResult.provider,
    };
  }
);
