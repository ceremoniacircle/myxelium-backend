/**
 * Pre-Event Drip Campaign
 *
 * Orchestrates the 3-step pre-event sequence:
 * 1. Welcome email (immediate)
 * 2. 24-hour reminder (email + SMS)
 * 3. 1-hour reminder (email + SMS)
 */

import { inngest } from '@/inngest/client';
import { isEventValid, recordReminderSent } from '@/lib/inngest/helpers';
import { db } from '@/lib/db';

/**
 * Pre-Event Funnel Function
 *
 * Triggered by: event.enrolled
 * Executes time-based sequence relative to event scheduled time
 */
export const preEventFunnel = inngest.createFunction(
  {
    id: 'pre-event-funnel',
    name: 'Pre-Event Drip Campaign',
    retries: 4,
    throttle: {
      limit: 50, // Max 50 concurrent executions
      period: '1m',
    },
  },
  { event: 'event.enrolled' },
  async ({ event, step }) => {
    const {
      contactId,
      eventId,
      registrationId,
      eventTitle,
      scheduledAt,
      contactEmail,
      contactFirstName,
      joinUrl,
    } = event.data;

    console.log(`[pre-event-funnel] Starting for contact ${contactId} (${contactEmail}) - Event: ${eventTitle}`);

    const eventScheduledAt = new Date(scheduledAt);
    const now = new Date();

    // Calculate reminder times
    const twentyFourHoursBefore = new Date(eventScheduledAt.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(eventScheduledAt.getTime() - 60 * 60 * 1000);

    // Step 1: Send welcome email immediately
    const welcomeResult = await step.run('send-welcome-email', async () => {
      console.log(`[pre-event-funnel] Sending welcome email to ${contactEmail}`);

      // Send welcome email
      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'welcome-email',
          channel: 'email',
          stepType: 'welcome',
        },
      });

      return {
        success: true,
        step: 'welcome',
        sentAt: new Date().toISOString(),
      };
    });

    // Step 2: Wait until 24 hours before event, then send reminders
    if (twentyFourHoursBefore > now) {
      await step.sleepUntil('wait-24h-reminder', twentyFourHoursBefore);

      // Check if event is still valid before sending
      const eventStillValid = await step.run('check-event-valid-24h', async () => {
        return await isEventValid(eventId);
      });

      if (eventStillValid) {
        // Send 24h reminder email
        const email24hResult = await step.run('send-24h-reminder-email', async () => {
          console.log(`[pre-event-funnel] Sending 24h reminder email to ${contactEmail}`);

          await inngest.send({
            name: 'message.send',
            data: {
              contactId,
              registrationId,
              campaignId: undefined,
              templateType: 'reminder-24h',
              channel: 'email',
              stepType: '24h-reminder',
            },
          });

          return {
            success: true,
            step: '24h-reminder-email',
            sentAt: new Date().toISOString(),
          };
        });

        // Send 24h reminder SMS (if contact has phone number)
        const sms24hResult = await step.run('send-24h-reminder-sms', async () => {
          // Check if contact has phone number
          const { data: contact } = await db
            .from('contacts')
            .select('phone')
            .eq('id', contactId)
            .maybeSingle();

          if (!contact?.phone) {
            console.log(`[pre-event-funnel] Skipping 24h SMS - no phone number for ${contactEmail}`);
            return { success: false, skipped: true, reason: 'no_phone' };
          }

          console.log(`[pre-event-funnel] Sending 24h reminder SMS to ${contact.phone}`);

          await inngest.send({
            name: 'message.send',
            data: {
              contactId,
              registrationId,
              campaignId: undefined,
              templateType: 'reminder-24h-sms',
              channel: 'sms',
              stepType: '24h-reminder',
            },
          });

          return {
            success: true,
            step: '24h-reminder-sms',
            sentAt: new Date().toISOString(),
          };
        });

        console.log(`[pre-event-funnel] 24h reminders sent - Email: ${email24hResult.success}, SMS: ${sms24hResult.success}`);
      } else {
        console.log(`[pre-event-funnel] Event ${eventId} no longer valid, skipping 24h reminders`);
      }
    } else {
      console.log(`[pre-event-funnel] Skipping 24h reminder - event is less than 24 hours away`);
    }

    // Step 3: Wait until 1 hour before event, then send final reminders
    if (oneHourBefore > now) {
      await step.sleepUntil('wait-1h-reminder', oneHourBefore);

      // Check if event is still valid before sending
      const eventStillValid = await step.run('check-event-valid-1h', async () => {
        return await isEventValid(eventId);
      });

      if (eventStillValid) {
        // Send 1h reminder email
        const email1hResult = await step.run('send-1h-reminder-email', async () => {
          console.log(`[pre-event-funnel] Sending 1h reminder email to ${contactEmail}`);

          await inngest.send({
            name: 'message.send',
            data: {
              contactId,
              registrationId,
              campaignId: undefined,
              templateType: 'reminder-1h',
              channel: 'email',
              stepType: '1h-reminder',
            },
          });

          return {
            success: true,
            step: '1h-reminder-email',
            sentAt: new Date().toISOString(),
          };
        });

        // Send 1h reminder SMS (if contact has phone number)
        const sms1hResult = await step.run('send-1h-reminder-sms', async () => {
          // Check if contact has phone number
          const { data: contact } = await db
            .from('contacts')
            .select('phone')
            .eq('id', contactId)
            .maybeSingle();

          if (!contact?.phone) {
            console.log(`[pre-event-funnel] Skipping 1h SMS - no phone number for ${contactEmail}`);
            return { success: false, skipped: true, reason: 'no_phone' };
          }

          console.log(`[pre-event-funnel] Sending 1h reminder SMS to ${contact.phone}`);

          await inngest.send({
            name: 'message.send',
            data: {
              contactId,
              registrationId,
              campaignId: undefined,
              templateType: 'reminder-1h-sms',
              channel: 'sms',
              stepType: '1h-reminder',
            },
          });

          return {
            success: true,
            step: '1h-reminder-sms',
            sentAt: new Date().toISOString(),
          };
        });

        console.log(`[pre-event-funnel] 1h reminders sent - Email: ${email1hResult.success}, SMS: ${sms1hResult.success}`);
      } else {
        console.log(`[pre-event-funnel] Event ${eventId} no longer valid, skipping 1h reminders`);
      }
    } else {
      console.log(`[pre-event-funnel] Skipping 1h reminder - event is less than 1 hour away`);
    }

    // Final return
    console.log(`[pre-event-funnel] Completed for contact ${contactId} - Event: ${eventTitle}`);

    return {
      success: true,
      contactId,
      eventId,
      registrationId,
      eventTitle,
      completedSteps: {
        welcome: welcomeResult.success,
        reminder24h: twentyFourHoursBefore > now,
        reminder1h: oneHourBefore > now,
      },
    };
  }
);
