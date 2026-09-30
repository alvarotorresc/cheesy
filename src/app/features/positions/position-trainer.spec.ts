import { plainText } from '../../core/content/testing';
import { TestBed } from '@angular/core/testing';
import type { CuratedPosition } from '../../core/content';
import { GameService } from '../../core/game';
import { PROGRESS_STORE_LOADER } from '../../core/progress';
import { memoryProgressStore } from '../openings/testing/memory-progress-store';
import { PositionTrainer } from './position-trainer';

const position = (overrides: Partial<CuratedPosition>): CuratedPosition => ({
  id: 'test',
  title: { es: 'Prueba', en: 'Test' },
  fen: '2q2r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1',
  playerSide: 'white',
  solution: ['Qg8+', 'Rxg8', 'Nf7#'],
  explanation: plainText('Explicación', 'Explanation'),
  tags: ['smothered-mate'],
  ...overrides,
});

const SMOTHERED = position({});

describe('PositionTrainer', () => {
  let trainer: PositionTrainer;
  let game: GameService;

  let memory: ReturnType<typeof memoryProgressStore>;

  beforeEach(() => {
    memory = memoryProgressStore();
    TestBed.configureTestingModule({
      providers: [
        GameService,
        PositionTrainer,
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
      ],
    });
    trainer = TestBed.inject(PositionTrainer);
    game = TestBed.inject(GameService);
  });

  describe('start', () => {
    it('should show the position and wait for the first move when the position is valid', () => {
      expect(trainer.start(SMOTHERED)).toBe(true);

      expect(game.fen()).toBe(SMOTHERED.fen);
      expect(trainer.phase()).toBe('guessing');
      expect(trainer.expected()?.san).toBe('Qg8+');
      expect(trainer.playerMoveCount()).toBe(2);
      expect(trainer.feedback()).toBeUndefined();
    });

    it('should refuse the position when its solution is illegal', () => {
      expect(trainer.start(position({ solution: ['Qg8+', 'Kxg8'] }))).toBe(false);

      expect(trainer.position()).toBeUndefined();
      expect(trainer.expected()).toBeUndefined();
    });

    it('should refuse the position when its FEN is invalid', () => {
      expect(trainer.start(position({ fen: 'not a fen' }))).toBe(false);
    });

    it('should refuse the position when the player is not the side to move', () => {
      expect(trainer.start(position({ playerSide: 'black' }))).toBe(false);
    });

    it('should forget the previous exercise when a new position starts', () => {
      trainer.start(SMOTHERED);
      trainer.play({ from: 'd5', to: 'd6' });
      trainer.showHint();

      trainer.start(position({ id: 'other' }));

      expect(trainer.feedback()).toBeUndefined();
      expect(trainer.hint()).toBeUndefined();
      expect(game.moves()).toEqual([]);
    });
  });

  describe('guessing', () => {
    beforeEach(() => {
      trainer.start(SMOTHERED);
    });

    it('should take back a wrong move and say which move it was', () => {
      trainer.play({ from: 'd5', to: 'd6' });

      expect(trainer.feedback()).toEqual({ kind: 'wrong', played: 'Qd6', from: 'd5', to: 'd6' });
      expect(game.fen()).toBe(SMOTHERED.fen);
      expect(game.moves()).toEqual([]);
      expect(trainer.phase()).toBe('guessing');
    });

    it('should keep the board playable after a wrong move so the user can try again', () => {
      trainer.play({ from: 'd5', to: 'd6' });
      trainer.play({ from: 'd5', to: 'g8' });

      expect(trainer.feedback()).toMatchObject({ kind: 'correct', played: 'Qg8+' });
    });

    it('should keep a right move and play the reply of the opponent', () => {
      trainer.play({ from: 'd5', to: 'g8' });

      expect(trainer.feedback()).toEqual({ kind: 'correct', played: 'Qg8+', reply: 'Rxg8' });
      expect(game.moves().map((move) => move.san)).toEqual(['Qg8+', 'Rxg8']);
      expect(trainer.expected()?.san).toBe('Nf7#');
      expect(trainer.phase()).toBe('guessing');
    });

    it('should finish the exercise when the last move of the solution is found', () => {
      trainer.play({ from: 'd5', to: 'g8' });
      trainer.play({ from: 'h6', to: 'f7' });

      expect(trainer.phase()).toBe('solved');
      expect(trainer.feedback()).toEqual({ kind: 'correct', played: 'Nf7#', reply: undefined });
      expect(trainer.expected()).toBeUndefined();
      expect(game.ply()).toBe(3);
    });

    it('should ignore an illegal move', () => {
      trainer.play({ from: 'd5', to: 'a1' });

      expect(trainer.feedback()).toBeUndefined();
      expect(game.moves()).toEqual([]);
    });

    it('should show the piece and square of the expected move when a hint is requested', () => {
      trainer.showHint();

      expect(trainer.hint()).toEqual({ role: 'queen', from: 'd5' });
    });

    it('should hide the hint once the expected move is found', () => {
      trainer.showHint();
      trainer.play({ from: 'd5', to: 'g8' });

      expect(trainer.hint()).toBeUndefined();
    });

    it('should keep the hint after a wrong move', () => {
      trainer.showHint();
      trainer.play({ from: 'd5', to: 'd6' });

      expect(trainer.hint()).toEqual({ role: 'queen', from: 'd5' });
    });

    it('should not move through the line while guessing', () => {
      trainer.play({ from: 'd5', to: 'g8' });
      trainer.goToStart();

      expect(game.ply()).toBe(2);
    });
  });

  describe('comparison by move', () => {
    it('should accept castling when the king is dropped two squares away', () => {
      trainer.start(position({ fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', solution: ['O-O'] }));

      trainer.play({ from: 'e1', to: 'g1' });

      expect(trainer.phase()).toBe('solved');
    });

    it('should accept castling when the king is dropped onto its rook', () => {
      trainer.start(position({ fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', solution: ['O-O'] }));

      trainer.play({ from: 'e1', to: 'h1' });

      expect(trainer.phase()).toBe('solved');
    });

    it('should reject castling on the other side', () => {
      trainer.start(position({ fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', solution: ['O-O'] }));

      trainer.play({ from: 'e1', to: 'c1' });

      expect(trainer.feedback()).toMatchObject({ kind: 'wrong', played: 'O-O-O' });
    });

    it('should accept the promotion to the piece of the solution', () => {
      trainer.start(position({ fen: '8/P7/8/8/8/8/k7/4K3 w - - 0 1', solution: ['a8=Q'] }));

      trainer.play({ from: 'a7', to: 'a8', promotion: 'queen' });

      expect(trainer.phase()).toBe('solved');
    });

    it('should reject the promotion to another piece', () => {
      trainer.start(position({ fen: '8/P7/8/8/8/8/k7/4K3 w - - 0 1', solution: ['a8=Q'] }));

      trainer.play({ from: 'a7', to: 'a8', promotion: 'knight' });

      expect(trainer.feedback()).toMatchObject({ kind: 'wrong', played: 'a8=N' });
      expect(game.moves()).toEqual([]);
    });

    it('should accept an en passant capture', () => {
      trainer.start(
        position({
          fen: 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
          solution: ['exd6'],
        }),
      );

      trainer.play({ from: 'e5', to: 'd6' });

      expect(trainer.phase()).toBe('solved');
    });

    it('should play the solution from the black side when black is to move', () => {
      trainer.start(
        position({
          fen: 'r1b1k2r/ppppqppp/2n5/4n3/1PP2B2/5N2/1P1NPPPP/R2QKB1R b KQkq - 0 8',
          playerSide: 'black',
          solution: ['Nd3#'],
        }),
      );

      trainer.play({ from: 'e5', to: 'd3' });

      expect(trainer.phase()).toBe('solved');
    });
  });

  describe('revealing the solution', () => {
    beforeEach(() => {
      trainer.start(SMOTHERED);
    });

    it('should load the whole line and stay on the start position when nothing was found', () => {
      trainer.showHint();
      trainer.play({ from: 'd5', to: 'd6' });

      trainer.revealSolution();

      expect(trainer.phase()).toBe('revealed');
      expect(game.moves().map((move) => move.san)).toEqual(['Qg8+', 'Rxg8', 'Nf7#']);
      expect(game.ply()).toBe(0);
      expect(trainer.feedback()).toBeUndefined();
      expect(trainer.hint()).toBeUndefined();
    });

    it('should stay on the position where the user stopped when part of the line was found', () => {
      trainer.play({ from: 'd5', to: 'g8' });

      trainer.revealSolution();

      expect(game.ply()).toBe(2);
      expect(trainer.currentStep()?.san).toBe('Rxg8');
    });

    it('should ignore moves on the board once the solution is shown', () => {
      trainer.revealSolution();
      trainer.play({ from: 'd5', to: 'g8' });

      expect(trainer.phase()).toBe('revealed');
      expect(game.ply()).toBe(0);
      expect(trainer.feedback()).toBeUndefined();
    });

    it('should do nothing when there is no exercise', () => {
      trainer.start(position({ fen: 'not a fen' }));

      trainer.revealSolution();
      trainer.showHint();

      expect(trainer.phase()).toBe('guessing');
      expect(trainer.hint()).toBeUndefined();
    });
  });

  describe('replay', () => {
    beforeEach(() => {
      trainer.start(SMOTHERED);
      trainer.revealSolution();
    });

    it('should move through the solution one step at a time', () => {
      trainer.goForward();
      expect(trainer.currentStep()?.san).toBe('Qg8+');

      trainer.goForward();
      trainer.goBack();
      expect(game.ply()).toBe(1);
    });

    it('should jump to the end and back to the start of the solution', () => {
      trainer.goToEnd();
      expect(game.ply()).toBe(3);
      expect(trainer.currentStep()?.isMate).toBe(true);

      trainer.goToStart();
      expect(game.ply()).toBe(0);
      expect(trainer.currentStep()).toBeUndefined();
    });

    it('should jump to a chosen step', () => {
      trainer.goTo(2);

      expect(trainer.currentStep()?.san).toBe('Rxg8');
    });

    it('should start the exercise again when retrying', () => {
      trainer.goToEnd();

      trainer.retry();

      expect(trainer.phase()).toBe('guessing');
      expect(game.moves()).toEqual([]);
      expect(game.fen()).toBe(SMOTHERED.fen);
    });
  });

  it('should do nothing when retrying without a position', () => {
    trainer.retry();

    expect(trainer.position()).toBeUndefined();
  });
  describe('progress', () => {
    const settle = () => vi.waitFor(() => expect(memory.positionRows.size).toBeGreaterThan(0));

    it('should record a clean solve as done on the first try, by content id', async () => {
      trainer.start(SMOTHERED);
      trainer.play({ from: 'd5', to: 'g8' });
      trainer.play({ from: 'h6', to: 'f7' });

      await vi.waitFor(() => expect(trainer.result()).toBe('first'));
      expect(memory.positionRows.get('test')).toMatchObject({ solves: 1, firstTry: true });
    });

    it('should spoil the first try with a wrong move, and say only "solved"', async () => {
      trainer.start(SMOTHERED);
      trainer.play({ from: 'd5', to: 'd6' });
      await settle();
      expect(memory.positionRows.get('test')).toMatchObject({ solves: 0, spoiled: true });

      trainer.play({ from: 'd5', to: 'g8' });
      trainer.play({ from: 'h6', to: 'f7' });

      await vi.waitFor(() => expect(trainer.result()).toBe('solved'));
      expect(memory.positionRows.get('test')).toMatchObject({ solves: 1, firstTry: false });
    });

    it('should spoil the first try with a hint', async () => {
      trainer.start(SMOTHERED);
      trainer.showHint();

      await settle();
      expect(memory.positionRows.get('test')?.spoiled).toBe(true);
    });

    it('should spoil the first try with the solution, and not count it as solved', async () => {
      trainer.start(SMOTHERED);
      trainer.revealSolution();

      await settle();
      expect(memory.positionRows.get('test')).toMatchObject({ solves: 0, spoiled: true });
      expect(trainer.result()).toBeUndefined();
    });

    it('should save nothing when the browser keeps no progress', async () => {
      TestBed.resetTestingModule();
      const failing = memoryProgressStore({ failWrites: true });
      TestBed.configureTestingModule({
        providers: [
          GameService,
          PositionTrainer,
          { provide: PROGRESS_STORE_LOADER, useValue: failing.loader },
        ],
      });
      const other = TestBed.inject(PositionTrainer);
      other.start(SMOTHERED);
      other.play({ from: 'd5', to: 'g8' });
      other.play({ from: 'h6', to: 'f7' });

      await vi.waitFor(() => expect(other.result()).toBe('unsaved'));
    });
  });
});
