/**
 * Resend Helper Functions
 *
 * Utility functions for template personalization and email formatting
 */

/**
 * Personalize template by replacing {{token}} placeholders with actual values
 *
 * @param template - Template string with {{token}} placeholders
 * @param data - Key-value pairs for token replacement
 * @returns Personalized string with tokens replaced
 *
 * @example
 * ```typescript
 * const result = personalizeTemplate(
 *   "Hi {{firstName}}, join {{eventTitle}}!",
 *   { firstName: "John", eventTitle: "AI Webinar" }
 * );
 * // Returns: "Hi John, join AI Webinar!"
 * ```
 */
export function personalizeTemplate(
  template: string,
  data: Record<string, string | null | undefined>
): string {
  if (!template) return '';

  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    const value = data[token];
    // Return empty string for missing/null/undefined values
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Format ISO date string to human-readable event date
 *
 * @param isoString - ISO 8601 date string
 * @param timezone - Optional timezone (defaults to 'America/Los_Angeles')
 * @returns Formatted date string like "Monday, October 1, 2025 at 10:00 AM PDT"
 *
 * @example
 * ```typescript
 * formatEventDate("2025-10-01T10:00:00Z", "America/Los_Angeles")
 * // Returns: "Wednesday, October 1, 2025 at 3:00 AM PDT"
 * ```
 */
export function formatEventDate(
  isoString: string,
  timezone: string = 'America/Los_Angeles'
): string {
  try {
    const date = new Date(isoString);

    // Format date with timezone
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    });

    // Format time with timezone
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: timezone,
    });

    const datePart = dateFormatter.format(date);
    const timePart = timeFormatter.format(date);

    return `${datePart} at ${timePart}`;
  } catch (error) {
    console.error('[formatEventDate] Error formatting date:', error);
    return isoString; // Fallback to original string
  }
}

/**
 * Convert plain text to basic HTML with line breaks
 *
 * @param text - Plain text string
 * @returns HTML string with <p> tags and <br> for line breaks
 */
export function textToHtml(text: string): string {
  if (!text) return '';

  // Split by double line breaks for paragraphs
  const paragraphs = text.split('\n\n');

  return paragraphs
    .map(paragraph => {
      // Replace single line breaks with <br> tags
      const withBreaks = paragraph.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('\n');
}

/**
 * Strip HTML tags from string (for generating plain text version)
 *
 * @param html - HTML string
 * @returns Plain text string
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim();
}

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Build personalization data object from contact and event data
 *
 * @param contact - Contact data
 * @param event - Event data (optional)
 * @param registration - Registration data (optional)
 * @returns Object with all available tokens for personalization
 */
export function buildPersonalizationData(
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  },
  event?: {
    title?: string | null;
    scheduled_at?: string | null;
    timezone?: string | null;
  } | null,
  registration?: {
    platform_join_url?: string | null;
  } | null
): Record<string, string> {
  const data: Record<string, string> = {
    firstName: contact.first_name || '',
    lastName: contact.last_name || '',
    email: contact.email || '',
  };

  if (event) {
    data.eventTitle = event.title || '';

    if (event.scheduled_at) {
      data.eventDate = formatEventDate(
        event.scheduled_at,
        event.timezone || 'America/Los_Angeles'
      );
    }
  }

  if (registration?.platform_join_url) {
    data.joinUrl = registration.platform_join_url;
  }

  return data;
}
