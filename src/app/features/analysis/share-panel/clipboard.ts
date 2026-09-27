/**
 * Writes text to the clipboard. Returns false when the Clipboard API is missing (old browsers,
 * pages not served over HTTPS) or the browser refuses, so the caller can offer a manual copy.
 */
export const copyText = async (
  navigator: Navigator | undefined,
  text: string,
): Promise<boolean> => {
  try {
    if (!navigator?.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
