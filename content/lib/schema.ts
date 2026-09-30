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

export function validateGlossaryTerm(t: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(t)) return [`${at}: must be an object`];
  checkKeys(t, ['id', 'name', 'definition', 'example', 'level', 'sources'], ['lesson'], at, errs);
  checkId(t.id, `${at}.id`, errs);
  checkLocalized(t.name, `${at}.name`, errs);
  checkRichText(t.definition, `${at}.definition`, errs);
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
    ['id', 'name', 'category', 'fen', 'goal', 'playerSide', 'explanation'],
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
  return errs;
}

export function validateCurated(p: unknown, at: string): Errors {
  const errs: Errors = [];
  if (!isObj(p)) return [`${at}: must be an object`];
  checkKeys(
    p,
    ['id', 'title', 'fen', 'playerSide', 'solution', 'explanation', 'tags'],
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
  if (!Array.isArray(p.tags) || p.tags.length === 0)
    errs.push(`${at}.tags: must be a non-empty array`);
  else
    for (const t of p.tags)
      if (typeof t !== 'string' || !KEBAB.test(t))
        errs.push(`${at}.tags: "${String(t)}" is not kebab-case`);
  return errs;
}
