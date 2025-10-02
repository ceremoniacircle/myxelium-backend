/**
 * Calendar Integration Module
 *
 * Exports all calendar-related functionality:
 * - ICS file generation
 * - Add-to-calendar links
 * - Helper utilities
 * - TypeScript types
 */

// Export types
export type {
  CalendarEvent,
  ICSOptions,
  CalendarProvider,
  CalendarLinks,
  RegistrationData,
  EventData,
  ContactData,
} from './types';

// Export ICS generation functions
export {
  generateICS,
  generateICSFromRegistration,
  icsToBase64,
  generateICSFilename,
} from './ics-generator';

// Export calendar link generation functions
export {
  generateGoogleCalendarLink,
  generateOutlookLink,
  generateYahooCalendarLink,
  generateAppleCalendarLink,
  generateAllCalendarLinks,
  generateCalendarLinksFromRegistration,
} from './links';

// Export helper utilities
export {
  formatDateForICS,
  escapeICSText,
  generateUID,
  formatDuration,
  getDateInTimezone,
  foldLine,
} from './helpers';
