import { explain, format, parse, type Base } from './bases';

export const KINDS = [
  { id: 'd2b', from: 10, to: 2, label: 'Decimal → binary' },
  { id: 'b2d', from: 2, to: 10, label: 'Binary → decimal' },
  { id: 'd2h', from: 10, to: 16, label: 'Decimal → hex' },
  { id: 'h2d', from: 16, to: 10, label: 'Hex → decimal' },
  { id: 'b2h', from: 2, to: 16, label: 'Binary → hex' },
  { id: 'h2b', from: 16, to: 2, label: 'Hex → binary' },
] as const;
export type KindId = (typeof KINDS)[number]['id'];
export const SIZES = [4, 8, 16] as const;
export type Size = (typeof SIZES)[number];

export interface Exercise {
  kind: KindId;
  size: Size;
  value: number;
  prompt: string;
  from: Base;
  to: Base;
}

export function rng(seed: number) {
  let s = seed % 2147483647 || 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function makeExercise(kind: KindId, size: Size, r: () => number): Exercise {
  const k = KINDS.find((x) => x.id === kind)!;
  const max = 2 ** size - 1;
  const value = 1 + Math.floor(r() * max);
  const digits = k.from === 2 ? size : k.from === 16 ? size / 4 : 0;
  return { kind, size, value, from: k.from, to: k.to, prompt: format(value, k.from, digits) };
}

export function check(ex: Exercise, raw: string): { ok: boolean; error: string | null; expected: string } {
  const expected = format(ex.value, ex.to);
  const p = parse(raw, ex.to);
  if (p.error) return { ok: false, error: p.error, expected };
  return { ok: p.value === ex.value, error: null, expected };
}

/** Three escalating hints; the last reveals the method fully. */
export function hints(ex: Exercise): string[] {
  const steps = explain(ex.value, ex.from, ex.to);
  const first =
    ex.from === 10 ? `Divide by ${ex.to} repeatedly and keep the remainders.` : ex.to === 10 ? `Write the place values under each digit (powers of ${ex.from}).` : 'Work in groups of four binary digits — each group is one hex digit.';
  return [first, steps[0].text, steps.map((s) => s.text).join(' → ')];
}

export interface Attempt {
  kind: KindId;
  size: Size;
  correct: boolean;
  hintsUsed: number;
  at: number;
}

/** Mastered = at least 8 of the last 10 attempts correct with no more than one hint each. */
export function mastery(attempts: Attempt[], kind: KindId, size: Size) {
  const list = attempts.filter((a) => a.kind === kind && a.size === size).slice(-10);
  const good = list.filter((a) => a.correct && a.hintsUsed <= 1).length;
  return { attempts: list.length, good, mastered: list.length >= 10 && good >= 8, pct: list.length ? good / list.length : null };
}

export function streak(attempts: Attempt[]): number {
  let n = 0;
  for (let i = attempts.length - 1; i >= 0 && attempts[i].correct; i--) n++;
  return n;
}
