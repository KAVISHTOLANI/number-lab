export type Base = 2 | 10 | 16;
export const BASE_NAME: Record<Base, string> = { 2: 'binary', 10: 'decimal', 16: 'hexadecimal' };
const DIGITS: Record<Base, RegExp> = { 2: /^[01]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i };
export const MAX = 0xffffffff;

/** Parses a non-negative whole number written in a base. Accepts 0b/0x prefixes, spaces and underscores as separators. */
export function parse(raw: string, base: Base): { value: number | null; error: string | null } {
  let t = raw.trim().replace(/[\s_]/g, '');
  if (!t) return { value: null, error: 'Enter a number.' };
  if (base === 2) t = t.replace(/^0b/i, '');
  if (base === 16) t = t.replace(/^0x/i, '');
  if (t.startsWith('-')) return { value: null, error: 'Only whole numbers 0 and above are used here.' };
  if (!DIGITS[base].test(t)) {
    const bad = [...t].find((c) => !DIGITS[base].test(c));
    const allowed = base === 2 ? '0 and 1' : base === 10 ? '0–9' : '0–9 and A–F';
    return { value: null, error: `“${bad}” isn’t a ${BASE_NAME[base]} digit. Use ${allowed}.` };
  }
  const v = parseInt(t, base);
  if (v > MAX) return { value: null, error: 'That is larger than 32 bits (4,294,967,295).' };
  return { value: v, error: null };
}

export function format(v: number, base: Base, minDigits = 0): string {
  const s = v.toString(base).toUpperCase();
  return s.padStart(minDigits, '0');
}

export function groupBinary(s: string): string {
  const padded = s.padStart(Math.ceil(s.length / 4) * 4, '0');
  return padded.match(/.{4}/g)!.join(' ');
}

export interface Step {
  text: string;
  detail?: string;
}

/** Repeated division: shows each quotient and remainder. */
export function divisionSteps(n: number, base: 2 | 16): Step[] {
  if (n === 0) return [{ text: '0 is 0 in every base.' }];
  const steps: Step[] = [];
  let x = n;
  const rems: string[] = [];
  while (x > 0) {
    const q = Math.floor(x / base), r = x % base;
    rems.push(format(r, base));
    steps.push({ text: `${x} ÷ ${base} = ${q} remainder ${r}${base === 16 && r > 9 ? ` (${format(r, 16)})` : ''}` });
    x = q;
  }
  steps.push({ text: `Read the remainders from bottom to top: ${rems.reverse().join('')}` });
  return steps;
}

/** Place values: digit × base^position summed. */
export function placeValueSteps(s: string, base: 2 | 16): Step[] {
  const digits = s.toUpperCase().split('');
  const terms = digits.map((d, i) => ({ d, p: digits.length - 1 - i, v: parseInt(d, base) })).filter((t) => t.v !== 0);
  if (!terms.length) return [{ text: 'All digits are 0, so the value is 0.' }];
  return [
    { text: `Each position is worth ${base} times the one to its right: ${digits.map((_, i) => base ** (digits.length - 1 - i)).join(', ')}.` },
    { text: `Multiply each non-zero digit by its position value: ${terms.map((t) => `${t.d}×${base ** t.p}`).join(' + ')}` },
    { text: `= ${terms.map((t) => t.v * base ** t.p).join(' + ')} = ${terms.reduce((a, t) => a + t.v * base ** t.p, 0)}` },
  ];
}

/** Hex ↔ binary by 4-bit groups (nibbles). */
export function nibbleSteps(value: number, fromBase: 2 | 16): Step[] {
  const hex = format(value, 16);
  const pairs = hex.split('').map((h) => `${h} = ${format(parseInt(h, 16), 2, 4)}`);
  return fromBase === 16
    ? [{ text: 'Each hex digit is exactly four binary digits.' }, { text: pairs.join(' · ') }, { text: `Join them: ${groupBinary(format(value, 2))}` }]
    : [{ text: 'Split the binary into groups of four from the right (pad with zeros on the left).' }, { text: groupBinary(format(value, 2)).split(' ').map((g) => `${g} = ${format(parseInt(g, 2), 16)}`).join(' · ') }, { text: `Join the hex digits: ${hex}` }];
}

export function explain(value: number, from: Base, to: Base): Step[] {
  if (from === to) return [{ text: 'Same base — nothing to convert.' }];
  if (from === 10) return divisionSteps(value, to as 2 | 16);
  if (to === 10) return placeValueSteps(format(value, from), from as 2 | 16);
  return nibbleSteps(value, from as 2 | 16);
}
