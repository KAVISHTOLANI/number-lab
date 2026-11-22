import { describe, expect, it } from 'vitest';
import { divisionSteps, explain, format, groupBinary, nibbleSteps, parse, placeValueSteps } from './bases';
import { check, hints, makeExercise, mastery, rng, streak, type Attempt } from './exercises';

describe('parsing and formatting', () => {
  it('parses each base with prefixes and separators', () => {
    expect(parse('0b1010_1010', 2).value).toBe(170);
    expect(parse('0xFF', 16).value).toBe(255);
    expect(parse('ff', 16).value).toBe(255);
    expect(parse('1 0 1', 2).value).toBe(5);
    expect(parse('42', 10).value).toBe(42);
  });
  it('gives helpful errors', () => {
    expect(parse('102', 2).error).toBe('“2” isn’t a binary digit. Use 0 and 1.');
    expect(parse('G1', 16).error).toMatch(/A–F/);
    expect(parse('-3', 10).error).toMatch(/0 and above/);
    expect(parse('', 10).error).toBeTruthy();
    expect(parse('4294967296', 10).error).toMatch(/32 bits/);
  });
  it('formats and groups', () => {
    expect(format(10, 2, 8)).toBe('00001010');
    expect(format(255, 16)).toBe('FF');
    expect(groupBinary('101011')).toBe('0010 1011');
  });
});

describe('worked steps', () => {
  it('explains each kind of conversion', () => {
    expect(divisionSteps(13, 2).at(-1)!.text).toBe('Read the remainders from bottom to top: 1101');
    expect(divisionSteps(255, 16)[0].text).toBe('255 ÷ 16 = 15 remainder 15 (F)');
    expect(placeValueSteps('1011', 2).at(-1)!.text).toBe('= 8 + 2 + 1 = 11');
    expect(placeValueSteps('2A', 16).at(-1)!.text).toBe('= 32 + 10 = 42');
    expect(nibbleSteps(0x3c, 16)[1].text).toBe('3 = 0011 · C = 1100');
    expect(explain(5, 2, 2)[0].text).toMatch(/Same base/);
  });
});

describe('exercises and progress', () => {
  it('makes reproducible exercises padded to the size', () => {
    const e = makeExercise('b2d', 8, rng(3));
    expect(makeExercise('b2d', 8, rng(3))).toEqual(e);
    expect(e.prompt).toHaveLength(8);
    expect(makeExercise('h2b', 16, rng(9)).prompt).toHaveLength(4);
    for (let s = 1; s < 30; s++) expect(makeExercise('d2b', 4, rng(s)).value).toBeLessThanOrEqual(15);
  });
  it('checks answers and offers escalating hints', () => {
    const e = { kind: 'd2b' as const, size: 8 as const, value: 13, prompt: '13', from: 10 as const, to: 2 as const };
    expect(check(e, '1101').ok).toBe(true);
    expect(check(e, '00001101').ok).toBe(true);
    expect(check(e, '1111').ok).toBe(false);
    expect(check(e, '13').error).toMatch(/binary digit/);
    const h = hints(e);
    expect(h).toHaveLength(3);
    expect(h[2]).toContain('1101');
  });
  it('tracks mastery and streaks', () => {
    const a = (correct: boolean, hintsUsed = 0): Attempt => ({ kind: 'd2b', size: 8, correct, hintsUsed, at: 0 });
    const list = [...Array(8).fill(0).map(() => a(true)), a(true, 2), a(false)];
    expect(mastery(list, 'd2b', 8)).toMatchObject({ attempts: 10, good: 8, mastered: true });
    expect(mastery(list, 'b2d', 8).pct).toBeNull();
    expect(streak([a(false), a(true), a(true)])).toBe(2);
  });
});
