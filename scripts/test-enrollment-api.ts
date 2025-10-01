/**
 * Test script for enrollment API
 *
 * Usage: npx tsx scripts/test-enrollment-api.ts
 */

async function testEnrollmentAPI() {
  const API_BASE = 'http://localhost:3000/api';

  try {
    console.log('🧪 Testing Enrollment API\n');

    // Get seed event from database
    const response = await fetch(`${API_BASE}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+15555555678',
        eventId: '00000000-0000-0000-0000-000000000000', // Replace with actual event ID from seed data
        consent: {
          email: true,
          sms: true,
          marketing: true
        },
        utmParams: {
          utm_source: 'test',
          utm_medium: 'api',
          utm_campaign: 'test-script'
        },
        source: 'api',
        formData: {
          company: 'Test Company',
          role: 'Developer'
        }
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ POST /api/enrollments - SUCCESS');
      console.log('   Registration ID:', data.data.registrationId);
      console.log('   Contact ID:', data.data.contactId);
      console.log('   Message:', data.data.message);

      // Test GET endpoint
      console.log('\n🧪 Testing GET /api/enrollments\n');

      const getResponse = await fetch(
        `${API_BASE}/enrollments?email=test@example.com&eventId=${data.data.eventId}`
      );

      const getData = await getResponse.json();

      if (getData.success) {
        console.log('✅ GET /api/enrollments - SUCCESS');
        console.log('   Status:', getData.data.status);
        console.log('   Event:', getData.data.event?.title);
        console.log('   Registered At:', getData.data.registeredAt);
      } else {
        console.error('❌ GET /api/enrollments - FAILED');
        console.error('   Error:', getData.error);
      }

    } else {
      console.error('❌ POST /api/enrollments - FAILED');
      console.error('   Error Code:', data.error.code);
      console.error('   Message:', data.error.message);
      console.error('   Details:', data.error.details);
    }

  } catch (error: any) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
  }
}

// Run test
testEnrollmentAPI();
