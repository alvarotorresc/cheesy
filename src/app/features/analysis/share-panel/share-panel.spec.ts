import type { Mock } from 'vitest';
import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { SharePanel } from './share-panel';

@Component({
  imports: [SharePanel],
  providers: [GameService],
  template: '<app-share-panel />',
})
class Host {
  readonly game = inject(GameService);
}

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('SharePanel', () => {
  let harness: RouterTestingHarness;
  let host: Host;
  let element: HTMLElement;
  let writeText: Mock<Clipboard['writeText']>;

  const setClipboard = (clipboard: Partial<Clipboard> | undefined): void => {
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  };

  const click = async (label: string): Promise<void> => {
    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!button) throw new Error(`Button not found: ${label}`);
    button.click();
    await vi.waitFor(() => expect(feedback()).not.toBe(''));
    await harness.fixture.whenStable();
  };

  const feedback = (): string =>
    element.querySelector('[role="status"]')?.textContent?.trim() ?? '';

  beforeEach(async () => {
    writeText = vi.fn<Clipboard['writeText']>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'analysis', component: Host }])],
    });
    TestBed.inject(I18nService).setLang('en');
    harness = await RouterTestingHarness.create();
    host = await harness.navigateByUrl('/analysis', Host);
    element = harness.routeNativeElement as HTMLElement;
    host.game.playSan('e4');
  });

  afterEach(() => {
    setClipboard(undefined);
    localStorage.clear();
  });

  it('should copy the FEN of the displayed position and confirm it', async () => {
    await click('Copy FEN');

    expect(writeText).toHaveBeenCalledWith(AFTER_E4);
    expect(feedback()).toBe('FEN copied.');
  });

  it('should copy the whole game as PGN', async () => {
    await click('Copy PGN');

    expect(writeText.mock.calls[0][0]).toContain('1. e4 *');
    expect(feedback()).toBe('PGN copied.');
  });

  it('should copy an absolute link to the position and show it in the address bar', async () => {
    await click('Copy link');

    const link = new URL(writeText.mock.calls[0][0] as string);
    expect(link.origin).toBe(location.origin);
    expect(link.pathname).toBe('/analysis');
    expect(link.searchParams.get('fen')).toBe(AFTER_E4);
    expect(TestBed.inject(Location).path()).toBe(
      TestBed.inject(Router).serializeUrl(
        TestBed.inject(Router).createUrlTree(['/analysis'], { queryParams: { fen: AFTER_E4 } }),
      ),
    );
  });

  it('should replace the history entry instead of adding one when copying the link', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    await click('Copy link');

    expect(navigate).toHaveBeenCalledWith(expect.anything(), { replaceUrl: true });
  });

  it('should show the text selected for a manual copy when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));

    await click('Copy FEN');

    const fallback = element.querySelector('textarea');
    expect(feedback()).toBe('Could not copy automatically. Select the text below and copy it.');
    expect(fallback?.value).toBe(AFTER_E4);
    expect(fallback?.readOnly).toBe(true);
    expect(document.activeElement).toBe(fallback);
    expect(element.querySelector(`label[for="${fallback?.id}"]`)).not.toBeNull();
  });

  it('should offer the manual copy when there is no Clipboard API', async () => {
    setClipboard(undefined);

    await click('Copy PGN');

    expect(element.querySelector('textarea')?.value).toContain('1. e4 *');
  });

  it('should hide the manual copy once a later copy succeeds', async () => {
    writeText.mockRejectedValueOnce(new Error('Denied'));
    await click('Copy FEN');

    await click('Copy PGN');

    expect(element.querySelector('textarea')).toBeNull();
    expect(feedback()).toBe('PGN copied.');
  });
});
