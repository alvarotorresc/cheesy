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

const SIDES = ['white', 'black'];

function checkNode(n: unknown, at: string, errs: Errors) {
  if (!isObj(n)) return void errs.push(`${at}: node must be an object`);
  checkKeys(n, ['san', 'children'], ['name', 'comment', 'main'], at, errs);
  if (!nonEmpty(n.san)) errs.push(`${at}.san: must be a non-empty string`);
  if (n.name !== undefined) checkLocalized(n.name, `${at}.name`, errs);
  if (n.comment !== undefined) checkLocalized(n.comment, `${at}.comment`, errs);
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
  checkLocalized(t.description, 'description', errs);
  if (!Array.isArray(t.root) || t.root.length === 0) errs.push('root: must be a non-empty array');
  else
    t.root.forEach((n, i) =>
      checkNode(n, `root > ${String((n as { san?: unknown })?.san ?? i)}`, errs),
    );
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
  checkLocalized(e.explanation, `${at}.explanation`, errs);
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
  checkLocalized(p.explanation, `${at}.explanation`, errs);
  if (!Array.isArray(p.tags) || p.tags.length === 0)
    errs.push(`${at}.tags: must be a non-empty array`);
  else
    for (const t of p.tags)
      if (typeof t !== 'string' || !KEBAB.test(t))
        errs.push(`${at}.tags: "${String(t)}" is not kebab-case`);
  return errs;
}
