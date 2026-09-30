import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Chess } from 'chessops';
import { INITIAL_FEN, makeBoardFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { bundledContentLoaders } from '../../core/content/testing';
import { MiniBoard } from './mini-board';
import { framesFromLine, type MiniFrame } from './mini-frames';

const LINE = ['e4', 'e5', 'Nf3', 'Nc6'];

/** Where each piece element sits, read from its transform: `translate(x%, y%)`. */
const placed = (element: HTMLElement, flipped: boolean): Map<string, string> => {
  const map = new Map<string, string>();
  for (const piece of element.querySelectorAll<HTMLElement>('.pc:not(.gone)')) {
    const [x, y] = piece.style.transform.match(/-?\d+(\.\d+)?(?=%)/g)!.map((n) => Number(n) / 100);
    const file = flipped ? 7 - x : x;
    const rank = flipped ? y : 7 - y;
    const code = [...piece.classList].find((name) => name.startsWith('pc-'))!.slice(3);
    map.set(`${'abcdefgh'[file]}${rank + 1}`, code);
  }
  return map;
};

/** Pieces of a board FEN by square, with the same codes the elements use. */
const boardOf = (boardFen: string): Map<string, string> => {
  const map = new Map<string, string>();
  boardFen.split('/').forEach((row, index) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) file += Number(char);
      else {
        const white = char === char.toUpperCase();
        map.set(`${'abcdefgh'[file]}${8 - index}`, (white ? 'w' : 'b') + char.toUpperCase());
        file++;
      }
    }
  });
  return map;
};

