import { copyText } from './clipboard';

const withClipboard = (clipboard: Partial<Clipboard> | undefined): Navigator =>
  ({ clipboard }) as Navigator;

describe('copyText', () => {
  it('should write the text and report success when the clipboard accepts it', async () => {
    const writeText = vi.fn<Clipboard['writeText']>().mockResolvedValue(undefined);

    await expect(copyText(withClipboard({ writeText }), 'e4')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('e4');
  });

  it('should report failure when the browser refuses the write', async () => {
    const writeText = vi
      .fn<Clipboard['writeText']>()
      .mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));

    await expect(copyText(withClipboard({ writeText }), 'e4')).resolves.toBe(false);
  });

  it('should report failure when there is no Clipboard API', async () => {
    await expect(copyText(withClipboard(undefined), 'e4')).resolves.toBe(false);
    await expect(copyText(undefined, 'e4')).resolves.toBe(false);
  });
});
