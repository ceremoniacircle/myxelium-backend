/**
 * Test Zoom Integration
 *
 * This script demonstrates:
 * 1. Creating a Zoom Meeting programmatically
 * 2. Registering a user for the meeting
 * 3. Getting the unique join URL
 *
 * Usage: npx tsx scripts/test-zoom-integration.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

import { zoomClient } from '../lib/zoom/client';

async function testZoomIntegration() {
  console.log('🧪 Testing Zoom Integration\n');

  try {
    // Step 1: Get User ID
    console.log('1️⃣  Getting Zoom user ID...');
    const userId = await zoomClient.getUserId();
    console.log(`   ✅ User ID: ${userId}\n`);

    // Step 2: Create a test meeting
    console.log('2️⃣  Creating test Zoom meeting...');
    const meeting = await zoomClient.createMeeting({
      topic: 'Test Meeting - Myxelium Integration',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      duration: 60,
      timezone: 'America/Los_Angeles',
      settings: {
        approval_type: 0, // Auto-approve
        registration_type: 1,
        join_before_host: true,
        waiting_room: true
      }
    });

    console.log(`   ✅ Meeting created!`);
    console.log(`   Meeting ID: ${meeting.id}`);
    console.log(`   Topic: ${meeting.topic}`);
    console.log(`   Start Time: ${meeting.start_time}`);
    console.log(`   Join URL: ${meeting.join_url}`);
    if (meeting.registration_url) {
      console.log(`   Registration URL: ${meeting.registration_url}`);
    }
    console.log('');

    // Step 3: Register a test user (can't be the host)
    console.log('3️⃣  Registering test user for the meeting...');
    const registrant = await zoomClient.addMeetingRegistrant(meeting.id, {
      email: 'test-attendee@example.com', // Different from host email
      first_name: 'Test',
      last_name: 'Attendee',
      phone: '+15555555678'
    });

    console.log(`   ✅ Registrant added!`);
    console.log(`   Registrant ID: ${registrant.registrant_id}`);
    console.log(`   Join URL: ${registrant.join_url}`);
    console.log('');

    // Step 4: Get meeting details
    console.log('4️⃣  Fetching meeting details...');
    const meetingDetails = await zoomClient.getMeeting(meeting.id);
    console.log(`   ✅ Meeting details retrieved`);
    console.log(`   Status: ${meetingDetails.status}`);
    console.log('');

    console.log('✅ All tests passed!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Meeting created with ID: ${meeting.id}`);
    console.log(`   - User registered with unique join URL`);
    console.log(`   - Join URL: ${registrant.join_url}`);
    console.log('');
    console.log('💡 Next step: Test via enrollment API with this meeting ID');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
testZoomIntegration();
