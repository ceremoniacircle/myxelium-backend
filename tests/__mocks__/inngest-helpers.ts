/**
 * Mock implementations for Inngest helpers
 */

import { vi } from 'vitest';

export const createMessageSend = vi.fn();
export const updateMessageSendStatus = vi.fn();
export const getMessageTemplate = vi.fn();
export const checkConsent = vi.fn();
export const incrementReminderCount = vi.fn();
export const getRegistrationWithContact = vi.fn();
