// Prints every move and square found in the texts of the content, to review the tokenizer by eye.
// Run: node content/authoring/rich-text-audit.ts
import { allOpenings } from './openings.ts';
import { endgames } from './endgames.ts';
import { positions } from './positions.ts';
import { tokenize } from '../lib/rich-text.ts';
import type { Localized } from '../types.ts';

const texts: { at: string; value: Localized }[] = [
  ...allOpenings.flatMap((o) => [
    { at: `${o.id}.description`, value: o.description },
    ...Object.entries(o.notes).flatMap(([path, note]) =>
      note.comment ? [{ at: `${o.id} ${path}`, value: note.comment }] : [],
    ),
  ]),
  ...endgames.map((e) => ({ at: `${e.id}.explanation`, value: e.explanation })),
  ...positions.map((p) => ({ at: `${p.id}.explanation`, value: p.explanation })),
];

for (const { at, value } of texts) {
  for (const lang of ['es', 'en'] as const) {
    const found = tokenize(value[lang], lang)
      .filter((s) => s.kind === 'move' || s.kind === 'square')
      .map((s) =>
        s.kind === 'move' ? `${s.written}→${s.san}${s.start ? '^' : ''}` : `[${s.square}]`,
      );
    if (found.length) console.log(`${at} (${lang}): ${found.join(' ')}`);
  }
}
