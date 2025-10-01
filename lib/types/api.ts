/**
 * API Request/Response Types
 */

export interface EnrollmentRequest {
  // Contact details
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;

  // Event details
  eventId: string;

  // Consent
  consent?: {
    email?: boolean;
    sms?: boolean;
    marketing?: boolean;
  };

  // Tracking
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };

  // Source
  source?: string; // landing_page | email_link | api | manual
  sourceUrl?: string;

  // Additional form data
  formData?: Record<string, any>;
}

export interface EnrollmentResponse {
  success: boolean;
  data?: {
    registrationId: string;
    contactId: string;
    eventId: string;
    joinUrl?: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  status: number;
}
