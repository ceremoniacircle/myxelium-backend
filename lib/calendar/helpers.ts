/**
 * Calendar Helper Utilities
 *
 * Helper functions for calendar event generation:
 * - Date formatting for ICS format
 * - Text escaping for ICS files
 * - UID generation
 */

/**
 * Format Date object to ICS format (YYYYMMDDTHHMMSSZ for UTC)
 * or (YYYYMMDDTHHMMSS for local time with TZID)
 *
 * @param date - Date object to format
 * @param useUtc - If true, format as UTC (with Z suffix), otherwise local format
 * @returns Formatted date string for ICS files
 *
 * @example
 * ```typescript
 * const date = new Date('2025-10-01T14:00:00Z');
 * formatDateForICS(date, true);
 * // Returns: "20251001T140000Z"
 *
 * formatDateForICS(date, false);
 * // Returns: "20251001T140000"
 * ```
 */
export function formatDateForICS(date: Date, useUtc: boolean = false): string {
  if (useUtc) {
    // Format as UTC with Z suffix
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  } else {
    // Format as local time (no Z suffix, requires TZID parameter)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }
}

/**
 * Escape special characters for ICS text fields
 * According to RFC 5545, the following characters must be escaped:
 * - Backslash (\) -> \\
 * - Semicolon (;) -> \;
 * - Comma (,) -> \,
 * - Newline (\n) -> \n (literal backslash-n)
 *
 * @param text - Text to escape
 * @returns Escaped text safe for ICS files
 *
 * @example
 * ```typescript
 * escapeICSText("Join us for a workshop; bring your laptop");
 * // Returns: "Join us for a workshop\; bring your laptop"
 *
 * escapeICSText("Line 1\nLine 2");
 * // Returns: "Line 1\\nLine 2"
 * ```
 */
export function escapeICSText(text: string): string {
  if (!text) return '';

  return text
    .replace(/\\/g, '\\\\')   // Escape backslashes first
    .replace(/;/g, '\\;')     // Escape semicolons
    .replace(/,/g, '\\,')     // Escape commas
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '');      // Remove carriage returns
}

/**
 * Generate unique identifier (UID) for calendar event
 * Format: registration-{registrationId}@ceremonia.com
 *
 * @param registrationId - Unique registration ID
 * @returns UID string for ICS file
 *
 * @example
 * ```typescript
 * generateUID("550e8400-e29b-41d4-a716-446655440000");
 * // Returns: "registration-550e8400-e29b-41d4-a716-446655440000@ceremonia.com"
 * ```
 */
export function generateUID(registrationId: string): string {
  return `registration-${registrationId}@ceremonia.com`;
}

/**
 * Convert minutes to ISO 8601 duration format for VALARM
 * Format: PT{hours}H{minutes}M or PT{minutes}M
 *
 * @param minutes - Number of minutes
 * @returns ISO 8601 duration string with negative sign (for trigger before event)
 *
 * @example
 * ```typescript
 * formatDuration(60);    // Returns: "-PT1H"
 * formatDuration(1440);  // Returns: "-PT24H"
 * formatDuration(90);    // Returns: "-PT1H30M"
 * formatDuration(30);    // Returns: "-PT30M"
 * ```
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return 'PT0M';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `-PT${hours}H${mins}M`;
  } else if (hours > 0) {
    return `-PT${hours}H`;
  } else {
    return `-PT${mins}M`;
  }
}

/**
 * Convert timezone offset to minutes for date calculations
 * Uses Intl.DateTimeFormat to get timezone-aware date
 *
 * @param date - Date object
 * @param timezone - IANA timezone (e.g., 'America/Denver')
 * @returns Date object adjusted for timezone
 */
export function getDateInTimezone(date: Date, timezone: string): Date {
  // Get the date string in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partsMap: Record<string, string> = {};

  parts.forEach(part => {
    if (part.type !== 'literal') {
      partsMap[part.type] = part.value;
    }
  });

  // Create a new date in the target timezone
  return new Date(
    `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}`
  );
}

/**
 * Fold long lines according to RFC 5545 (max 75 octets per line)
 * Lines are folded by inserting CRLF followed by a space
 *
 * @param text - Text to fold
 * @returns Folded text with line breaks
 *
 * @example
 * ```typescript
 * foldLine("DESCRIPTION:This is a very long description that exceeds 75 characters...");
 * // Returns: "DESCRIPTION:This is a very long description that exceeds 75 characte\r\n rs..."
 * ```
 */
export function foldLine(text: string): string {
  if (text.length <= 75) {
    return text;
  }

  const lines: string[] = [];
  let currentLine = text.substring(0, 75);
  let remaining = text.substring(75);

  lines.push(currentLine);

  while (remaining.length > 0) {
    // Subsequent lines are indented with a space and can be 74 chars (75 - 1 for space)
    const chunk = remaining.substring(0, 74);
    lines.push(' ' + chunk);
    remaining = remaining.substring(74);
  }

  return lines.join('\r\n');
}
