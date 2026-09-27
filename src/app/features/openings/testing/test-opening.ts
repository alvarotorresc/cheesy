import type {
  ContentLoaders,
  OpeningNode,
  OpeningSummary,
  OpeningTree,
} from '../../../core/content';
import type { Localized } from '../../../core/i18n';

/** Test data shared by the specs of this feature. Never imported by the app. */

const named = (en: string): Localized => ({ es: `${en} (es)`, en });

const node = (
  san: string,
  children: OpeningNode[] = [],
  extras: Partial<OpeningNode> = {},
): OpeningNode => ({ san, ...extras, children });

/**
 * Main line: 1.e4 e5 2.Nf3 Nc6 3.Bb5, where the tree ends.
 * Branches: 2.d4 (Centre Game) and 2...Nf6 (Petrov Defence).
 */
export const testTree = (overrides: Partial<OpeningTree> = {}): OpeningTree => ({
  id: 'test-opening',
  name: named('Test Opening'),
  eco: 'C20',
  side: 'white',
  description: named('A tree built for the tests.'),
  root: [
    node(
      'e4',
      [
        node(
          'e5',
          [
            node(
              'Nf3',
              [
                node(
                  'Nc6',
                  [node('Bb5', [], { main: true, comment: named('Pins nothing yet.') })],
                  {
                    main: true,
                  },
                ),
                node('Nf6', [], { name: named('Petrov Defence') }),
              ],
              { main: true, name: named('King Knight Opening'), comment: named('Attacks e5.') },
            ),
            node('d4', [], { name: named('Centre Game') }),
          ],
          { main: true, name: named('Open Game') },
        ),
      ],
      { main: true },
    ),
  ],
  ...overrides,
});

export const summaryOf = ({ id, name, eco, side, description }: OpeningTree): OpeningSummary => ({
  id,
  name,
  eco,
  side,
  description,
});

/** Content loaders serving the given trees, with a catalogue built from them. */
export const testLoaders = (trees: readonly OpeningTree[] = [testTree()]): ContentLoaders => ({
  openingCatalog: async () => trees.map(summaryOf),
  opening: async (id) => {
    const tree = trees.find((candidate) => candidate.id === id);
    if (!tree) throw new Error(`Unknown opening ${id}`);
    return tree;
  },
  endgames: async () => [],
  positions: async () => [],
});
