const OPENING_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 64;

/**
 * Ids come from the URL: only kebab-case of a sensible length reaches the content service, so a
 * malformed id is rejected before anything is loaded.
 */
export const isOpeningId = (id: string): boolean =>
  id.length <= MAX_ID_LENGTH && OPENING_ID.test(id);
