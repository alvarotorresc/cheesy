// Hand-written structural validators mirroring types.ts. Each returns a list of errors (empty = valid).
import { KEBAB } from './chess.ts';

type Errors = string[];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function checkKeys(
  o: Record<string, unknown>,
  required: string[],
  optional: string[],
  at: string,
  errs: Errors,
) {
  for (const k of required) if (!(k in o)) errs.push(`${at}: missing "${k}"`);
  for (const k of Object.keys(o))
    if (!required.includes(k) && !optional.includes(k)) errs.push(`${at}: unexpected key "${k}"`);
}

function checkLocalized(v: unknown, at: string, errs: Errors) {
  if (!isObj(v)) return void errs.push(`${at}: Localized must be an object`);
  checkKeys(v, ['es', 'en'], [], at, errs);
  if (!nonEmpty(v.es)) errs.push(`${at}.es: must be a non-empty string`);
  if (!nonEmpty(v.en)) errs.push(`${at}.en: must be a non-empty string`);
}

function checkId(v: unknown, at: string, errs: Errors) {
  if (typeof v !== 'string' || !KEBAB.test(v))
    errs.push(`${at}: id must be kebab-case, got ${JSON.stringify(v)}`);
}

const SQUARE = /^[a-h][1-8]$/;

function checkSegment(s: unknown, at: string, errs: Errors) {
  if (!isObj(s)) return void errs.push(`${at}: segment must be an object`);
  switch (s.kind) {
    case 'text':
      checkKeys(s, ['kind', 'text'], [], at, errs);
      if (typeof s.text !== 'string' || s.text === '')
        errs.push(`${at}.text: must be a non-empty string`);
      return;
    case 'move':
      checkKeys(s, ['kind', 'san', 'start', 'written'], ['number'], at, errs);
      if (!nonEmpty(s.san)) errs.push(`${at}.san: must be a non-empty string`);
      if (typeof s.start !== 'boolean') errs.push(`${at}.start: must be a boolean`);
      if (!nonEmpty(s.written)) errs.push(`${at}.written: must be a non-empty string`);
      if (s.number !== undefined && !nonEmpty(s.number))
        errs.push(`${at}.number: must be a non-empty string`);
      return;
    case 'square':
      checkKeys(s, ['kind', 'square'], [], at, errs);
      if (typeof s.square !== 'string' || !SQUARE.test(s.square))
        errs.push(`${at}.square: bad square`);
      return;
    case 'term':
      checkKeys(s, ['kind', 'id', 'text'], [], at, errs);
      checkId(s.id, `${at}.id`, errs);
      if (!nonEmpty(s.text)) errs.push(`${at}.text: must be a non-empty string`);
      return;
    default:
      errs.push(`${at}.kind: unknown segment kind ${JSON.stringify(s.kind)}`);
  }
}

export function checkRichText(v: unknown, at: string, errs: Errors) {
  if (!isObj(v)) return void errs.push(`${at}: RichText must be an object`);
  checkKeys(v, ['es', 'en'], [], at, errs);
  for (const lang of ['es', 'en'] as const) {
    const segments = v[lang];
    if (!Array.isArray(segments) || segments.length === 0)
      errs.push(`${at}.${lang}: must be a non-empty array of segments`);
    else segments.forEach((s, i) => checkSegment(s, `${at}.${lang}[${i}]`, errs));
  }
}

const SIDES = ['white', 'black'];

function checkNode(n: unknown, at: string, errs: Errors) {
  if (!isObj(n)) return void errs.push(`${at}: node must be an object`);
  checkKeys(n, ['san', 'children'], ['name', 'comment', 'main'], at, errs);
  if (!nonEmpty(n.san)) errs.push(`${at}.san: must be a non-empty string`);
  if (n.name !== undefined) checkLocalized(n.name, `${at}.name`, errs);
  if (n.comment !== undefined) checkRichText(n.comment, `${at}.comment`, errs);
  if (n.main !== undefined && n.main !== true) errs.push(`${at}.main: must be true when present`);
  if (!Array.isArray(n.children)) return void errs.push(`${at}.children: must be an array`);
  n.children.forEach((c, i) =>
    checkNode(c, `${at} > ${String((c as { san?: unknown })?.san ?? i)}`, errs),
  );
}

