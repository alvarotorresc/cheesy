import { TestBed } from '@angular/core/testing';
import type { Role } from 'chessops';
import { bundledContentLoaders } from '../../core/content';
import { GameService, type MoveInput } from '../../core/game';
import { en } from '../../core/i18n/dictionaries/en';
import { es } from '../../core/i18n/dictionaries/es';
import { PositionTrainer } from './position-trainer';
import type { SolutionStep } from './solution-line';

const PROMOTIONS: Readonly<Record<string, Role>> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

/** The move as the board sends it: squares and, when promoting, the chosen piece. */
const boardMove = (step: SolutionStep): MoveInput => ({
  from: step.from,
  to: step.to,
  promotion: PROMOTIONS[step.uci[4]],
});

/** Every position shipped with the app must be playable from start to end by this feature. */
describe('Positions feature with the real content', async () => {
  // The same loader the app uses, read while collecting the tests to get one suite per position.
  const positions = await bundledContentLoaders.positions();

  it('should ship at least one position with a unique id', () => {
    const ids = positions.map((position) => position.id);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should translate every theme tag of the content into both languages', () => {
    const tags = [...new Set(positions.flatMap((position) => position.tags))];

    expect(tags.filter((tag) => !Object.hasOwn(en.positions.tags, tag))).toEqual([]);
    expect(tags.filter((tag) => !Object.hasOwn(es.positions.tags, tag))).toEqual([]);
  });

  describe.each(positions.map((position) => [position.id, position] as const))(
    '%s',
    (_id, position) => {
      let trainer: PositionTrainer;
      let game: GameService;

      beforeEach(() => {
        TestBed.configureTestingModule({ providers: [GameService, PositionTrainer] });
        trainer = TestBed.inject(PositionTrainer);
        game = TestBed.inject(GameService);
        expect(trainer.start(position)).toBe(true);
      });

      it('should start with the player to move and a line that alternates sides', () => {
        const line = trainer.line();

        expect(game.turn()).toBe(position.playerSide);
        expect(line).toHaveLength(position.solution.length);
        expect(line.map((step) => step.byPlayer)).toEqual(
          line.map((_step, index) => index % 2 === 0),
        );
        expect(line.at(-1)?.byPlayer).toBe(true);
      });

      it('should solve the exercise when every player move is played on the board', () => {
        const line = trainer.line();
        for (const step of line.filter((candidate) => candidate.byPlayer)) {
          expect(trainer.expected()).toBe(step);
          trainer.play(boardMove(step));
          expect(trainer.feedback()?.kind).toBe('correct');
        }

        expect(trainer.phase()).toBe('solved');
        expect(game.fen()).toBe(line.at(-1)?.fenAfter);
        expect(game.moves().map((move) => move.san)).toEqual(line.map((step) => step.san));
      });

      it('should replay the whole solution after revealing it', () => {
        const line = trainer.line();
        trainer.revealSolution();

        for (const [index, step] of line.entries()) {
          trainer.goForward();
          expect(trainer.currentStep()).toBe(line[index]);
          expect(game.fen()).toBe(step.fenAfter);
        }
        trainer.retry();

        expect(trainer.phase()).toBe('guessing');
        expect(game.moves()).toEqual([]);
      });
    },
  );
});
