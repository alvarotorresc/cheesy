// Tablebase check of a lesson play-out: the promised goal is the result for the side to move.
import { probe } from './tablebase.ts';

export async function checkPlayOut(
  fen: string,
  goal: 'win' | 'draw',
  { offline = false } = {},
): Promise<{ category: string; problems: string[] }> {
  const { category } = await probe(fen, { offline });
  const problems =
    category === goal
      ? []
      : [`goal is ${goal} but the tablebase gives ${category} for the side to move`];
  return { category, problems };
}
