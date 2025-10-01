/**
 * Database helpers for Inngest job queue
 *
 * Functions for tracking message sends and updating delivery status
 */

import { db } from '@/lib/db';

/**
 * Message channel types
 */
export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'voice';

/**
 * Message status types
 */
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed' | 'spam';

/**
 * Template type definitions (maps to template slugs)
 */
export type TemplateType =
  | 'welcome-email'
  | 'reminder-24h'
  | 'reminder-24h-sms'
  | 'reminder-1h'
  | 'reminder-1h-sms'
  | 'thank-you'
  | 'resources'
  | 'nurture'
  | 'sorry-missed'
  | 'reengagement'
  | 'final-followup';

/**
 * Interface for creating a message send record
 */
export interface CreateMessageSendParams {
  contactId: string;
  registrationId?: string;
  campaignId?: string;
  templateSlug: TemplateType;
  channel: MessageChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  status?: MessageStatus;
}

/**
 * Create a new message send record
 *
 * @param params - Message send parameters
 * @returns Message send ID
 */
export async function createMessageSend(params: CreateMessageSendParams): Promise<string> {
  const {
    contactId,
    registrationId,
    campaignId,
    templateSlug,
    channel,
    recipientEmail,
    recipientPhone,
    subject,
    bodyText,
    bodyHtml,
    status = 'queued',
  } = params;

  // Get template ID from slug
  const { data: template, error: templateError } = await db
    .from('message_templates')
    .select('id')
    .eq('slug', templateSlug)
    .maybeSingle();

  if (templateError) {
    console.error('Error fetching template:', templateError);
    throw new Error(`Failed to fetch template: ${templateError.message}`);
  }

  // Insert message record
  const { data: message, error: messageError } = await db
    .from('sent_messages')
    .insert({
      contact_id: contactId,
      registration_id: registrationId,
      campaign_id: campaignId,
      template_id: template?.id,
      channel,
      provider: 'pending', // Will be updated when actually sent (resend/twilio)
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      status,
    })
    .select('id')
    .single();

  if (messageError) {
    console.error('Error creating message send:', messageError);
    throw new Error(`Failed to create message send: ${messageError.message}`);
  }

  return message.id;
}

/**
 * Update message send status
 *
 * @param messageId - Message send ID
 * @param status - New status
 * @param metadata - Optional metadata to update
 */
export async function updateMessageSendStatus(
  messageId: string,
  status: MessageStatus,
  metadata?: {
    providerMessageId?: string;
    provider?: string;
    errorCode?: string;
    errorMessage?: string;
    sentAt?: string;
    deliveredAt?: string;
  }
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (metadata?.providerMessageId) {
    updateData.provider_message_id = metadata.providerMessageId;
  }

  if (metadata?.provider) {
    updateData.provider = metadata.provider;
  }

  if (metadata?.errorCode) {
    updateData.error_code = metadata.errorCode;
  }

  if (metadata?.errorMessage) {
    updateData.error_message = metadata.errorMessage;
  }

  if (metadata?.sentAt) {
    updateData.sent_at = metadata.sentAt;
  }

  if (metadata?.deliveredAt) {
    updateData.delivered_at = metadata.deliveredAt;
  }

  const { error } = await db
    .from('sent_messages')
    .update(updateData)
    .eq('id', messageId);

  if (error) {
    console.error('Error updating message send status:', error);
    throw new Error(`Failed to update message send status: ${error.message}`);
  }
}

/**
 * Check if event is still valid for sending messages
 *
 * @param eventId - Event ID
 * @returns Boolean indicating if event is valid
 */
export async function isEventValid(eventId: string): Promise<boolean> {
  const { data: event, error } = await db
    .from('events')
    .select('status, scheduled_at')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !event) {
    console.error('Error fetching event:', error);
    return false;
  }

  // Check if event is cancelled
  if (event.status === 'cancelled') {
    return false;
  }

  // Check if event hasn't happened yet (for pre-event messages)
  const scheduledAt = new Date(event.scheduled_at);
  const now = new Date();

  return scheduledAt > now;
}

/**
 * Check if contact has valid consent for channel
 *
 * @param contactId - Contact ID
 * @param channel - Message channel
 * @returns Boolean indicating if consent is granted
 */
export async function hasConsent(contactId: string, channel: MessageChannel): Promise<boolean> {
  const { data: contact, error } = await db
    .from('contacts')
    .select('consent')
    .eq('id', contactId)
    .maybeSingle();

  if (error || !contact) {
    console.error('Error fetching contact consent:', error);
    return false;
  }

  const consent = contact.consent as any;

  // Check channel-specific consent
  if (channel === 'email') {
    return consent?.email?.granted === true;
  }

  if (channel === 'sms') {
    return consent?.sms?.granted === true;
  }

  if (channel === 'whatsapp') {
    return consent?.whatsapp?.granted === true;
  }

  // Default to false for unknown channels
  return false;
}

/**
 * Get contact and registration data for message personalization
 *
 * @param contactId - Contact ID
 * @param registrationId - Registration ID (optional)
 * @returns Contact and registration data
 */
export async function getMessageData(contactId: string, registrationId?: string) {
  // Fetch contact
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id, email, first_name, last_name, phone, timezone')
    .eq('id', contactId)
    .maybeSingle();

  if (contactError || !contact) {
    throw new Error(`Failed to fetch contact: ${contactError?.message || 'Contact not found'}`);
  }

  // Fetch registration if provided
  let registration = null;
  let event = null;

  if (registrationId) {
    const { data: regData, error: regError } = await db
      .from('registrations')
      .select(`
        id,
        status,
        attended,
        platform_join_url,
        registered_at,
        events (
          id,
          title,
          scheduled_at,
          duration_minutes,
          timezone,
          platform,
          replay_url,
          resources_url
        )
      `)
      .eq('id', registrationId)
      .maybeSingle();

    if (regError) {
      console.error('Error fetching registration:', regError);
    } else if (regData) {
      registration = regData;
      event = regData.events as any;
    }
  }

  return {
    contact,
    registration,
    event,
  };
}

/**
 * Record reminder sent in registration metadata
 *
 * @param registrationId - Registration ID
 * @param reminderType - Type of reminder (24h, 1h, etc.)
 * @param channel - Message channel
 * @param messageId - Sent message ID
 */
export async function recordReminderSent(
  registrationId: string,
  reminderType: string,
  channel: MessageChannel,
  messageId: string
): Promise<void> {
  // Fetch current reminders
  const { data: registration, error: fetchError } = await db
    .from('registrations')
    .select('reminders_sent')
    .eq('id', registrationId)
    .maybeSingle();

  if (fetchError || !registration) {
    console.error('Error fetching registration for reminder tracking:', fetchError);
    return;
  }

  const remindersSent = (registration.reminders_sent as any[]) || [];

  // Add new reminder
  remindersSent.push({
    type: reminderType,
    sent_at: new Date().toISOString(),
    channel,
    message_id: messageId,
  });

  // Update registration
  const { error: updateError } = await db
    .from('registrations')
    .update({
      reminders_sent: remindersSent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (updateError) {
    console.error('Error recording reminder sent:', updateError);
  }
}
