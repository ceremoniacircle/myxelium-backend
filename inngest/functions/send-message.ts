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
        // === SMS SENDING (PLACEHOLDER - TODO: Integrate Twilio) ===
        console.log('\n=== SMS SEND (PLACEHOLDER) ===');
        console.log(`Message ID: ${messageId}`);
        console.log(`Template: ${templateType}`);
        console.log(`Contact: ${contact.first_name} ${contact.last_name}`);
        console.log(`Phone: ${contact.phone}`);

        if (eventData) {
          console.log(`Event: ${eventData.title}`);
        }

        console.log('=================================\n');

        // Simulate successful send
        return {
          success: true,
          providerMessageId: `twilio-placeholder-${Date.now()}`,
          provider: 'twilio',
        };
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
