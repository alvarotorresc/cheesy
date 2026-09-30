import { Component, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { MoveText } from './move';

@Component({
  imports: [MoveText],
  template: `<button type="button">
    <app-move
      [san]="san()"
      [color]="color()"
      [format]="format()"
      [start]="start()"
      [prefix]="prefix()"
      [tooltip]="tooltip()"
    />
  </button>`,
})
class Host {
  readonly san = input('Nxf7+');
  readonly color = input<'white' | 'black'>('white');
  readonly format = input<'compact' | 'full'>('compact');
  readonly start = input(true);
  readonly prefix = input<string | undefined>(undefined);
  readonly tooltip = input(true);
}

describe('MoveText', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let mode: ReadingModeService;

  const render = async (inputs: Record<string, unknown> = {}): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };
  const visible = (): string =>
    element.querySelector('[aria-hidden="true"]')?.textContent?.trim() ?? '';
  const spoken = (): string => element.querySelector('.visually-hidden')?.textContent?.trim() ?? '';

  beforeEach(() => {
    TestBed.inject(I18nService).setLang('es');
    mode = TestBed.inject(ReadingModeService);
    mode.setMode('words');
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('should draw the piece image in compact words mode', async () => {
    await render();

    const icon = element.querySelector('.pc');
    expect(icon?.classList).toContain('pc-wN');
    expect(visible()).toBe('×f7+');
  });

  it('should write the visible text with no space around it', async () => {
    await render();
    const shown = (): string | null | undefined => element.querySelector('.shown')?.textContent;

    expect(shown()).toBe('×f7+');

    mode.setMode('notation');
    await fixture.whenStable();

    expect(shown()).toBe('Cxf7+');
  });

  it('should give the button the sentence as its accessible name', async () => {
    await render();

    expect(spoken()).toBe('Caballo captura en f7, jaque');
    expect(element.querySelector('app-move')?.getAttribute('title')).toBe(
      'Caballo captura en f7, jaque',
    );
  });

  it('should leave the title to the host when asked, in both modes', async () => {
    await render({ tooltip: false });
    expect(element.querySelector('app-move')?.hasAttribute('title')).toBe(false);
    expect(spoken()).toBe('Caballo captura en f7, jaque');

    mode.setMode('notation');
    await fixture.whenStable();
    expect(element.querySelector('app-move')?.hasAttribute('title')).toBe(false);
  });

  it('should write the sentence in full words mode, without a title', async () => {
    await render({ format: 'full' });

    expect(visible()).toBe('Caballo captura en f7, jaque');
    expect(element.querySelector('.pc')).toBeNull();
    expect(element.querySelector('app-move')?.hasAttribute('title')).toBe(false);
  });

  it('should write the localized SAN in notation mode and still speak the sentence', async () => {
    mode.setMode('notation');
    await render();

    expect(visible()).toBe('Cxf7+');
    expect(spoken()).toBe('Caballo captura en f7, jaque');
  });

  it('should write castling as a word in compact words mode and say which in the title', async () => {
    await render({ san: 'O-O' });
    expect(visible()).toBe('Enroque');
    expect(element.querySelector('app-move')?.getAttribute('title')).toBe('Enroque corto');

    TestBed.inject(I18nService).setLang('en');
    await render({ san: 'O-O-O#', color: 'black' });
    expect(visible()).toBe('Castles#');
    expect(spoken()).toBe('Queenside castling, checkmate');

    await render({ format: 'full' });
    expect(visible()).toBe('Queenside castling, checkmate');

    mode.setMode('notation');
    await render({ format: 'compact' });
    expect(visible()).toBe('O-O-O#');
  });

  it('should write the move in lower case when it does not open a sentence', async () => {
    await render({ san: 'Ke7', color: 'black', format: 'full', start: false });

    expect(visible()).toBe('rey a e7');
    expect(spoken()).toBe('rey a e7');
  });

  it('should put the move number in front only in notation mode', async () => {
    await render({ san: 'Ke7', color: 'black', format: 'full', prefix: '1...' });
    expect(visible()).toBe('Rey a e7');

    mode.setMode('notation');
    await fixture.whenStable();
    expect(visible()).toBe('1...Re7');
    expect(spoken()).toBe('Rey a e7');
  });

  it('should follow a mode change', async () => {
    await render();
    mode.setMode('notation');
    await fixture.whenStable();

    expect(visible()).toBe('Cxf7+');
  });

  it('should keep the piece image and its square on one line only in compact words mode', async () => {
    const whiteSpace = (): string =>
      getComputedStyle(element.querySelector('.shown') as HTMLElement).whiteSpace;
    await render();
    expect(whiteSpace()).toBe('nowrap');

    await render({ format: 'full' });
    expect(whiteSpace()).not.toBe('nowrap');

    await render({ format: 'compact' });
    mode.setMode('notation');
    await fixture.whenStable();
    expect(whiteSpace()).not.toBe('nowrap');
  });

  it('should hold its hidden sentence, so a scrolling strip clips it', async () => {
    await render();
    const host = element.querySelector('app-move') as HTMLElement;

    // The sentence is absolutely positioned; without a positioned host it escapes the strip's
    // clipping and widens the whole page (the openings shelf at 360 px).
    expect(getComputedStyle(host).position).toBe('relative');
  });
});
