/**
 * Zoom API Client (Server-to-Server OAuth)
 * Supports both Zoom Meetings and Zoom Webinars
 */

interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

interface ZoomAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class ZoomClient {
  private credentials: ZoomCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
      throw new Error('Missing Zoom API credentials in environment variables');
    }

    this.credentials = {
      accountId: process.env.ZOOM_ACCOUNT_ID,
      clientId: process.env.ZOOM_CLIENT_ID,
      clientSecret: process.env.ZOOM_CLIENT_SECRET
    };
  }

  /**
   * Get OAuth access token (cached until expiry)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Request new token
    const auth = Buffer.from(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`
    ).toString('base64');

    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: this.credentials.accountId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom OAuth failed: ${response.status} - ${error}`);
    }

    const data: ZoomAccessToken = await response.json();

    // Cache token (expire 5 minutes before actual expiry for safety)
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  /**
   * Make authenticated API request to Zoom
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get user ID (required for creating meetings/webinars)
   * Uses 'me' which refers to the account owner
   */
  async getUserId(): Promise<string> {
    // Just return 'me' - Zoom API accepts this for the authenticated user
    return 'me';
  }

  /**
   * Create a scheduled meeting (Zoom Pro)
   */
  async createMeeting(params: {
    topic: string;
    startTime: string; // ISO 8601 format
    duration: number; // minutes
    timezone?: string;
    password?: string;
    settings?: {
      approval_type?: 0 | 1 | 2; // 0=auto, 1=manual, 2=no registration
      registration_type?: 1 | 2 | 3; // 1=register once, 2=each occurrence, 3=series
      join_before_host?: boolean;
      mute_upon_entry?: boolean;
      waiting_room?: boolean;
    };
  }) {
    const userId = 'me'; // Use 'me' for authenticated user

    return this.request<{
      id: number;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      join_url: string;
      registration_url?: string;
      password?: string;
    }>('POST', `/users/${userId}/meetings`, {
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: params.startTime,
      duration: params.duration,
      timezone: params.timezone || 'America/Los_Angeles',
      password: params.password,
      settings: {
        approval_type: params.settings?.approval_type ?? 0,
        registration_type: params.settings?.registration_type ?? 1,
        join_before_host: params.settings?.join_before_host ?? true,
        mute_upon_entry: params.settings?.mute_upon_entry ?? false,
        waiting_room: params.settings?.waiting_room ?? true,
        ...params.settings
      }
    });
  }

  /**
   * Add registrant to a meeting
   */
  async addMeetingRegistrant(meetingId: number, params: {
    email: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    custom_questions?: Array<{
      title: string;
      value: string;
    }>;
  }) {
    return this.request<{
      id: string;
      registrant_id: string;
      topic: string;
      join_url: string;
    }>('POST', `/meetings/${meetingId}/registrants`, params);
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: number) {
    return this.request<{
      id: number;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      join_url: string;
      status: string;
    }>('GET', `/meetings/${meetingId}`);
  }

  /**
   * Create a webinar (requires Webinar add-on)
   */
  async createWebinar(params: {
    topic: string;
    startTime: string; // ISO 8601 format
    duration: number; // minutes
    timezone?: string;
    password?: string;
    settings?: {
      approval_type?: 0 | 1 | 2;
      registration_type?: 1 | 2 | 3;
      hd_video?: boolean;
      on_demand?: boolean;
    };
  }) {
    const userId = 'me'; // Use 'me' for authenticated user

    return this.request<{
      id: number;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      join_url: string;
      registration_url?: string;
    }>('POST', `/users/${userId}/webinars`, {
      topic: params.topic,
      type: 5, // Scheduled webinar
      start_time: params.startTime,
      duration: params.duration,
      timezone: params.timezone || 'America/Los_Angeles',
      password: params.password,
      settings: {
        approval_type: params.settings?.approval_type ?? 0,
        registration_type: params.settings?.registration_type ?? 1,
        hd_video: params.settings?.hd_video ?? true,
        on_demand: params.settings?.on_demand ?? false,
        ...params.settings
      }
    });
  }

  /**
   * Add registrant to a webinar
   */
  async addWebinarRegistrant(webinarId: number, params: {
    email: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    custom_questions?: Array<{
      title: string;
      value: string;
    }>;
  }) {
    return this.request<{
      id: string;
      registrant_id: string;
      topic: string;
      join_url: string;
    }>('POST', `/webinars/${webinarId}/registrants`, params);
  }

  /**
   * Get webinar details
   */
  async getWebinar(webinarId: number) {
    return this.request<{
      id: number;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      join_url: string;
      status: string;
    }>('GET', `/webinars/${webinarId}`);
  }
}

// Singleton instance (lazy-loaded)
let _zoomClient: ZoomClient | null = null;

export const zoomClient = {
  get instance(): ZoomClient {
    if (!_zoomClient) {
      _zoomClient = new ZoomClient();
    }
    return _zoomClient;
  },
  // Proxy all methods for convenience
  async getUserId() {
    return this.instance.getUserId();
  },
  async createMeeting(params: Parameters<ZoomClient['createMeeting']>[0]) {
    return this.instance.createMeeting(params);
  },
  async addMeetingRegistrant(meetingId: number, params: Parameters<ZoomClient['addMeetingRegistrant']>[1]) {
    return this.instance.addMeetingRegistrant(meetingId, params);
  },
  async getMeeting(meetingId: number) {
    return this.instance.getMeeting(meetingId);
  },
  async createWebinar(params: Parameters<ZoomClient['createWebinar']>[0]) {
    return this.instance.createWebinar(params);
  },
  async addWebinarRegistrant(webinarId: number, params: Parameters<ZoomClient['addWebinarRegistrant']>[1]) {
    return this.instance.addWebinarRegistrant(webinarId, params);
  },
  async getWebinar(webinarId: number) {
    return this.instance.getWebinar(webinarId);
  }
};
