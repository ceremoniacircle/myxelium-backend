/**
 * Post-Event Drip Campaign
 *
 * Branching sequence based on attendance:
 * - Path A (Attended): Thank you → Resources → Nurture
 * - Path B (No-show): Sorry → Re-engagement → Final follow-up
 */

import { inngest } from '@/inngest/client';
import { db } from '@/lib/db';

/**
 * Post-Event Funnel Function
 *
 * Triggered by: event.completed
 * Branches based on registration.attended flag
 */
export const postEventFunnel = inngest.createFunction(
  {
    id: 'post-event-funnel',
    name: 'Post-Event Drip Campaign',
    retries: 4,
    throttle: {
      limit: 50,
      period: '1m',
    },
  },
  { event: 'event.completed' },
  async ({ event, step }) => {
    const { eventId, eventTitle, completedAt } = event.data;

    console.log(`[post-event-funnel] Starting for event ${eventId} (${eventTitle})`);

    // Step 1: Get all registrations for this event
    const registrations = await step.run('fetch-registrations', async () => {
      const { data, error } = await db
        .from('registrations')
        .select(`
          id,
          contact_id,
          attended,
          status,
          contacts (
            id,
            email,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('event_id', eventId)
        .in('status', ['registered', 'confirmed', 'attended', 'no_show']);

      if (error) {
        console.error('[post-event-funnel] Error fetching registrations:', error);
        throw new Error(`Failed to fetch registrations: ${error.message}`);
      }

      return data || [];
    });

    console.log(`[post-event-funnel] Found ${registrations.length} registrations to process`);

    // Step 2: Process each registration
    const results = await Promise.all(
      registrations.map((registration) =>
        step.run(`process-registration-${registration.id}`, async () => {
          const contact = registration.contacts as any;
          const attended = registration.attended;

          console.log(
            `[post-event-funnel] Processing ${contact.email} - Attended: ${attended}`
          );

          // Branch based on attendance
          if (attended) {
            // Path A: Attended
            return await processAttendedPath(
              registration.id,
              registration.contact_id,
              eventId,
              eventTitle,
              contact
            );
          } else {
            // Path B: No-show
            return await processNoShowPath(
              registration.id,
              registration.contact_id,
              eventId,
              eventTitle,
              contact
            );
          }
        })
      )
    );

    console.log(`[post-event-funnel] Completed for event ${eventId} - Processed ${results.length} registrations`);

    return {
      success: true,
      eventId,
      eventTitle,
      processedCount: results.length,
      results,
    };
  }
);

/**
 * Process attended path: Thank you → Resources → Nurture
 */
async function processAttendedPath(
  registrationId: string,
  contactId: string,
  eventId: string,
  eventTitle: string,
  contact: any
) {
  console.log(`[post-event-funnel] Starting attended path for ${contact.email}`);

  // Step 1: Send thank you email (T+1h)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

  await inngest.send({
    name: 'message.send',
    data: {
      contactId,
      registrationId,
      campaignId: undefined,
      templateType: 'thank-you',
      channel: 'email',
      stepType: 'thank-you',
    },
  });

  // Schedule resources email for T+24h
  await inngest.send({
    name: 'post-event.send-resources',
    data: {
      contactId,
      registrationId,
      eventId,
      eventTitle,
      sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  // Schedule nurture email for T+3d
  await inngest.send({
    name: 'post-event.send-nurture',
    data: {
      contactId,
      registrationId,
      eventId,
      eventTitle,
      sendAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  console.log(`[post-event-funnel] Attended path scheduled for ${contact.email}`);

  return {
    path: 'attended',
    contactId,
    contactEmail: contact.email,
    scheduledSteps: ['thank-you', 'resources-24h', 'nurture-3d'],
  };
}

/**
 * Process no-show path: Sorry → Re-engagement → Final
 */
async function processNoShowPath(
  registrationId: string,
  contactId: string,
  eventId: string,
  eventTitle: string,
  contact: any
) {
  console.log(`[post-event-funnel] Starting no-show path for ${contact.email}`);

  // Step 1: Send "sorry we missed you" email (T+1h)
  await inngest.send({
    name: 'message.send',
    data: {
      contactId,
      registrationId,
      campaignId: undefined,
      templateType: 'sorry-missed',
      channel: 'email',
      stepType: 'sorry-missed',
    },
  });

  // Schedule re-engagement for T+24h (email + SMS)
  await inngest.send({
    name: 'post-event.send-reengagement',
    data: {
      contactId,
      registrationId,
      eventId,
      eventTitle,
      sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  // Schedule final follow-up for T+7d
  await inngest.send({
    name: 'post-event.send-final-followup',
    data: {
      contactId,
      registrationId,
      eventId,
      eventTitle,
      sendAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  console.log(`[post-event-funnel] No-show path scheduled for ${contact.email}`);

  return {
    path: 'no_show',
    contactId,
    contactEmail: contact.email,
    scheduledSteps: ['sorry-missed', 'reengagement-24h', 'final-7d'],
  };
}

/**
 * Send Resources Email (T+24h for attended)
 */
export const sendResourcesEmail = inngest.createFunction(
  {
    id: 'post-event-send-resources',
    name: 'Send Resources Email',
    retries: 3,
  },
  { event: 'post-event.send-resources' },
  async ({ event, step }) => {
    const { contactId, registrationId, eventTitle, sendAt } = event.data;

    // Sleep until scheduled time
    if (sendAt) {
      await step.sleepUntil('wait-until-scheduled', new Date(sendAt));
    }

    // Send resources email
    await step.run('send-resources-email', async () => {
      console.log(`[post-event-funnel] Sending resources email for ${eventTitle}`);

      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'resources',
          channel: 'email',
          stepType: 'resources',
        },
      });

      return { success: true };
    });

    return { success: true, contactId };
  }
);

/**
 * Send Nurture Email (T+3d for attended)
 */
export const sendNurtureEmail = inngest.createFunction(
  {
    id: 'post-event-send-nurture',
    name: 'Send Nurture Email',
    retries: 3,
  },
  { event: 'post-event.send-nurture' },
  async ({ event, step }) => {
    const { contactId, registrationId, eventTitle, sendAt } = event.data;

    // Sleep until scheduled time
    if (sendAt) {
      await step.sleepUntil('wait-until-scheduled', new Date(sendAt));
    }

    // Send nurture email
    await step.run('send-nurture-email', async () => {
      console.log(`[post-event-funnel] Sending nurture email for ${eventTitle}`);

      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'nurture',
          channel: 'email',
          stepType: 'nurture',
        },
      });

      return { success: true };
    });

    return { success: true, contactId };
  }
);

/**
 * Send Re-engagement Email + SMS (T+24h for no-show)
 */
export const sendReengagementMessage = inngest.createFunction(
  {
    id: 'post-event-send-reengagement',
    name: 'Send Re-engagement Message',
    retries: 3,
  },
  { event: 'post-event.send-reengagement' },
  async ({ event, step }) => {
    const { contactId, registrationId, eventTitle, sendAt } = event.data;

    // Sleep until scheduled time
    if (sendAt) {
      await step.sleepUntil('wait-until-scheduled', new Date(sendAt));
    }

    // Send re-engagement email
    await step.run('send-reengagement-email', async () => {
      console.log(`[post-event-funnel] Sending re-engagement email for ${eventTitle}`);

      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'reengagement',
          channel: 'email',
          stepType: 'reengagement',
        },
      });

      return { success: true };
    });

    // Send SMS if contact has phone
    await step.run('send-reengagement-sms', async () => {
      const { data: contact } = await db
        .from('contacts')
        .select('phone')
        .eq('id', contactId)
        .maybeSingle();

      if (!contact?.phone) {
        console.log(`[post-event-funnel] Skipping re-engagement SMS - no phone number`);
        return { success: false, skipped: true };
      }

      console.log(`[post-event-funnel] Sending re-engagement SMS for ${eventTitle}`);

      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'reengagement',
          channel: 'sms',
          stepType: 'reengagement',
        },
      });

      return { success: true };
    });

    return { success: true, contactId };
  }
);

/**
 * Send Final Follow-up Email (T+7d for no-show)
 */
export const sendFinalFollowup = inngest.createFunction(
  {
    id: 'post-event-send-final-followup',
    name: 'Send Final Follow-up',
    retries: 3,
  },
  { event: 'post-event.send-final-followup' },
  async ({ event, step }) => {
    const { contactId, registrationId, eventTitle, sendAt } = event.data;

    // Sleep until scheduled time
    if (sendAt) {
      await step.sleepUntil('wait-until-scheduled', new Date(sendAt));
    }

    // Send final follow-up email
    await step.run('send-final-email', async () => {
      console.log(`[post-event-funnel] Sending final follow-up for ${eventTitle}`);

      await inngest.send({
        name: 'message.send',
        data: {
          contactId,
          registrationId,
          campaignId: undefined,
          templateType: 'final-followup',
          channel: 'email',
          stepType: 'final-followup',
        },
      });

      return { success: true };
    });

    return { success: true, contactId };
  }
);