export function validateOpeningTree(t: unknown): Errors {
  const errs: Errors = [];
  if (!isObj(t)) return ['tree must be an object'];
  checkKeys(t, ['id', 'name', 'eco', 'side', 'description', 'root'], [], 'tree', errs);
  checkId(t.id, 'id', errs);
  checkLocalized(t.name, 'name', errs);
  if (typeof t.eco !== 'string' || !/^[A-E]\d\d(-[A-E]\d\d)?$/.test(t.eco))
    errs.push(`eco: bad value ${JSON.stringify(t.eco)}`);
  if (!SIDES.includes(t.side as string)) errs.push(`side: must be white|black`);
  checkRichText(t.description, 'description', errs);
  if (!Array.isArray(t.root) || t.root.length === 0) errs.push('root: must be a non-empty array');
  else
    t.root.forEach((n, i) =>
      checkNode(n, `root > ${String((n as { san?: unknown })?.san ?? i)}`, errs),
    );
  return errs;
}

const isSquareName = (v: unknown): boolean => typeof v === 'string' && /^[a-h][1-8]$/.test(v);
const isHttpsUrl = (v: unknown): boolean =>
  typeof v === 'string' && URL.parse(v)?.protocol === 'https:';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const GLOSSARY_GROUPS = ['rules', 'tactics', 'mates', 'strategy', 'pawns', 'endgames'];

export function validateGlossaryTerm(t: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(t)) return [`${at}: must be an object`];
  checkKeys(
    t,
    ['id', 'name', 'definition', 'example', 'group', 'level', 'sources'],
    ['lesson'],
    at,
    errs,
  );
  checkId(t.id, `${at}.id`, errs);
  checkLocalized(t.name, `${at}.name`, errs);
  checkRichText(t.definition, `${at}.definition`, errs);
  if (!GLOSSARY_GROUPS.includes(t.group as string))
    errs.push(`${at}.group: must be ${GLOSSARY_GROUPS.join('|')}`);
  if (!LEVELS.includes(t.level as string))
    errs.push(`${at}.level: must be beginner|intermediate|advanced`);
  if (!Array.isArray(t.sources) || t.sources.length === 0 || !t.sources.every(isHttpsUrl))
    errs.push(`${at}.sources: must be a non-empty array of https URLs`);
  if (t.lesson !== undefined) checkId(t.lesson, `${at}.lesson`, errs);
  const ex = t.example;
  if (!isObj(ex)) errs.push(`${at}.example: must be an object`);
  else {
    checkKeys(ex, ['fen', 'orientation', 'highlights', 'arrows'], [], `${at}.example`, errs);
    if (!nonEmpty(ex.fen)) errs.push(`${at}.example.fen: must be a non-empty string`);
    if (!SIDES.includes(ex.orientation as string))
      errs.push(`${at}.example.orientation: must be white|black`);
    if (!Array.isArray(ex.highlights)) errs.push(`${at}.example.highlights: must be an array`);
    else
      ex.highlights.forEach((sq, i) => {
        if (!isSquareName(sq))
          errs.push(`${at}.example.highlights[${i}]: bad square ${JSON.stringify(sq)}`);
      });
    if (!Array.isArray(ex.arrows)) errs.push(`${at}.example.arrows: must be an array`);
    else
      ex.arrows.forEach((a, i) => {
        if (!isObj(a)) return void errs.push(`${at}.example.arrows[${i}]: must be an object`);
        checkKeys(a, ['from', 'to', 'move'], [], `${at}.example.arrows[${i}]`, errs);
        for (const end of ['from', 'to'] as const)
          if (!isSquareName(a[end]))
            errs.push(`${at}.example.arrows[${i}].${end}: bad square ${JSON.stringify(a[end])}`);
        if (typeof a.move !== 'boolean')
          errs.push(`${at}.example.arrows[${i}].move: must be a boolean`);
      });
  }
  return errs;
}

