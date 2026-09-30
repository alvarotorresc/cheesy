import { describe, expect, it } from 'vitest';
import { loadEndgames, loadGlossaryIds, loadOpenings, loadPositions } from '../../lib/content.ts';
import { playSan, positionFromFen } from '../../lib/chess.ts';
import { movesOf, stripNote, termsOf } from '../../lib/rich-text.ts';
import type { OpeningNode, RichText, Segment } from '../../types.ts';

// Every cut text of the content, with where it lives, for the four checks of the spec (part 2).
const texts: { at: string; text: RichText; fen?: string }[] = [];
const walk = (id: string, nodes: OpeningNode[], path: string[]) => {
  for (const n of nodes) {
    const here = [...path, n.san];
    if (n.comment) texts.push({ at: `${id} ${here.join(' ')}`, text: n.comment });
    walk(id, n.children, here);
  }
};
for (const tree of loadOpenings()) {
  texts.push({ at: `${tree.id}.description`, text: tree.description });
  walk(tree.id, tree.root, []);
}
for (const e of loadEndgames())
  texts.push({ at: `${e.id}.explanation`, text: e.explanation, fen: e.fen });
for (const p of loadPositions()) texts.push({ at: `${p.id}.explanation`, text: p.explanation });

const glossary = loadGlossaryIds();

/**
 * Something that looks like a move and was not read as one: the other language's letters, a square
 * off the board (`Cf9`, `Ni3`) or a castling the reader missed (`O–O` with a dash, or any `O-O` left
 * over). Wider than the reader on purpose, so a slip ends up here instead of in plain text.
 */
const SUSPICIOUS =
  /(?<![\p{L}\p{N}])(?:[A-Z][a-z]?[0-9]?x?[a-z][0-9]|[a-z]x[a-z][0-9]|[O0][-–—][O0](?:[-–—][O0])?)(?![\p{L}\p{N}])/u;

const textOf = (segments: Segment[]): string[] =>
  segments.flatMap((s) => (s.kind === 'text' ? [s.text] : []));

/** What looks like a move in the text segments, as found. */
const suspiciousIn = (segments: Segment[]): string[] =>
  textOf(segments).flatMap((t) => t.match(SUSPICIOUS)?.[0] ?? []);

describe('the check for moves left unread', () => {
  const text = (value: string): Segment[] => [{ kind: 'text', text: value }];

  it('flags square typos and castling written with the letter O', () => {
    for (const [written, found] of [
      ['juega Cf9 y gana', 'Cf9'],
      ['then Ni3 wins', 'Ni3'],
      ['exf9 takes', 'exf9'],
      ['then O-O and', 'O-O'],
      ['then O-O-O and', 'O-O-O'],
      ['castles 0-0 early', '0-0'],
      ['enroca O–O pronto', 'O–O'],
    ])
      expect(suspiciousIn(text(written)), written).toEqual([found]);
  });

  it('leaves plain words, lone squares and questions alone', () => {
    for (const written of ['the d-file', '¿está en d5?', 'a 1-0 win', 'Opposition', 'KO-OK'])
      expect(suspiciousIn(text(written)), written).toEqual([]);
  });
});

describe('cut texts of the content', () => {
  it('has texts to check', () => {
    expect(texts.length).toBeGreaterThan(300);
  });

  it('1. every term mark points to a glossary term, and no mark is left unread', () => {
    const errors = texts.flatMap(({ at, text }) =>
      (['es', 'en'] as const).flatMap((lang) => [
        ...termsOf(text[lang])
          .filter((id) => !glossary.has(id))
          .map((id) => `${at} (${lang}): unknown term "${id}"`),
        ...textOf(text[lang])
          .filter((t) => /\]\(/.test(t))
          .map((t) => `${at} (${lang}): malformed term mark in "${t}"`),
      ]),
    );
    expect(errors).toEqual([]);
  });

  it('2. no text segment holds something that looks like a move', () => {
    const errors = texts.flatMap(({ at, text }) =>
      (['es', 'en'] as const).flatMap((lang) =>
        textOf(text[lang])
          .filter((t) => SUSPICIOUS.test(t))
          .map((t) => `${at} (${lang}): "${t.match(SUSPICIOUS)?.[0]}" in "${t}"`),
      ),
    );
    expect(errors).toEqual([]);
  });

  it('3. the Spanish and English versions have the same moves and the same terms', () => {
    const errors = texts.flatMap(({ at, text }) => {
      const out: string[] = [];
      const es = movesOf(text.es).join(' ');
      const en = movesOf(text.en).join(' ');
      if (es !== en) out.push(`${at}: moves es [${es}] vs en [${en}]`);
      const tes = termsOf(text.es).join(' ');
      const ten = termsOf(text.en).join(' ');
      if (tes !== ten) out.push(`${at}: terms es [${tes}] vs en [${ten}]`);
      return out;
    });
    expect(errors).toEqual([]);
  });

  it('4. in the endgames, every move numbered 1. or 1... is legal in the starting position', () => {
    const errors = texts
      .filter((t) => t.fen !== undefined)
      .flatMap(({ at, text, fen }) =>
        (['es', 'en'] as const).flatMap((lang) =>
          text[lang].flatMap((s) => {
            if (s.kind !== 'move' || (s.number !== '1.' && s.number !== '1...')) return [];
            const start = positionFromFen(fen!);
            const side = s.number === '1.' ? 'white' : 'black';
            if (start.turn !== side)
              return [`${at} (${lang}): ${s.written} but ${start.turn} is to move`];
            return playSan(start, stripNote(s.san))
              ? []
              : [`${at} (${lang}): ${s.written} is illegal`];
          }),
        ),
      );
    expect(errors).toEqual([]);
  });

  it('5. names, titles and categories stay plain text, without term marks', () => {
    const MARK = /\[[^\]]+\]\([^)]*\)/;
    const names: { at: string; value: { es: string; en: string } }[] = [];
    const walkNames = (id: string, nodes: OpeningNode[]) => {
      for (const n of nodes) {
        if (n.name) names.push({ at: `${id} ${n.san}.name`, value: n.name });
        walkNames(id, n.children);
      }
    };
    for (const tree of loadOpenings()) {
      names.push({ at: `${tree.id}.name`, value: tree.name });
      walkNames(tree.id, tree.root);
    }
    for (const e of loadEndgames()) {
      names.push(
        { at: `${e.id}.name`, value: e.name },
        { at: `${e.id}.category`, value: e.category },
      );
    }
    for (const p of loadPositions()) names.push({ at: `${p.id}.title`, value: p.title });
    const errors = names.flatMap(({ at, value }) =>
      (['es', 'en'] as const)
        .filter((lang) => MARK.test(value[lang]))
        .map((lang) => `${at} (${lang})`),
    );
    expect(errors).toEqual([]);
  });
});
