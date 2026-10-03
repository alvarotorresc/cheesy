import { describe, expect, it } from 'vitest';
import { LICHESS_THEME_KEYS, LICHESS_THEMES } from '../../authoring/lessons/lichess-themes.ts';
import { lessons } from '../../authoring/lessons/index.ts';

const intermediate = lessons.filter((l) => l.level === 'intermediate').map((l) => l.id);

describe('Lichess puzzle themes of the intermediate lessons', () => {
  it('maps only intermediate lessons that exist', () => {
    expect(Object.keys(LICHESS_THEMES).filter((id) => !intermediate.includes(id))).toEqual([]);
  });

  it('gives every intermediate lesson at least one theme', () => {
    expect(intermediate.length).toBeGreaterThan(0);
    expect(intermediate.filter((id) => !LICHESS_THEMES[id]?.length)).toEqual([]);
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

  it('lists every theme of the closed list once, and uses all of them', () => {
    expect(new Set(LICHESS_THEME_KEYS).size).toBe(LICHESS_THEME_KEYS.length);
    const used = new Set(Object.values(LICHESS_THEMES).flat());
    expect(LICHESS_THEME_KEYS.filter((key) => !used.has(key))).toEqual([]);
  });
});
