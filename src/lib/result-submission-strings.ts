/**
 * result-submission-strings.ts
 *
 * Single source of truth for all user-visible copy in the result submission
 * flow (tennis sport path). Mobile mirror of
 * frontend/src/lib/result-submission-strings.ts — keep both files in sync.
 *
 * Ticket: T-20260415-03
 */

// ── Set / Game labels ──────────────────────────────────────────────────────

/** Label for a single tennis set, e.g. "Set 1". */
export function setLabel(setNumber: number): string {
  return `Set ${setNumber}`;
}

/** "Add Set" CTA label. */
export const ADD_SET_LABEL = "Add Set";

/** "Reset Set" action label. */
export const RESET_SET_LABEL = "Reset Set";

// ── Outcome labels ──────────────────────────────────────────────────────────

/** Outcome selector: "Played" option label. */
export const OUTCOME_PLAYED_LABEL = "Played";

/** Outcome selector: "Forfeit" option label. */
export const OUTCOME_FORFEIT_LABEL = "Forfeit";

// ── Validation / error messages ─────────────────────────────────────────────

/** Shown when the user tries to save without selecting a winner (quick/forfeit mode). */
export const ERROR_SELECT_WINNER = "Select the winner before saving.";

/** Shown when the user tries to save without entering scores (detailed mode). */
export const ERROR_ENTER_SCORES = "Enter scores to determine a winner before saving.";

/** Shown when the network request fails and the server returns no specific message. */
export const ERROR_SUBMIT_FAILED = "Failed to submit result.";

/** Shown when the user is not authenticated when trying to submit. */
export const ERROR_NOT_AUTHENTICATED = "You must be logged in to submit results.";

/** Shown when the network is unreachable. Preserve entered data — do not clear the form. */
export const ERROR_NETWORK = "Couldn't save — check your connection and try again.";

// ── Success messages ────────────────────────────────────────────────────────

/** Shown when the result is submitted and is awaiting opponent confirmation. */
export const SUCCESS_PENDING_CONFIRMATION =
  "Result submitted — waiting on opponent confirmation.";

/** Shown when the result is immediately finalized (e.g. auto-accepted). */
export const SUCCESS_FINALIZED = "Result has been finalized.";

// ── Submit button labels ────────────────────────────────────────────────────

/** Submit button label when idle. */
export const SUBMIT_BUTTON_LABEL = "Submit Result";

/** Submit button label while the request is in-flight. */
export const SUBMIT_BUTTON_LOADING_LABEL = "Submitting...";

/** Winner section heading. */
export const WINNER_SECTION_LABEL = "Winner";

/** Set scores section heading. */
export const SET_SCORES_SECTION_LABEL = "Set Scores";

// ── Running sport ───────────────────────────────────────────────────────────

export const RUN_TIME_LABEL = "Finish time (MM:SS)";
export const RUN_TIME_PLACEHOLDER = "e.g. 25:30";
export const RUN_DISTANCE_LABEL = "Distance (metres, optional)";
export const RUN_DISTANCE_PLACEHOLDER = "e.g. 5000";
export const ERROR_RUN_TIME_REQUIRED =
  "Enter the finish time in minutes and seconds.";
export const ERROR_RUN_TIME_INVALID = "Finish time must be greater than zero.";
export const ERROR_RUN_DISTANCE_INVALID = "Distance must be a number in metres.";
export const SUCCESS_RUN_LOGGED =
  "Run logged — your time is now on the leaderboard.";
export const ERROR_RUN_SUBMIT_FAILED =
  "Couldn't save — check your connection and try again.";
export const ERROR_RUN_NETWORK =
  "Couldn't save — check your connection and try again.";