export function validateEndgame(e: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(e)) return [`${at}: must be an object`];
  checkKeys(
    e,
    ['id', 'name', 'category', 'fen', 'goal', 'playerSide', 'explanation', 'about'],
    [],
    at,
    errs,
  );
  checkId(e.id, `${at}.id`, errs);
  checkLocalized(e.name, `${at}.name`, errs);
  checkLocalized(e.category, `${at}.category`, errs);
  if (!nonEmpty(e.fen)) errs.push(`${at}.fen: must be a non-empty string`);
  if (e.goal !== 'win' && e.goal !== 'draw') errs.push(`${at}.goal: must be win|draw`);
  if (!SIDES.includes(e.playerSide as string)) errs.push(`${at}.playerSide: must be white|black`);
  checkRichText(e.explanation, `${at}.explanation`, errs);
  checkRichText(e.about, `${at}.about`, errs);
  return errs;
}

export function validateCurated(p: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(p)) return [`${at}: must be an object`];
  checkKeys(
    p,
    ['id', 'title', 'fen', 'playerSide', 'solution', 'explanation', 'about', 'tags'],
    ['source'],
    at,
    errs,
  );
  checkId(p.id, `${at}.id`, errs);
  checkLocalized(p.title, `${at}.title`, errs);
  if (p.source !== undefined && !nonEmpty(p.source))
    errs.push(`${at}.source: must be a non-empty string when present`);
  if (!nonEmpty(p.fen)) errs.push(`${at}.fen: must be a non-empty string`);
  if (!SIDES.includes(p.playerSide as string)) errs.push(`${at}.playerSide: must be white|black`);
  if (!Array.isArray(p.solution) || p.solution.length === 0 || !p.solution.every(nonEmpty))
    errs.push(`${at}.solution: must be a non-empty array of SAN strings`);
  checkRichText(p.explanation, `${at}.explanation`, errs);
  checkRichText(p.about, `${at}.about`, errs);
  if (!Array.isArray(p.tags) || p.tags.length === 0)
    errs.push(`${at}.tags: must be a non-empty array`);
  else
    for (const t of p.tags)
      if (typeof t !== 'string' || !KEBAB.test(t))
        errs.push(`${at}.tags: "${String(t)}" is not kebab-case`);
  return errs;
}

const RULES = ['escape-check', 'capture-undefended', 'castle', 'en-passant', 'promote'];
const REACH_ROLES = ['king', 'queen', 'rook', 'bishop', 'knight'];
const ROLES = [...REACH_ROLES, 'pawn'];

const squaresOk = (v: unknown): boolean => Array.isArray(v) && v.every(isSquareName);

function checkBoard(b: unknown, at: string, errs: Errors, extra: string[] = []) {
  if (!isObj(b)) return void errs.push(`${at}: board must be an object`);
  checkKeys(b, ['fen', 'orientation'], ['highlights', 'arrows', ...extra], at, errs);
  if (!nonEmpty(b.fen)) errs.push(`${at}.fen: must be a non-empty string`);
  if (!SIDES.includes(b.orientation as string)) errs.push(`${at}.orientation: must be white|black`);
  if (b.highlights !== undefined && !squaresOk(b.highlights))
    errs.push(`${at}.highlights: bad squares`);
  if (
    b.arrows !== undefined &&
    !(
      Array.isArray(b.arrows) &&
      b.arrows.every((a) => isObj(a) && isSquareName(a.from) && isSquareName(a.to))
    )
  )
    errs.push(`${at}.arrows: bad arrows`);
  if (b.moves !== undefined && !(Array.isArray(b.moves) && b.moves.every(nonEmpty)))
    errs.push(`${at}.moves: bad SAN list`);
}

