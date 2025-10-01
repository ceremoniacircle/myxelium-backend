#!/bin/bash

# Test Full Enrollment Flow
# This tests the complete workflow: enrollment → Zoom registration → join URL

EVENT_ID="c271e50f-56bb-4c75-b026-294a80a4cbec"

echo "🧪 Testing Full Enrollment Flow"
echo ""
echo "Event ID: $EVENT_ID"
echo ""

curl -X POST http://localhost:3000/api/enrollments \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test-user@example.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"eventId\": \"$EVENT_ID\",
    \"consent\": {
      \"email\": true,
      \"sms\": true,
      \"marketing\": true
    }
  }" | jq '.'

echo ""
echo "✅ If you see a 'joinUrl' above, the integration is working!"
echo ""
