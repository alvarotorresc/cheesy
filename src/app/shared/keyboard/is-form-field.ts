/**
 * Whether a keyboard event comes from a form field or editable text. Keys typed there belong to
 * the field (arrows move the caret or change the option), so page shortcuts must ignore them.
 */
export const isFormField = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest('input, textarea, select, [contenteditable]') !== null;
