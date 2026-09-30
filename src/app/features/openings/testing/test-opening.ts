import { plainText } from '../../../core/content/testing';
import type {
  ContentLoaders,
  OpeningNode,
  OpeningSummary,
  OpeningTree,
  RichText,
} from '../../../core/content';
import type { Localized } from '../../../core/i18n';

/** Test data shared by the specs of this feature. Never imported by the app. */

const named = (en: string): Localized => ({ es: `${en} (es)`, en });
export const rich = (en: string): RichText => plainText(`${en} (es)`, en);

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
  description: rich('A tree built for the tests.'),
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
                node('Nc6', [node('Bb5', [], { main: true, comment: rich('Pins nothing yet.') })], {
                  main: true,
                }),
                node('Nf6', [], { name: named('Petrov Defence') }),
              ],
              { main: true, name: named('King Knight Opening'), comment: rich('Attacks e5.') },
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

const leaves = (nodes: readonly OpeningNode[]): number =>
  nodes.reduce((total, node) => total + (node.children.length ? leaves(node.children) : 1), 0);

/** Catalogue entry of a tree, computed the way `pnpm content:build` does. */
export const summaryOf = ({
  id,
  name,
  eco,
  side,
  description,
  root,
}: OpeningTree): OpeningSummary => {
  const line: OpeningNode[] = [];
  for (let level = root; level.length;) {
    const step = level.find((node) => node.main) ?? level[0];
    line.push(step);
    level = step.children;
  }
  const named = line.slice(0, 10).findIndex((node, index) => node.name && index + 1 >= 4);
  return {
    id,
    name,
    eco,
    side,
    description,
    lineCount: leaves(root),
    preview: {
      sans: line.slice(0, 12).map((node) => node.san),
      names: line.slice(0, 12).map((node) => node.name ?? null),
      namedPly: named >= 0 ? named + 1 : Math.min(6, line.length),
    },
  };
};

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
