# Admin API Documentation

Complete API reference for the Myxelium event funnel orchestration admin endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Events API](#events-api)
- [Contacts API](#contacts-api)
- [Messages API](#messages-api)
- [Analytics API](#analytics-api)
- [Webhooks API](#webhooks-api)
- [Error Handling](#error-handling)

## Authentication

**Status:** Not implemented (MVP)

All admin endpoints are currently unauthenticated and intended for internal use only.

**Future Implementation:**
- JWT token validation
- API key authentication
- Role-based access control (RBAC)

## Events API

### List Events

Get a paginated list of all events with enrollment and attendance statistics.

**Endpoint:** `GET /api/admin/events`

**Query Parameters:**

| Parameter | Type   | Required | Default       | Description                                    |
|-----------|--------|----------|---------------|------------------------------------------------|
| status    | string | No       | -             | Filter by status: `upcoming`, `completed`, `cancelled` |
| limit     | number | No       | 50            | Number of results (max 100)                   |
| offset    | number | No       | 0             | Pagination offset                             |
| sort      | string | No       | scheduled_at  | Sort field: `scheduled_at` or `created_at`    |
| order     | string | No       | desc          | Sort order: `asc` or `desc`                   |

**Response:**

```json
{
  "data": [
    {
      "id": "event-123",
      "title": "Product Launch Webinar",
      "description": "Join us for an exciting product announcement",
      "scheduled_at": "2025-10-15T10:00:00Z",
      "timezone": "America/Los_Angeles",
      "duration_minutes": 60,
      "platform": "zoom_webinar",
      "status": "upcoming",
      "enrollment_count": 150,
      "attendance_count": 0,
      "attendance_rate": 0,
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/events?status=upcoming&limit=10
```

---

### Get Event Details

Get detailed information about a specific event including statistics and recent registrations.

**Endpoint:** `GET /api/admin/events/:id`

**Path Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Event ID     |

**Response:**

```json
{
  "event": {
    "id": "event-123",
    "title": "Product Launch Webinar",
    "description": "Join us for an exciting product announcement",
    "scheduled_at": "2025-10-15T10:00:00Z",
    "timezone": "America/Los_Angeles",
    "duration_minutes": 60,
    "platform": "zoom_webinar",
    "platform_event_id": "987654321",
    "join_url": "https://zoom.us/j/987654321",
    "status": "upcoming",
    "created_at": "2025-10-01T10:00:00Z",
    "updated_at": "2025-10-01T10:00:00Z"
  },
  "stats": {
    "total_registrations": 150,
    "attended": 0,
    "no_show": 0,
    "attendance_rate": 0,
    "avg_attendance_duration": 0,
    "messages_sent": 150,
    "emails_sent": 150,
    "sms_sent": 0,
    "email_open_rate": 45.33,
    "email_click_rate": 12.67
  },
  "recent_registrations": [
    {
      "id": "reg-123",
      "contact_id": "contact-456",
      "contact_email": "john@example.com",
      "contact_name": "John Doe",
      "registered_at": "2025-10-02T10:00:00Z",
      "attended": null,
      "attended_at": null,
      "attendance_duration_minutes": null,
      "status": "registered"
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/events/event-123
```

---

### Cancel Event

Cancel an event and stop all pending campaigns.

**Endpoint:** `POST /api/admin/events/:id/cancel`

**Path Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Event ID     |

**Request Body:**

```json
{
  "reason": "Speaker unavailable"
}
```

**Response:**

```json
{
  "success": true,
  "event_id": "event-123",
  "cancelled_jobs": 0,
  "message": "Event cancelled successfully. 150 registrations affected."
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/admin/events/event-123/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Speaker unavailable"}'
```

---

## Contacts API

### List Contacts

Get a paginated list of all contacts with activity statistics.

**Endpoint:** `GET /api/admin/contacts`

**Query Parameters:**

| Parameter     | Type    | Required | Default | Description                          |
|---------------|---------|----------|---------|--------------------------------------|
| search        | string  | No       | -       | Search by email or name              |
| consent_email | boolean | No       | -       | Filter by email consent              |
| consent_sms   | boolean | No       | -       | Filter by SMS consent                |
| limit         | number  | No       | 50      | Number of results (max 100)          |
| offset        | number  | No       | 0       | Pagination offset                    |

**Response:**

```json
{
  "data": [
    {
      "id": "contact-123",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "consent_email": true,
      "consent_sms": true,
      "consent_marketing": false,
      "timezone": "America/Los_Angeles",
      "total_events": 5,
      "total_messages": 12,
      "created_at": "2025-09-01T10:00:00Z"
    }
  ],
  "total": 1248,
  "limit": 50,
  "offset": 0
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/contacts?search=john&limit=10
```

---

### Get Contact Details

Get detailed information about a specific contact including activity history.

**Endpoint:** `GET /api/admin/contacts/:id`

**Path Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Contact ID   |

**Response:**

```json
{
  "contact": {
    "id": "contact-123",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "consent_email": true,
    "consent_sms": true,
    "consent_marketing": false,
    "timezone": "America/Los_Angeles",
    "created_at": "2025-09-01T10:00:00Z",
    "updated_at": "2025-10-01T10:00:00Z"
  },
  "stats": {
    "total_events": 5,
    "events_attended": 4,
    "events_no_show": 1,
    "attendance_rate": 80,
    "total_messages": 12,
    "emails_received": 10,
    "sms_received": 2,
    "email_open_rate": 60
  },
  "recent_events": [
    {
      "id": "event-123",
      "title": "Product Launch Webinar",
      "scheduled_at": "2025-10-15T10:00:00Z",
      "registered_at": "2025-10-02T10:00:00Z",
      "attended": true,
      "attendance_duration_minutes": 55
    }
  ],
  "recent_messages": [
    {
      "id": "msg-123",
      "channel": "email",
      "subject": "Welcome to the event!",
      "sent_at": "2025-10-02T10:05:00Z",
      "status": "delivered",
      "opened_at": "2025-10-02T11:00:00Z",
      "clicked_at": null
    }
  ],
  "recent_activities": [
    {
      "id": "act-123",
      "activity_type": "event_registered",
      "activity_data": {
        "event_id": "event-123",
        "event_title": "Product Launch Webinar"
      },
      "occurred_at": "2025-10-02T10:00:00Z",
      "source": "api"
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/contacts/contact-123
```

---

## Messages API

### List Messages

Get a paginated list of sent messages with filtering options.

**Endpoint:** `GET /api/admin/messages`

**Query Parameters:**

| Parameter  | Type   | Required | Default | Description                                          |
|------------|--------|----------|---------|------------------------------------------------------|
| channel    | string | No       | -       | Filter by channel: `email` or `sms`                  |
| status     | string | No       | -       | Filter by status: `queued`, `sent`, `delivered`, `failed` |
| contact_id | string | No       | -       | Filter by contact ID                                 |
| event_id   | string | No       | -       | Filter by event ID                                   |
| limit      | number | No       | 50      | Number of results (max 100)                          |
| offset     | number | No       | 0       | Pagination offset                                    |

**Response:**

```json
{
  "data": [
    {
      "id": "msg-123",
      "contact_email": "john@example.com",
      "contact_name": "John Doe",
      "channel": "email",
      "subject": "Welcome to the event!",
      "status": "delivered",
      "sent_at": "2025-10-02T10:05:00Z",
      "delivered_at": "2025-10-02T10:06:00Z",
      "opened_at": "2025-10-02T11:00:00Z",
      "clicked_at": null,
      "error_message": null,
      "event_title": "Product Launch Webinar"
    }
  ],
  "total": 5420,
  "limit": 50,
  "offset": 0
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/messages?channel=email&status=delivered
```

---

### Send Message (Manual)

Manually send a test message to a contact.

**Endpoint:** `POST /api/admin/messages/send`

**Request Body:**

```json
{
  "contact_id": "contact-123",
  "channel": "email",
  "subject": "Test Message",
  "content": "<p>This is a test message.</p>",
  "template_id": "test-template"
}
```

**Fields:**

| Field       | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| contact_id  | string | Yes      | Contact ID                               |
| channel     | string | Yes      | Channel: `email` or `sms`                |
| subject     | string | No       | Email subject (required for email)       |
| content     | string | Yes      | Message content (HTML for email)         |
| template_id | string | No       | Optional template identifier             |

**Response:**

```json
{
  "success": true,
  "message_id": "msg-456",
  "provider_message_id": "resend-abc123",
  "status": "sent"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/admin/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "contact-123",
    "channel": "email",
    "subject": "Test Message",
    "content": "<p>This is a test message.</p>"
  }'
```

---

## Analytics API

### Overview Analytics

Get system-wide analytics overview.

**Endpoint:** `GET /api/admin/analytics/overview`

**Query Parameters:**

| Parameter  | Type   | Required | Default                  | Description              |
|------------|--------|----------|--------------------------|--------------------------|
| start_date | string | No       | First day of month       | ISO 8601 date string     |
| end_date   | string | No       | Current date             | ISO 8601 date string     |

**Response:**

```json
{
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-31T23:59:59Z"
  },
  "events": {
    "total": 42,
    "upcoming": 15,
    "completed": 25,
    "cancelled": 2
  },
  "contacts": {
    "total": 1248,
    "new_this_period": 156,
    "active_this_period": 320
  },
  "registrations": {
    "total": 3520,
    "total_attended": 2816,
    "total_no_show": 528,
    "avg_attendance_rate": 80
  },
  "messages": {
    "total": 8640,
    "email": 7200,
    "sms": 1440,
    "delivered": 8352,
    "failed": 288,
    "delivery_rate": 96.67
  },
  "engagement": {
    "email_open_rate": 45.33,
    "email_click_rate": 12.67,
    "avg_email_opens_per_contact": 2.5
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/analytics/overview?start_date=2025-10-01&end_date=2025-10-31
```

---

### Event Analytics

Get event-specific analytics with funnel metrics.

**Endpoint:** `GET /api/admin/analytics/events/:id`

**Path Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Event ID     |

**Response:**

```json
{
  "event": {
    "id": "event-123",
    "title": "Product Launch Webinar",
    "scheduled_at": "2025-10-15T10:00:00Z"
  },
  "funnel_metrics": {
    "registrations": 150,
    "welcome_emails_sent": 150,
    "welcome_email_open_rate": 62.67,
    "reminder_24h_sent": 148,
    "reminder_1h_sent": 145,
    "attended": 120,
    "no_show": 30,
    "attendance_rate": 80,
    "post_event_emails_sent": 120
  },
  "timeline": [
    {
      "step": "Registration Confirmation",
      "sent": 150,
      "delivered": 150,
      "opened": 94,
      "clicked": 28
    },
    {
      "step": "24-Hour Reminder",
      "sent": 148,
      "delivered": 147,
      "opened": 89,
      "clicked": 22
    },
    {
      "step": "1-Hour Reminder",
      "sent": 145,
      "delivered": 145,
      "opened": 92,
      "clicked": 31
    },
    {
      "step": "Event Attendance",
      "sent": 150,
      "delivered": 120,
      "opened": 0,
      "clicked": 0
    },
    {
      "step": "Post-Event Follow-up",
      "sent": 120,
      "delivered": 120,
      "opened": 68,
      "clicked": 15
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/analytics/events/event-123
```

---

## Webhooks API

### List Webhook Events

Get a paginated list of webhook events with filtering options.

**Endpoint:** `GET /api/admin/webhooks`

**Query Parameters:**

| Parameter        | Type    | Required | Default | Description                                        |
|------------------|---------|----------|---------|----------------------------------------------------|
| provider         | string  | No       | -       | Filter by provider: `resend`, `twilio`, `zoom`     |
| processed        | boolean | No       | -       | Filter by processed status                         |
| signature_valid  | boolean | No       | -       | Filter by signature validity                       |
| limit            | number  | No       | 50      | Number of results (max 100)                        |
| offset           | number  | No       | 0       | Pagination offset                                  |

**Response:**

```json
{
  "data": [
    {
      "id": "wh-123",
      "provider": "resend",
      "event_type": "email.delivered",
      "signature_valid": true,
      "processed": true,
      "processed_at": "2025-10-02T10:00:00Z",
      "registration_id": "reg-123",
      "processing_error": null,
      "created_at": "2025-10-02T10:00:00Z"
    }
  ],
  "total": 15420,
  "limit": 50,
  "offset": 0
}
```

**Example:**

```bash
curl http://localhost:3000/api/admin/webhooks?provider=resend&processed=false
```

---

## Error Handling

All endpoints return consistent error responses.

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details (development only)"
}
```

### HTTP Status Codes

| Code | Meaning                | Description                                      |
|------|------------------------|--------------------------------------------------|
| 200  | OK                     | Request successful                               |
| 201  | Created                | Resource created successfully                    |
| 400  | Bad Request            | Invalid request parameters or body               |
| 404  | Not Found              | Resource not found                               |
| 500  | Internal Server Error  | Server error occurred                            |

### Common Error Examples

**Invalid Parameter:**

```json
{
  "error": "Limit must be between 1 and 100"
}
```

**Resource Not Found:**

```json
{
  "error": "Event not found"
}
```

**Database Error:**

```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

---

## Rate Limiting

**Status:** Not implemented (MVP)

**Future Implementation:**
- Rate limits per IP address
- Rate limits per API key
- Configurable limits based on tier

---

## Pagination Best Practices

1. **Default Page Size:** 50 items
2. **Maximum Page Size:** 100 items
3. **Use Offset for Simple Pagination:**
   - First page: `?limit=50&offset=0`
   - Second page: `?limit=50&offset=50`
   - Third page: `?limit=50&offset=100`

4. **Check Total Count:**
   - Use `total` field to calculate total pages
   - Example: `totalPages = Math.ceil(total / limit)`

---

## Changelog

### v1.0.0 (2025-10-01)
- Initial release
- Events, Contacts, Messages, Analytics, and Webhooks endpoints
- Comprehensive filtering and pagination support
- Event cancellation functionality
- Manual message sending for testing

---

## Support

For questions or issues, please contact the engineering team or open an issue in the repository.
