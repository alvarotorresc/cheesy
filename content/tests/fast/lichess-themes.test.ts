import { describe, expect, it } from 'vitest';
import {
  ADVANCED_LICHESS_THEMES,
  ADVANCED_NO_THEME,
  LICHESS_THEME_KEYS,
  LICHESS_THEMES,
} from '../../authoring/lessons/lichess-themes.ts';
import { lessons } from '../../authoring/lessons/index.ts';

const intermediate = lessons.filter((l) => l.level === 'intermediate').map((l) => l.id);
const advanced = lessons.filter((l) => l.level === 'advanced').map((l) => l.id);

// Lichess has no puzzle that teaches to save a draw: see LESSON_ORDER in puzzles-config.ts.
const WITHOUT_PRACTICE = ['draws-and-defence'];

describe('Lichess puzzle themes of the intermediate lessons', () => {
  it('maps only intermediate lessons that exist', () => {
    expect(Object.keys(LICHESS_THEMES).filter((id) => !intermediate.includes(id))).toEqual([]);
  });

  it('gives every intermediate lesson at least one theme, except those without practice', () => {
    expect(intermediate.length).toBeGreaterThan(0);
    expect(intermediate.filter((id) => !LICHESS_THEMES[id]?.length)).toEqual(WITHOUT_PRACTICE);
    // Listed on purpose, with no themes, and not by forgetting it.
    for (const id of WITHOUT_PRACTICE) expect(LICHESS_THEMES[id]).toEqual([]);
  });

  it('uses only themes of the closed list, without repeating one in a lesson', () => {
    const keys: readonly string[] = LICHESS_THEME_KEYS;
    const unknown = Object.values(LICHESS_THEMES)
      .flat()
      .filter((theme) => !keys.includes(theme));
    expect(unknown).toEqual([]);
    const repeated = Object.entries(LICHESS_THEMES).filter(
      ([, themes]) => new Set(themes).size !== themes.length,
    );
    expect(repeated).toEqual([]);
  });

  it('gives each theme to one lesson only', () => {
    const all = Object.values(LICHESS_THEMES).flat();
    expect(all.filter((theme, i) => all.indexOf(theme) !== i)).toEqual([]);
  });

  it('lists every theme of the closed list once, and uses all of them in one map or the other', () => {
    expect(new Set(LICHESS_THEME_KEYS).size).toBe(LICHESS_THEME_KEYS.length);
    const used = new Set(
      [LICHESS_THEMES, ADVANCED_LICHESS_THEMES].flatMap((map) => Object.values(map).flat()),
    );
    expect(LICHESS_THEME_KEYS.filter((key) => !used.has(key))).toEqual([]);
  });
});

describe('Lichess puzzle themes of the advanced lessons', () => {
  it('maps only advanced lessons that exist, and lists only those without a theme', () => {
    expect(Object.keys(ADVANCED_LICHESS_THEMES).filter((id) => !advanced.includes(id))).toEqual([]);
    expect(ADVANCED_NO_THEME.filter((id) => !advanced.includes(id))).toEqual([]);
  });

  it('gives every advanced lesson themes or a place in the list without them, not both', () => {
    expect(advanced.length).toBeGreaterThan(0);
    const themed = advanced.filter((id) => ADVANCED_LICHESS_THEMES[id]?.length);
    const listed = advanced.filter((id) => ADVANCED_NO_THEME.includes(id));
    expect(themed.filter((id) => listed.includes(id))).toEqual([]);
    expect(advanced.filter((id) => !themed.includes(id) && !listed.includes(id))).toEqual([]);
  });

  it('uses only themes of the closed list, without repeating one in a lesson', () => {
    const keys: readonly string[] = LICHESS_THEME_KEYS;
    for (const [lesson, themes] of Object.entries(ADVANCED_LICHESS_THEMES)) {
      expect(
        themes.filter((theme) => !keys.includes(theme)),
        lesson,
      ).toEqual([]);
      expect(new Set(themes).size, lesson).toBe(themes.length);
    }
  });
});
