import { InjectionToken } from '@angular/core';
import type { BookNode } from '../../core/content';

/** Source of randomness of the rival, in [0, 1). Injectable so tests can fix it. */
export const OPENING_RANDOM = new InjectionToken<() => number>('OPENING_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

/** Weight of the main continuation; every other continuation weighs 1. */
export const MAIN_WEIGHT = 3;

/**
 * The continuation the rival plays from the ones our lines cover. The main one (first) is three
 * times as likely as each alternative, so the variations show up without taking over. With
 * `mainOnly` it is always the main one.
 */
export const pickBookMove = (
  candidates: readonly BookNode[],
  random: () => number,
  mainOnly: boolean,
): BookNode | undefined => {
  if (candidates.length === 0) return undefined;
  if (mainOnly || candidates.length === 1) return candidates[0];
  const total = MAIN_WEIGHT + candidates.length - 1;
  const roll = Math.min(Math.max(random(), 0), 1 - Number.EPSILON) * total;
  if (roll < MAIN_WEIGHT) return candidates[0];
  return candidates[Math.min(candidates.length - 1, 1 + Math.floor(roll - MAIN_WEIGHT))];
};
