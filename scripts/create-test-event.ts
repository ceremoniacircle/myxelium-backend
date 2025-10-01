/**
 * Create a test event in the database
 *
 * This script creates a Zoom meeting event that can be used for testing
 * the enrollment API with Zoom integration.
 *
 * Usage: npx tsx scripts/create-test-event.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTestEvent() {
  console.log('📅 Creating test event in database...\n');

  try {
    // Create a test event scheduled for 7 days from now
    const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: 'Test Zoom Meeting - Myxelium Integration',
        description: 'A test event to demonstrate Zoom Meetings API integration',
        type: 'webinar',
        platform: 'zoom_meeting', // Use zoom_meeting for Zoom Pro
        // platform_event_id will be created automatically when first user registers
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 60,
        timezone: 'America/Los_Angeles',
        status: 'registration_open',
        content_context: {
          offer: 'Free test webinar',
          pain_points: ['Testing Zoom integration'],
          benefits: ['Learn how the system works'],
          speaker: {
            name: 'Test Speaker',
            bio: 'Testing the integration'
          }
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Test event created successfully!\n');
    console.log('Event Details:');
    console.log(`  ID: ${data.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Platform: ${data.platform}`);
    console.log(`  Scheduled: ${data.scheduled_at}`);
    console.log(`  Status: ${data.status}`);
    console.log('');
    console.log('📝 Test enrollment with:');
    console.log('');
    console.log('POST http://localhost:3000/api/enrollments');
    console.log('Content-Type: application/json');
    console.log('');
    console.log(JSON.stringify({
      email: 'your-email@example.com',
      firstName: 'Test',
      lastName: 'User',
      eventId: data.id,
      consent: {
        email: true,
        sms: true,
        marketing: true
      }
    }, null, 2));
    console.log('');

  } catch (error: any) {
    console.error('❌ Failed to create test event:', error.message);
    process.exit(1);
  }
}

createTestEvent();