describe('MiniBoard', () => {
  let fixture: ComponentFixture<MiniBoard>;
  let element: HTMLElement;
  let frames: MiniFrame[];

  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  beforeEach(async () => {
    frames = framesFromLine(INITIAL_FEN, LINE);
    fixture = TestBed.createComponent(MiniBoard);
    fixture.componentRef.setInput('frames', frames);
    fixture.componentRef.setInput('label', 'Ruy Lopez');
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const board = (): HTMLElement => element.querySelector('.board') as HTMLElement;

  it('should be an image with the given description and no focus of its own', () => {
    expect(board().getAttribute('role')).toBe('img');
    expect(board().getAttribute('aria-label')).toBe('Ruy Lopez');
    expect(element.querySelector('[tabindex], button, a')).toBeNull();
  });

  it('should draw the pieces of the frame at its ply on their squares', async () => {
    fixture.componentRef.setInput('ply', 3);
    await fixture.whenStable();

    const pieces = placed(element, false);
    expect(pieces.size).toBe(32);
    expect(pieces.get('e4')).toBe('wP');
    expect(pieces.get('f3')).toBe('wN');
    expect(pieces.get('e5')).toBe('bP');
    expect(pieces.get('g1')).toBeUndefined();
  });

  it('should mark the two squares of the last move and hide the marks at the start', async () => {
    const marks = (): boolean[] =>
      Array.from(element.querySelectorAll<HTMLElement>('.sq.hl'), (mark) => mark.hidden === true);
    expect(marks()).toEqual([true, true]);

    fixture.componentRef.setInput('ply', 1);
    await fixture.whenStable();

    expect(marks()).toEqual([false, false]);
  });

  it('should turn the board around when black is at the bottom', async () => {
    fixture.componentRef.setInput('ply', 1);
    fixture.componentRef.setInput('orientation', 'black');
    await fixture.whenStable();

    const pieces = placed(element, true);
    expect(pieces.get('e4')).toBe('wP');
    expect(pieces.get('e8')).toBe('bK');
    const king = [...element.querySelectorAll<HTMLElement>('.pc-bK')][0];
    // With black at the bottom the black king on e8 is drawn on the bottom row.
    expect(king.style.transform).toBe('translate(300%, 700%)');
  });

  /** Every value the class attribute of the board had while `action` ran and rendered. */
  const classesDuring = async (action: () => void): Promise<string[]> => {
    const seen: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) seen.push(record.oldValue ?? '');
    });
    observer.observe(board(), {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
    action();
    await fixture.whenStable();
    await nextFrame();
    await fixture.whenStable();
    observer.disconnect();
    return seen;
  };

  it('should slide the pieces when the ply rises by one', async () => {
    fixture.componentRef.setInput('ply', 1);
    await fixture.whenStable();

    const seen = await classesDuring(() => fixture.componentRef.setInput('ply', 2));

    expect(seen.some((classes) => classes.includes('resetting'))).toBe(false);
    expect(board().classList).not.toContain('resetting');
  });

  it.each([
    ['skips ahead', 1, 4],
    ['falls', 3, 1],
    ['goes back to the start', 2, 0],
  ])('should jump without a transition when the ply %s, then give it back', async (_, from, to) => {
    fixture.componentRef.setInput('ply', from);
    await fixture.whenStable();

    const seen = await classesDuring(() => fixture.componentRef.setInput('ply', to));

    // The board was in the "resetting" state when the pieces moved, and left it afterwards.
    expect(seen.some((classes) => classes.includes('resetting'))).toBe(true);
    expect(board().classList).not.toContain('resetting');
  });

  it('should jump when the frames change', async () => {
    const seen = await classesDuring(() =>
      fixture.componentRef.setInput('frames', framesFromLine(INITIAL_FEN, ['d4'])),
    );

    expect(seen.some((classes) => classes.includes('resetting'))).toBe(true);
  });

  it('should dim, ring and light rings and ranks on request', async () => {
    fixture.componentRef.setInput('fading', true);
    fixture.componentRef.setInput('ring', true);
    fixture.componentRef.setInput('rings', ['e1', 'e8']);
    fixture.componentRef.setInput('ringsOn', true);
    fixture.componentRef.setInput('highlightRank', 8);
    await fixture.whenStable();

    for (const name of ['fading', 'ring', 'rings']) expect(board().classList).toContain(name);
    expect(element.querySelectorAll('.sq.ring')).toHaveLength(2);
    expect(element.querySelector<HTMLElement>('.rank-hl')?.style.transform).toBe('translateY(0%)');
  });

  it('should draw an arrow from the centre of one square to the centre of another', async () => {
    fixture.componentRef.setInput('arrows', [{ from: 'a1', to: 'h8' }]);
    await fixture.whenStable();
    const line = element.querySelector('svg.arrows line')!;
    expect([line.getAttribute('x1'), line.getAttribute('y1')]).toEqual(['0.5', '7.5']);
    expect([line.getAttribute('x2'), line.getAttribute('y2')]).toEqual(['7.5', '0.5']);
  });

  it('should flip the arrows with the board', async () => {
    fixture.componentRef.setInput('arrows', [{ from: 'a1', to: 'h8' }]);
    fixture.componentRef.setInput('orientation', 'black');
    await fixture.whenStable();
    const line = element.querySelector('svg.arrows line')!;
    expect([line.getAttribute('x1'), line.getAttribute('y1')]).toEqual(['7.5', '0.5']);
  });

  it('should draw no arrow layer without arrows', async () => {
    await fixture.whenStable();
    expect(element.querySelector('svg.arrows')).toBeNull();
  });
});

describe('MiniBoard with the Dragon Variation', () => {
  it('should end on the position reached after 5...g6 (the ply the Dragon is named at)', async () => {
    const tree = await bundledContentLoaders.opening('sicilian-dragon');
    const sans: string[] = [];
    for (let level = tree.root; level.length && sans.length < 10;) {
      const step = level.find((node) => node.main) ?? level[0];
      sans.push(step.san);
      level = step.children;
    }
    expect(sans.at(-1)).toBe('g6');

    const frames = framesFromLine(INITIAL_FEN, sans);
    const fixture = TestBed.createComponent(MiniBoard);
    fixture.componentRef.setInput('frames', frames);
    fixture.componentRef.setInput('ply', frames.length - 1);
    fixture.componentRef.setInput('orientation', 'black');
    fixture.componentRef.setInput('label', 'Sicilian Dragon');
    await fixture.whenStable();

    const position = Chess.fromSetup(parseFen(INITIAL_FEN).unwrap()).unwrap();
    for (const san of sans) position.play(parseSan(position, san)!);
    const expected = boardOf(makeBoardFen(position.board));
    expect(placed(fixture.nativeElement, true)).toEqual(expected);
    expect(expected.get('g6')).toBe('bP');
  });
});
