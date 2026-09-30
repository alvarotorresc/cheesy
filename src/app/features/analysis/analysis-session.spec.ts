import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { parseAnalysisParams } from '../../core/analysis-link';
import { OpeningBook } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { MAX_TREE_NODES, MoveTree, ROOT_ID } from '../../core/move-tree';
import { ReadingModeService } from '../../core/reading-mode';
import { ToastService } from '../../shared/toast';
import { AnalysisSession, REPLAY_START_MS, REPLAY_STEP_MS } from './analysis-session';

describe('AnalysisSession', () => {
  let session: AnalysisSession;
  let toasts: string[];

  const sans = (): string[] =>
    session
      .tree()
      .mainLine()
      .map((node) => node.san);
  const play = (from: string, to: string) => session.play({ from: from as never, to: to as never });

  beforeEach(() => {
    toasts = [];
    TestBed.configureTestingModule({ providers: [AnalysisSession] });
    TestBed.inject(I18nService).setLang('es');
    // The messages are checked in words, the mode for those who do not read notation.
    TestBed.inject(ReadingModeService).setMode('words');
    vi.spyOn(TestBed.inject(ToastService), 'show').mockImplementation((text) => {
      toasts.push(text);
    });
    session = TestBed.inject(AnalysisSession);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should start empty at the initial position', () => {
    expect(session.currentId()).toBe(ROOT_ID);
    expect(session.tree().size).toBe(0);
    expect(session.turnColor()).toBe('white');
    expect(session.dests().size).toBe(10);
    expect(session.canUndo()).toBe(false);
  });

  it('should play moves and follow them', () => {
    play('e2', 'e4');
    play('e7', 'e5');

    expect(sans()).toEqual(['e4', 'e5']);
    expect(session.lastMove()).toEqual(['e7', 'e5']);
    expect(session.fresh()).toBe(session.currentId());
    expect(toasts).toEqual([]);
  });

  it('should ignore an illegal move', () => {
    play('e2', 'e5');

    expect(session.tree().size).toBe(0);
  });

  it('should create a variation, keep the line and say so when playing from the past', () => {
    play('e2', 'e4');
    play('e7', 'e5');
    session.previous();
    play('c7', 'c5');

    expect(sans()).toEqual(['e4', 'e5']);
    expect(session.current().san).toBe('c5');
    expect(session.hasVariations()).toBe(true);
    expect(toasts).toEqual(['Nueva variante con 1... Peón a c5: la línea que tenías sigue ahí.']);
  });

  it('should reuse a move that is already there instead of repeating it', () => {
    play('e2', 'e4');
    session.first();
    play('e2', 'e4');

    expect(session.tree().size).toBe(1);
    expect(session.fresh()).toBeUndefined();
    expect(toasts).toEqual([]);
  });

  it('should say so when the tree is full', () => {
    const tree = session.tree();
    let id = ROOT_ID;
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    for (let index = 0; index < MAX_TREE_NODES; index++) {
      id = tree.playSan(id, shuffle[index % 4])!.id;
    }
    session.goTo(id);

    play('e2', 'e4');

    expect(toasts).toEqual(['No caben más jugadas en este tablero. Deshaz alguna o reinicia.']);
  });

  it('should undo the end of the line and stay put when it is not the current move', () => {
    play('e2', 'e4');
    play('e7', 'e5');
    session.first();

    session.undo();
    expect(sans()).toEqual(['e4']);
    expect(session.currentId()).toBe(ROOT_ID);
    expect(toasts).toEqual(['Jugada deshecha: 1... Peón a e5.']);

    session.last();
    session.undo();
    expect(session.tree().size).toBe(0);
    expect(session.canUndo()).toBe(false);
  });

  it('should move between alternatives with sibling', () => {
    play('e2', 'e4');
    session.first();
    play('d2', 'd4');
    session.first();
    play('c2', 'c4');

    session.sibling(-1);
    expect(session.current().san).toBe('d4');
    session.sibling(-1);
    expect(session.current().san).toBe('e4');
    session.sibling(-1);
    expect(session.current().san).toBe('e4');
    session.sibling(1);
    session.sibling(1);
    expect(session.current().san).toBe('c4');
  });

  it('should go back to the main line from a variation inside another', () => {
    const tree = MoveTree.fromPgn('1. e4 e5 (1... c5 2. Nf3 (2. c3 d5)) 2. Nf3');
    session.open({ status: 'ok', tree, currentId: tree.lineEnd('n2') });
    session.goTo('n6');

    session.backToMainLine();

    expect(session.current().san).toBe('e4');
  });

  it('should fold and unfold a variation', () => {
    session.toggleCollapsed('n3');
    expect([...session.collapsed()]).toEqual(['n3']);
    session.toggleCollapsed('n3');
    expect(session.collapsed().size).toBe(0);
  });

  it('should reset to an empty board without the "From" notice and say so', () => {
    const tree = MoveTree.fromPgn('1. e4 e6');
    session.origin.set({
      kind: 'opening',
      title: { es: 'Defensa Francesa', en: 'French Defence' },
      variation: undefined,
      arrivalId: 'n2',
      book: OpeningBook.from({
        id: 'x',
        name: { es: '', en: '' },
        eco: '',
        side: 'white',
        description: { es: '', en: '' },
        root: [],
      }),
      back: ['/openings', 'french-defence'],
    });
    session.open({ status: 'ok', tree, currentId: 'n2' });

    session.reset();

    expect(session.tree().size).toBe(0);
    expect(session.origin()).toBeUndefined();
    expect(toasts).toEqual(['Tablero reiniciado.']);
  });

  it('should load a PGN with its variations and show its last move', () => {
    const outcome = session.load('1. e4 e5 (1... c5) 2. Nf3');

    expect(outcome.ok).toBe(true);
    expect(session.tree().toPgn()).toBe('1. e4 e5 (1... c5) 2. Nf3');
    expect(session.current().san).toBe('Nf3');
  });

  it('should keep the board when a load fails', () => {
    play('d2', 'd4');

    expect(session.load('1. e4 Ke3').ok).toBe(false);
    expect(sans()).toEqual(['d4']);
  });

  it('should flag an invalid link', () => {
    session.open({ status: 'invalid' });

    expect(session.invalidLink()).toBe(true);
    expect(session.tree().size).toBe(0);
  });

  it('should play the line of an arrival up to its move, one move at a time', () => {
    vi.useFakeTimers();
    const link = parseAnalysisParams(
      convertToParamMap({ pgn: '1. e4 e6 2. d4', ply: '2', from: 'opening:french-defence' }),
    );

    session.open(link, true);

    expect(session.currentId()).toBe(ROOT_ID);
    vi.advanceTimersByTime(REPLAY_START_MS);
    expect(session.current().san).toBe('e4');
    vi.advanceTimersByTime(REPLAY_STEP_MS);
    expect(session.current().san).toBe('e6');
    vi.advanceTimersByTime(REPLAY_STEP_MS * 5);
    expect(session.current().san).toBe('e6');
  });

  it('should stop the arrival replay when the user moves', () => {
    vi.useFakeTimers();
    const link = parseAnalysisParams(convertToParamMap({ pgn: '1. e4 e6 2. d4' }));

    session.open(link, true);
    session.last();
    vi.advanceTimersByTime(REPLAY_START_MS * 4);

    expect(session.current().san).toBe('d4');
  });
});