function checkChoice(s: Record<string, unknown>, at: string, errs: Errors) {
  checkKeys(s, ['kind', 'text', 'answer', 'whyWrong', 'explanation'], ['board'], at, errs);
  if (s.board !== undefined) checkBoard(s.board, `${at}.board`, errs);
  const a = s.answer;
  let count = 0;
  let correct = -1;
  if (isObj(a) && a.by === 'status') count = 4;
  else if (
    isObj(a) &&
    (a.by === 'engine' || a.by === 'fact') &&
    Array.isArray(a.options) &&
    a.options.length >= 2
  ) {
    count = a.options.length;
    if (!Number.isInteger(a.correct) || (a.correct as number) < 0 || (a.correct as number) >= count)
      errs.push(`${at}.answer.correct: index of an option`);
    else correct = a.correct as number;
    if (a.by === 'engine' && !a.options.every(nonEmpty))
      errs.push(`${at}.answer.options: SAN strings`);
    if (a.by === 'fact')
      a.options.forEach((o, i) => checkLocalized(o, `${at}.answer.options[${i}]`, errs));
  } else errs.push(`${at}.answer: status, engine or fact with at least two options`);
  if (s.board === undefined && isObj(a) && a.by !== 'fact')
    errs.push(`${at}: status and engine questions need a board`);
  // One message per option; the correct one may be null (a status question's is only known
  // with the position, so there at most one null and the legality check says which).
  if (!Array.isArray(s.whyWrong) || s.whyWrong.length !== count)
    errs.push(`${at}.whyWrong: one per option`);
  else {
    const status = isObj(a) && a.by === 'status';
    let nulls = 0;
    s.whyWrong.forEach((t, i) => {
      if (t === null) {
        nulls++;
        if (!status && i !== correct) errs.push(`${at}.whyWrong[${i}]: required on a wrong option`);
      } else checkRichText(t, `${at}.whyWrong[${i}]`, errs);
    });
    if (status && nulls > 1) errs.push(`${at}.whyWrong: at most one null`);
  }
  checkRichText(s.explanation, `${at}.explanation`, errs);
}

function checkStep(s: unknown, at: string, errs: Errors) {
  if (!isObj(s)) return void errs.push(`${at}: step must be an object`);
  switch (s.kind) {
    case 'explain':
      checkKeys(s, ['kind', 'text'], ['board'], at, errs);
      if (s.board !== undefined) checkBoard(s.board, `${at}.board`, errs, ['moves']);
      break;
    case 'reach':
      checkKeys(
        s,
        ['kind', 'text', 'piece', 'targets', 'minMoves'],
        ['blockers', 'enemies', 'hint'],
        at,
        errs,
      );
      if (
        !isObj(s.piece) ||
        !REACH_ROLES.includes(s.piece.role as string) ||
        !SIDES.includes(s.piece.color as string) ||
        !isSquareName(s.piece.square)
      )
        errs.push(`${at}.piece: bad piece`);
      if (!squaresOk(s.targets) || (s.targets as unknown[]).length === 0)
        errs.push(`${at}.targets: at least one square`);
      else if (new Set(s.targets as unknown[]).size !== (s.targets as unknown[]).length)
        errs.push(`${at}.targets: duplicate squares`);
      if (s.blockers !== undefined && !squaresOk(s.blockers))
        errs.push(`${at}.blockers: bad squares`);
      if (
        s.enemies !== undefined &&
        !(
          Array.isArray(s.enemies) &&
          s.enemies.every(
            (e) => isObj(e) && ROLES.includes(e.role as string) && isSquareName(e.square),
          )
        )
      )
        errs.push(`${at}.enemies: bad enemies`);
      if (!Number.isInteger(s.minMoves) || (s.minMoves as number) < 1)
        errs.push(`${at}.minMoves: positive integer`);
      break;
    case 'find-move': {
      checkKeys(s, ['kind', 'text', 'board', 'check', 'explanation'], ['wrong', 'hint'], at, errs);
      checkBoard(s.board, `${at}.board`, errs);
      const c = s.check;
      const engineOk =
        isObj(c) &&
        c.by === 'engine' &&
        Array.isArray(c.solution) &&
        c.solution.length > 0 &&
        c.solution.every(nonEmpty);
      const ruleOk = isObj(c) && c.by === 'rule' && RULES.includes(c.rule as string);
      if (!engineOk && !ruleOk) errs.push(`${at}.check: engine solution or known rule`);
      // The solution ends on the player's move: the player, then (reply, player) pairs.
      else if (engineOk && (c.solution as unknown[]).length % 2 === 0)
        errs.push(`${at}.check.solution: odd length, ending on the player's move`);
      // `check` has no closed keys; the one optional key is spelled out here.
      if (isObj(c) && 'onlyMove' in c && (!engineOk || c.onlyMove !== true))
        errs.push(`${at}.check.onlyMove: only true, and only on an engine solution`);
      if (s.wrong !== undefined) {
        if (!isObj(s.wrong)) errs.push(`${at}.wrong: must be an object`);
        else
          for (const [san, text] of Object.entries(s.wrong))
            checkRichText(text, `${at}.wrong.${san}`, errs);
      }
      checkRichText(s.explanation, `${at}.explanation`, errs);
      break;
    }
    case 'play-out':
      checkKeys(s, ['kind', 'text', 'fen', 'goal', 'playerSide'], ['hint'], at, errs);
      if (!nonEmpty(s.fen)) errs.push(`${at}.fen: must be a non-empty string`);
      if (s.goal !== 'win' && s.goal !== 'draw') errs.push(`${at}.goal: must be win|draw`);
      if (!SIDES.includes(s.playerSide as string))
        errs.push(`${at}.playerSide: must be white|black`);
      break;
    case 'choice':
      checkChoice(s, at, errs);
      break;
    case 'tap-square':
      checkKeys(s, ['kind', 'text', 'count'], ['squares'], at, errs);
      if (!Number.isInteger(s.count) || (s.count as number) < 1)
        errs.push(`${at}.count: positive integer`);
      if (
        s.squares !== undefined &&
        (!squaresOk(s.squares) || (s.squares as unknown[]).length < (s.count as number))
      )
        errs.push(`${at}.squares: at least count valid squares`);
      break;
    default:
      return void errs.push(`${at}.kind: unknown step kind ${JSON.stringify(s.kind)}`);
  }
  checkRichText(s.text, `${at}.text`, errs);
  if (s.hint !== undefined) checkRichText(s.hint, `${at}.hint`, errs);
}

