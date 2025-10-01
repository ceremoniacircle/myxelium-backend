/**
 * Test script for Inngest functions
 *
 * Usage:
 *   npx tsx scripts/test-inngest.ts
 *
 * This script manually triggers Inngest events for testing the job queue system.
 */

import 'dotenv/config';
import { inngest } from '../inngest/client';
import { db } from '../lib/db';

/**
 * Test pre-event funnel by triggering event.enrolled
 */
async function testPreEventFunnel() {
  console.log('\n=== Testing Pre-Event Funnel ===\n');

  // Find a test event
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, title, scheduled_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError || !event) {
    console.error('Error fetching event:', eventError);
    console.log('Please create a test event first.');
    return;
  }

  // Find or create a test contact
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id, email, first_name, last_name, phone')
    .eq('email', 'test@ceremonia.com')
    .maybeSingle();

  let testContact = contact;

  if (!testContact) {
    console.log('Creating test contact...');
    const { data: newContact, error: createError } = await db
      .from('contacts')
      .insert({
        email: 'test@ceremonia.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '+15555551234',
        consent: {
          email: { granted: true, updated_at: new Date().toISOString() },
          sms: { granted: true, updated_at: new Date().toISOString() },
        },
        lifecycle_stage: 'lead',
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating contact:', createError);
      return;
    }

    testContact = newContact;
  }

  if (!testContact) {
    console.error('Failed to create/fetch test contact');
    return;
  }

  // Find or create a test registration
  let { data: registration, error: regError } = await db
    .from('registrations')
    .select('id')
    .eq('contact_id', testContact.id)
    .eq('event_id', event.id)
    .maybeSingle();

  if (!registration) {
    console.log('Creating test registration...');
    const { data: newReg, error: createRegError } = await db
      .from('registrations')
      .insert({
        contact_id: testContact.id,
        event_id: event.id,
        status: 'registered',
        platform_join_url: 'https://zoom.us/j/test123456',
      })
      .select()
      .single();

    if (createRegError) {
      console.error('Error creating registration:', createRegError);
      return;
    }

    registration = newReg;
  }

  if (!registration) {
    console.error('Failed to create/fetch registration');
    return;
  }

  console.log(`\nTriggering event.enrolled for:`);
  console.log(`  Contact: ${testContact.email}`);
  console.log(`  Event: ${event.title}`);
  console.log(`  Scheduled: ${event.scheduled_at}`);
  console.log(`  Registration ID: ${registration.id}\n`);

  // Trigger the event
  try {
    await inngest.send({
      name: 'event.enrolled',
      data: {
        contactId: testContact.id,
        eventId: event.id,
        registrationId: registration.id,
        eventTitle: event.title,
        scheduledAt: event.scheduled_at,
        contactEmail: testContact.email,
        contactFirstName: testContact.first_name,
        contactLastName: testContact.last_name,
        contactPhone: testContact.phone,
        joinUrl: 'https://zoom.us/j/test123456',
      },
    });

    console.log('✅ Event triggered successfully!');
    console.log('\nView the job in Inngest dashboard:');
    console.log('  Local: http://localhost:8288');
    console.log('  Cloud: https://app.inngest.com\n');
  } catch (error) {
    console.error('❌ Error triggering event:', error);
  }
}

/**
 * Test post-event funnel by triggering event.completed
 */
async function testPostEventFunnel() {
  console.log('\n=== Testing Post-Event Funnel ===\n');

  // Find a test event
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, title, scheduled_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError || !event) {
    console.error('Error fetching event:', eventError);
    console.log('Please create a test event first.');
    return;
  }

  console.log(`Triggering event.completed for:`);
  console.log(`  Event: ${event.title}`);
  console.log(`  Event ID: ${event.id}\n`);

  // Trigger the event
  try {
    await inngest.send({
      name: 'event.completed',
      data: {
        eventId: event.id,
        eventTitle: event.title,
        completedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Event triggered successfully!');
    console.log('\nView the job in Inngest dashboard:');
    console.log('  Local: http://localhost:8288');
    console.log('  Cloud: https://app.inngest.com\n');
  } catch (error) {
    console.error('❌ Error triggering event:', error);
  }
}

/**
 * Test direct message send
 */
async function testMessageSend() {
  console.log('\n=== Testing Message Send ===\n');

  // Find test contact
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id, email, first_name')
    .eq('email', 'test@ceremonia.com')
    .maybeSingle();

  if (contactError || !contact) {
    console.error('Error fetching contact:', contactError);
    console.log('Please run testPreEventFunnel first to create test contact.');
    return;
  }

  console.log(`Triggering message.send for:`);
  console.log(`  Contact: ${contact.email}\n`);

  // Trigger the event
  try {
    await inngest.send({
      name: 'message.send',
      data: {
        contactId: contact.id,
        templateType: 'welcome-email',
        channel: 'email',
        stepType: 'test',
      },
    });

    console.log('✅ Event triggered successfully!');
    console.log('\nView the job in Inngest dashboard:');
    console.log('  Local: http://localhost:8288');
    console.log('  Cloud: https://app.inngest.com\n');
  } catch (error) {
    console.error('❌ Error triggering event:', error);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'pre-event';

  console.log('Inngest Test Script');
  console.log('===================\n');

  switch (command) {
    case 'pre-event':
      await testPreEventFunnel();
      break;
    case 'post-event':
      await testPostEventFunnel();
      break;
    case 'message':
      await testMessageSend();
      break;
    case 'all':
      await testPreEventFunnel();
      await testPostEventFunnel();
      await testMessageSend();
      break;
    default:
      console.log('Usage:');
      console.log('  npx tsx scripts/test-inngest.ts [command]');
      console.log('\nCommands:');
      console.log('  pre-event   - Test pre-event funnel (default)');
      console.log('  post-event  - Test post-event funnel');
      console.log('  message     - Test direct message send');
      console.log('  all         - Run all tests');
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
