/**
 * create-session-strings.ts
 *
 * Single source of truth for all user-visible copy in the running-session
 * creation flow (mobile organizer path). Mirrors the pattern of
 * result-submission-strings.ts.
 *
 * Ticket: T-20260414-09
 */

// ── Screen / section headings ──────────────────────────────────────────────

export const SCREEN_TITLE = "New running session";
export const SCREEN_SUBTITLE = "Set up this week's session for your league";

// ── Field labels ────────────────────────────────────────────────────────────

export const TITLE_LABEL = "Session title";
export const DATE_LABEL = "Date";
export const TIME_LABEL = "Start time";
export const DISTANCE_LABEL = "Distance (metres)";

// ── Placeholders ────────────────────────────────────────────────────────────

export const TITLE_PLACEHOLDER = "e.g. Tuesday 5K";
export const DATE_PLACEHOLDER = "MM/DD/YYYY";
export const TIME_PLACEHOLDER = "HH:MM";
export const DISTANCE_PLACEHOLDER = "5000";

// ── Validation / error messages ─────────────────────────────────────────────

export const ERROR_TITLE_REQUIRED = "Enter a title for the session.";
export const ERROR_DATE_INVALID = "Enter a valid date as MM/DD/YYYY.";
export const ERROR_TIME_INVALID = "Enter a valid time as HH:MM.";
export const ERROR_DISTANCE_INVALID = "Distance must be a positive number of metres.";
export const ERROR_CREATE_FAILED = "Couldn't create the session. Please try again.";
export const ERROR_NOT_AUTHENTICATED = "You must be logged in to create a session.";

// ── Submit button labels ────────────────────────────────────────────────────

export const SUBMIT_BUTTON_LABEL = "Create session";
export const SUBMIT_BUTTON_LOADING_LABEL = "Creating...";