export function validateLesson(l: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(l)) return [`${at}: must be an object`];
  checkKeys(
    l,
    ['id', 'level', 'order', 'title', 'summary', 'terms', 'sources', 'steps'],
    ['next'],
    at,
    errs,
  );
  checkId(l.id, `${at}.id`, errs);
  if (!LEVELS.includes(l.level as string)) errs.push(`${at}.level: beginner|intermediate|advanced`);
  if (!Number.isInteger(l.order) || (l.order as number) < 1)
    errs.push(`${at}.order: positive integer`);
  checkLocalized(l.title, `${at}.title`, errs);
  checkLocalized(l.summary, `${at}.summary`, errs);
  if (!Array.isArray(l.terms) || !l.terms.every((t) => typeof t === 'string' && KEBAB.test(t)))
    errs.push(`${at}.terms: kebab-case ids`);
  if (!Array.isArray(l.sources) || l.sources.length === 0 || !l.sources.every(isHttpsUrl))
    errs.push(`${at}.sources: at least one https URL`);
  if (!Array.isArray(l.steps) || l.steps.length < 5 || l.steps.length > 10)
    errs.push(`${at}.steps: 5 to 10 steps`);
  else {
    l.steps.forEach((s, i) => checkStep(s, `${at}.steps[${i}]`, errs));
    if (!l.steps.some((s) => isObj(s) && s.kind !== 'explain'))
      errs.push(`${at}.steps: at least one exercise`);
  }
  if (l.next !== undefined) {
    const n = l.next;
    const ok =
      isObj(n) &&
      ((n.kind === 'endgames' && nonEmpty(n.category)) ||
        (n.kind === 'positions' && nonEmpty(n.tag)) ||
        n.kind === 'openings');
    if (!ok) errs.push(`${at}.next: endgames with category, positions with tag, or openings`);
  }
  return errs;
}

