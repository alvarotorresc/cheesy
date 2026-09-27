import { Component, inject } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { ImportPanel } from './import-panel';

@Component({
  imports: [ImportPanel],
  providers: [GameService],
  template: '<app-import-panel />',
})
class Host {
  readonly game = inject(GameService);
}

describe('ImportPanel', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let i18n: I18nService;

  const textarea = (): HTMLTextAreaElement => {
    const found = element.querySelector('textarea');
    if (!found) throw new Error('Textarea not found');
    return found;
  };

  const feedback = (): HTMLElement => {
    const found = element.querySelector<HTMLElement>('[role="status"]');
    if (!found) throw new Error('Feedback not found');
    return found;
  };

  const submit = async (text: string): Promise<void> => {
    textarea().value = text;
    element.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    i18n = TestBed.inject(I18nService);
    i18n.setLang('en');
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should label the text field and link it to the feedback', () => {
    const label = element.querySelector(`label[for="${textarea().id}"]`);

    expect(label?.textContent?.trim()).toBe('FEN or PGN');
    expect(textarea().getAttribute('aria-describedby')).toBe(feedback().id);
  });

  it('should load a PGN into the page game and confirm it', async () => {
    await submit('1. e4 e5 2. Nf3');

    expect(fixture.componentInstance.game.moves()).toHaveLength(3);
    expect(feedback().textContent?.trim()).toBe('Game loaded.');
    expect(textarea().getAttribute('aria-invalid')).toBe('false');
  });

  it('should load a FEN and confirm it', async () => {
    await submit('4k3/8/8/8/8/8/8/4K2R w K - 0 1');

    expect(fixture.componentInstance.game.fen()).toBe('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(feedback().textContent?.trim()).toBe('Position loaded.');
  });

  it('should explain the error, mark the field and keep the game when the text is invalid', async () => {
    fixture.componentInstance.game.playSan('c4');

    await submit('1. e4 e5 2. Ke3');

    expect(feedback().textContent?.trim()).toBe('Illegal move in the PGN: 2. Ke3');
    expect(feedback().classList).toContain('error');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(fixture.componentInstance.game.moves()).toHaveLength(1);
  });

  it.each([
    ['', 'Paste a FEN or a PGN first.'],
    ['8/8/8/8/8/8/8/8 w - - 0 1', 'This FEN describes an impossible position.'],
    ['x/8/8/8/8/8/8/8 w - - 0 1', 'This FEN is not valid.'],
    ['just words', 'No moves or position found in this text.'],
    ['[Variant "Atomic"]\n\n1. e4', 'Only standard chess games can be loaded.'],
    ['[FEN "bad"]\n\n1. e4', 'The starting position of this PGN is not valid.'],
    ['e4 '.repeat(40_000), 'The text is too long to be a single game.'],
  ])('should explain why %j cannot be loaded', async (text, message) => {
    await submit(text);

    expect(feedback().textContent?.trim()).toBe(message);
  });

  it('should show untrusted text as plain text, never as markup', async () => {
    await submit('1. e4 <img src=x onerror=alert(1)> e5 2. Ke3');

    expect(element.querySelector('img')).toBeNull();
  });

  it('should translate the feedback when the language changes', async () => {
    await submit('1. e4');

    i18n.setLang('es');
    await fixture.whenStable();

    expect(feedback().textContent?.trim()).toBe('Partida cargada.');
  });
});
