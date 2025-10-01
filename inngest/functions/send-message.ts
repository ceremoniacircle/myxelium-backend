/**
 * Generic Message Sender Function
 *
 * Reusable Inngest function for sending messages across channels.
 * Currently logs messages as placeholders for Resend/Twilio integration.
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

    // Step 4: Send message (placeholder - will integrate Resend/Twilio later)
    const sendResult = await step.run('send-message', async () => {
      console.log('\n=== MESSAGE SEND (PLACEHOLDER) ===');
      console.log(`Message ID: ${messageId}`);
      console.log(`Channel: ${channel}`);
      console.log(`Template: ${templateType}`);
      console.log(`Contact: ${contact.first_name} ${contact.last_name} (${contact.email})`);
      console.log(`Recipient: ${channel === 'email' ? contact.email : contact.phone}`);

      if (eventData) {
        console.log(`Event: ${eventData.title}`);
        console.log(`Scheduled: ${eventData.scheduled_at}`);
      }

      if (registration?.platform_join_url) {
        console.log(`Join URL: ${registration.platform_join_url}`);
      }

      console.log('=================================\n');

      // Simulate successful send
      // TODO: Replace with actual Resend/Twilio integration
      return {
        success: true,
        providerMessageId: `placeholder-${Date.now()}`,
        provider: channel === 'email' ? 'resend' : 'twilio',
      };
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