const PUZZLE_ID = /^[A-Za-z0-9]{5}$/;
const isTheme = (v: unknown): v is string => typeof v === 'string' && /^[a-z][A-Za-z0-9]*$/.test(v);

/** A lesson file of Lichess puzzles (`pnpm content:puzzles`). */
export function validatePuzzleFile(f: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(f)) return [`${at}: must be an object`];
  checkKeys(f, ['lesson', 'themes', 'puzzles'], [], at, errs);
  checkId(f.lesson, `${at}.lesson`, errs);
  if (!isObj(f.themes) || Object.keys(f.themes).length === 0)
    errs.push(`${at}.themes: must be a non-empty object`);
  else
    for (const [theme, term] of Object.entries(f.themes)) {
      if (!isTheme(theme)) errs.push(`${at}.themes: bad theme ${JSON.stringify(theme)}`);
      if (term !== null) checkId(term, `${at}.themes.${theme}`, errs);
    }
  if (!Array.isArray(f.puzzles) || f.puzzles.length === 0)
    return [...errs, `${at}.puzzles: must be a non-empty array`];
  f.puzzles.forEach((p, i) => {
    const where = `${at}.puzzles[${i}]`;
    if (!isObj(p)) return void errs.push(`${where}: must be an object`);
    checkKeys(p, ['id', 'fen', 'moves', 'rating', 'themes'], [], where, errs);
    if (typeof p.id !== 'string' || !PUZZLE_ID.test(p.id))
      errs.push(`${where}.id: five letters or digits, got ${JSON.stringify(p.id)}`);
    if (!nonEmpty(p.fen)) errs.push(`${where}.fen: must be a non-empty string`);
    if (!Array.isArray(p.moves) || p.moves.length === 0 || !p.moves.every(nonEmpty))
      errs.push(`${where}.moves: must be a non-empty array of SAN strings`);
    if (!Number.isInteger(p.rating)) errs.push(`${where}.rating: must be an integer`);
    if (!Array.isArray(p.themes) || p.themes.length === 0 || !p.themes.every(isTheme))
      errs.push(`${where}.themes: must be a non-empty array of themes`);
  });
  return errs;
}

/** The catalogue of the puzzle files, with the database they come from. */
export function validatePuzzleCatalog(c: unknown): Errors {
  const errs: Errors = [];
  if (!isObj(c)) return ['catalog: must be an object'];
  checkKeys(c, ['source', 'lessons'], [], 'catalog', errs);
  const s = c.source;
  if (!isObj(s)) errs.push('catalog.source: must be an object');
  else {
    checkKeys(
      s,
      ['url', 'lastModified', 'sha256', 'bytes', 'rows', 'scriptVersion'],
      [],
      'catalog.source',
      errs,
    );
    if (!isHttpsUrl(s.url)) errs.push('catalog.source.url: https URL');
    if (typeof s.lastModified !== 'string' || Number.isNaN(Date.parse(s.lastModified)))
      errs.push('catalog.source.lastModified: a date');
    if (typeof s.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(s.sha256))
      errs.push('catalog.source.sha256: 64 hex digits');
    for (const k of ['bytes', 'rows', 'scriptVersion'] as const)
      if (!Number.isInteger(s[k]) || (s[k] as number) < 1)
        errs.push(`catalog.source.${k}: positive integer`);
  }
  if (!Array.isArray(c.lessons) || c.lessons.length === 0)
    return [...errs, 'catalog.lessons: must be a non-empty array'];
  c.lessons.forEach((l, i) => {
    const where = `catalog.lessons[${i}]`;
    if (!isObj(l)) return void errs.push(`${where}: must be an object`);
    checkKeys(l, ['lesson', 'count', 'themes'], [], where, errs);
    checkId(l.lesson, `${where}.lesson`, errs);
    if (!Number.isInteger(l.count)) errs.push(`${where}.count: must be an integer`);
    if (!Array.isArray(l.themes) || l.themes.length === 0 || !l.themes.every(isTheme))
      errs.push(`${where}.themes: must be a non-empty array of themes`);
  });
  return errs;
}
