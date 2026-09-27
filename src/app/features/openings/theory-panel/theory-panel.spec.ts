import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Color } from 'chessops';
import { OpeningBook } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { describeTheory } from '../opening-theory';
import { summaryOf, testTree } from '../testing/test-opening';
import { TheoryPanel } from './theory-panel';

describe('TheoryPanel', () => {
  const book = OpeningBook.from(testTree());
  let fixture: ComponentFixture<TheoryPanel>;
  let element: HTMLElement;

  const render = async (sans: string[], playerColor: Color = 'white'): Promise<void> => {
    fixture.componentRef.setInput('theory', describeTheory(book, sans));
    fixture.componentRef.setInput('playerColor', playerColor);
    await fixture.whenStable();
  };

  const text = (selector: string): string =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(() => {
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(TheoryPanel);
    fixture.componentRef.setInput('opening', summaryOf(testTree()));
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show the opening and its description before any move', async () => {
    await render([]);

    expect(text('.variation')).toBe('Test Opening');
    expect(text('.comment')).toBe('A tree built for the tests.');
    expect(text('.state')).toBe('You are in our lines.');
  });

  it('should show the variation and the idea behind the last move while in our lines', async () => {
    await render(['e4', 'e5', 'Nf3']);

    expect(text('.variation')).toBe('King Knight Opening');
    expect(text('.comment')).toBe('Attacks e5.');
  });

  it('should not repeat the description once a move without comment is played', async () => {
    await render(['e4']);

    expect(element.querySelector('.comment')).toBeNull();
  });

  it('should say where the player left our lines and what they had', async () => {
    await render(['e4', 'e5', 'Bc4']);

    expect(text('.state')).toBe('You left our lines with 2.Bc4. Our lines went on with 2.Nf3.');
  });

  it('should say when the rival is the one who left our lines', async () => {
    await render(['e4', 'c5'], 'white');

    expect(text('.state')).toBe(
      'Your rival left our lines with 1...c5. Our lines went on with 1...e5.',
    );
  });

  it('should say when our lines end', async () => {
    await render(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

    expect(text('.state')).toBe('Our lines end here. From now on, Stockfish plays.');
  });

  it('should follow the language of the interface', async () => {
    await render(['e4', 'e5', 'Nf3']);

    TestBed.inject(I18nService).setLang('es');
    await fixture.whenStable();

    expect(text('.variation')).toBe('King Knight Opening (es)');
    expect(text('h2')).toBe('Teoría');
  });
});
