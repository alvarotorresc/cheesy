// Lists, for every text of the content, the glossary words it uses without a mark, so the marking
// can be checked by eye. Run: node content/authoring/term-audit.ts [id]
import { allOpenings } from './openings.ts';
import { endgames } from './endgames.ts';
import { glossary } from './glossary.ts';
import { positions } from './positions.ts';
import { tokenize } from '../lib/rich-text.ts';
import type { Localized } from '../types.ts';

/** Word stems of each term, by language, to find likely unmarked uses. Lower case, no accents. */
const STEMS: Record<string, { es: string[]; en: string[] }> = Object.fromEntries(
  glossary.map((t) => [
    t.id,
    {
      es: [t.name.es.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').slice(0, 6)],
      en: [t.name.en.toLowerCase().slice(0, 6)],
    },
  ]),
);

const only = process.argv[2];
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
    const segments = tokenize(value[lang], lang);
    const marked = new Set(segments.flatMap((s) => (s.kind === 'term' ? [s.id] : [])));
    const plain = segments
      .flatMap((s) => (s.kind === 'text' ? [s.text] : []))
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    const hits = Object.entries(STEMS)
      .filter(([id]) => (!only || id === only) && !marked.has(id))
      .filter(([, stems]) => stems[lang].some((stem) => plain.includes(stem)))
      .map(([id]) => id);
    if (hits.length) console.log(`${at} (${lang}): ${hits.join(', ')}`);
  }
}
