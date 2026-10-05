/** Kebab-case: lowercase letters and digits in words joined by single hyphens. */
const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CONTENT_ID_LENGTH = 64;

/**
 * Whether a value can be the id of a piece of content (an opening, an endgame, a position). Ids
 * reach the app from URLs and browser storage, and become part of file paths: only kebab-case of a
 * sensible length gets through, so a malformed id is rejected before anything is loaded.
 */
export const isContentId = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_CONTENT_ID_LENGTH && CONTENT_ID.test(value);

/** A Lichess puzzle id: five letters and digits, upper and lower case ("KEPe0"). */
const PUZZLE_ID = /^[A-Za-z0-9]{5}$/;

/**
 * Whether a value can be the id of a Lichess puzzle. Puzzle ids reach the app from browser
 * storage, where they can be edited, so they are checked like content ids.
 */
export const isPuzzleId = (value: unknown): value is string =>
  typeof value === 'string' && PUZZLE_ID.test(value);
