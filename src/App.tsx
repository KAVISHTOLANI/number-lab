import { useMemo, useState } from 'react';
import { DemoTag, EmptyState, Landing, NotFound, Notice, PageHead, Shell, usePersistentState, useRoute } from './shared/ui';
import { BASE_NAME, explain, format, groupBinary, parse, type Base } from './lib/bases';
import { check, hints, KINDS, makeExercise, mastery, rng, SIZES, streak, type Attempt, type Exercise, type KindId, type Size } from './lib/exercises';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/explore', label: 'Explore' },
  { to: '/practice', label: 'Practice' },
  { to: '/progress', label: 'Progress' },
];

function demoAttempts(): Attempt[] {
  const out: Attempt[] = [];
  const r = rng(21);
  const plan: [KindId, Size, number][] = [['d2b', 4, 0.95], ['b2d', 4, 0.9], ['b2d', 8, 0.75], ['d2h', 8, 0.55], ['h2b', 8, 0.85]];
  let t = Date.now() - 6 * 86_400_000;
  for (const [kind, size, p] of plan)
    for (let i = 0; i < 10; i++) {
      const correct = r() < p;
      out.push({ kind, size, correct, hintsUsed: correct ? (r() < 0.2 ? 1 : 0) : 2, at: (t += 600_000) });
    }
  return out;
}

export default function App() {
  const [route] = useRoute();
  const [attempts, setAttempts] = usePersistentState<Attempt[]>('number-lab:attempts', demoAttempts);
  let page;
  if (route === '/') page = <Home />;
  else if (route === '/explore') page = <Explore />;
  else if (route === '/practice') page = <Practice onAttempt={(a) => setAttempts([...attempts, a].slice(-500))} attempts={attempts} />;
  else if (route === '/progress') page = <Progress attempts={attempts} setAttempts={setAttempts} />;
  else page = <NotFound />;
  return (
    <Shell name="Number Lab" wordmark={['Number', 'Lab']} nav={NAV} route={route} cta={{ to: '/practice', label: 'Practise' }}>
      {page}
    </Shell>
  );
}

function Bits({ value, size, onChange }: { value: number; size: number; onChange: (v: number) => void }) {
  return (
    <div className="bits" role="group" aria-label={`${size}-bit value; activate a bit to toggle it`}>
      {Array.from({ length: size }, (_, i) => {
        const pos = size - 1 - i;
        const on = (value >>> pos) & 1;
        return (
          <button key={pos} type="button" className={`bit ${on ? 'on' : ''} ${pos % 4 === 0 && pos ? 'gap' : ''}`} aria-pressed={!!on} aria-label={`Bit ${pos} (value ${2 ** pos}), ${on ? 'on' : 'off'}`} onClick={() => onChange((value ^ (2 ** pos)) >>> 0)}>
            <span className="bit-v">{on}</span>
            <span className="bit-p">{2 ** pos}</span>
          </button>
        );
      })}
    </div>
  );
}

function Readout({ value }: { value: number }) {
  return (
    <dl className="readout">
      <div><dt>Decimal</dt><dd data-testid="dec">{value}</dd></div>
      <div><dt>Hex</dt><dd data-testid="hex">0x{format(value, 16)}</dd></div>
      <div><dt>Binary</dt><dd data-testid="bin">{groupBinary(format(value, 2))}</dd></div>
    </dl>
  );
}

function Home() {
  const [v, setV] = useState(0b10110101);
  return (
    <Landing
      compact
      eyebrow="Number systems · binary, decimal, hex"
      title={<>Flip the bits. <em>Watch the numbers change.</em></>}
      lead="Learn how binary, decimal and hexadecimal relate by playing with real bits, then practise conversions with hints that guide rather than give away the answer — and track which kinds you’ve mastered."
      primary={{ href: '#/practice', label: 'Start practising' }}
      secondary={{ href: '#/explore', label: 'Explore the bits' }}
      previewLabel="Tap any bit"
      meta={['8-bit, 16-bit and 32-bit', 'Three levels of hints', 'Mastery tracking']}
      preview={<div className="hero-bits"><Bits value={v} size={8} onChange={setV} /><Readout value={v} /></div>}
      steps={[
        { title: 'Explore', body: 'Toggle bits or type a number in any base; all three views update together.' },
        { title: 'Practise', body: 'Six conversion types at 4, 8 or 16 bits. Ask for up to three hints.' },
        { title: 'Master', body: 'A type counts as mastered at 8 of the last 10 right with at most one hint.' },
      ]}
      features={[
        { title: 'Worked methods', body: 'Repeated division, place values and 4-bit grouping, shown step by step after each answer.' },
        { title: 'Digit-level feedback', body: '“2 isn’t a binary digit” — mistakes in the answer format are explained, not just marked wrong.' },
        { title: 'Escalating hints', body: 'First the method, then the first step, then the full working.' },
        { title: 'Progress grid', body: 'See accuracy for every conversion type and size at a glance.' },
      ]}
      note="Covers unsigned whole numbers up to 32 bits. Negative numbers (two’s complement) and fractions are not included yet."
      closing={{ title: <>Ten questions to <em>your first mastery.</em></>, action: { href: '#/practice', label: 'Start practising' } }}
    />
  );
}

function Explore() {
  const [value, setValue] = usePersistentState('number-lab:explore', 42);
  const [size, setSize] = useState<8 | 16 | 32>(8);
  const [drafts, setDrafts] = useState<Record<number, string | null>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});
  const clampMax = size === 32 ? 0xffffffff : 2 ** size - 1;
  const setInBase = (base: Base, raw: string) => {
    setDrafts({ ...drafts, [base]: raw });
    const p = parse(raw, base);
    if (p.error) return setErrors({ ...errors, [base]: raw.trim() ? p.error : null });
    if (p.value! > clampMax) return setErrors({ ...errors, [base]: `That needs more than ${size} bits. Switch to a larger size.` });
    setErrors({ ...errors, [base]: null });
    setValue(p.value!);
  };
  return (
    <div className="stack">
      <PageHead
        eyebrow="Explore"
        title={<>Bits <em>&amp; bases</em></>}
        description="Toggle bits or type in any base — everything stays in sync."
        actions={
          <div className="seg" role="radiogroup" aria-label="Size">
            {([8, 16, 32] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => { setSize(s); if (value > (s === 32 ? 0xffffffff : 2 ** s - 1)) setValue(0); }}>{s}-bit</button>)}
          </div>
        }
      />
      <section className="card stack">
        <Bits value={value} size={size} onChange={setValue} />
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setValue(0)}>All off</button>
          <button type="button" className="btn btn-sm" onClick={() => setValue(clampMax)}>All on</button>
          <button type="button" className="btn btn-sm" onClick={() => setValue(((value << 1) & clampMax) >>> 0)}>Shift left (×2)</button>
          <button type="button" className="btn btn-sm" onClick={() => setValue(value >>> 1)}>Shift right (÷2)</button>
        </div>
      </section>
      <div className="grid-3">
        {([10, 16, 2] as Base[]).map((b) => (
          <section key={b} className="card stack">
            <label htmlFor={`in-${b}`} className="label-mono">{BASE_NAME[b]}</label>
            <input id={`in-${b}`} className="code big-input" value={drafts[b] ?? format(value, b)} onChange={(e) => setInBase(b, e.target.value)} onBlur={() => setDrafts({ ...drafts, [b]: null })} aria-invalid={errors[b] ? true : undefined} aria-describedby={`e-${b}`} spellCheck={false} />
            <span id={`e-${b}`} className={errors[b] ? 'error-text' : 'hint'}>{errors[b] ?? (b === 2 ? `${format(value, 2).length} significant bits` : b === 16 ? `${format(value, 16).length} hex digit(s)` : 'base 10')}</span>
          </section>
        ))}
      </div>
      <section className="card">
        <h2>How {value} becomes binary</h2>
        <ol className="steps-list">{explain(value, 10, 2).map((s) => <li key={s.text}>{s.text}</li>)}</ol>
      </section>
    </div>
  );
}

function Practice({ onAttempt, attempts }: { onAttempt: (a: Attempt) => void; attempts: Attempt[] }) {
  const [kind, setKind] = usePersistentState<KindId>('number-lab:kind', 'd2b');
  const [size, setSize] = usePersistentState<Size>('number-lab:size', 8);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const ex: Exercise = useMemo(() => makeExercise(kind, size, rng(seed)), [kind, size, seed]);
  const [answer, setAnswer] = useState('');
  const [shownHints, setShownHints] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; expected: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const k = KINDS.find((x) => x.id === kind)!;
  const live = answer.trim() ? parse(answer, ex.to).error : null;
  const m = mastery(attempts, kind, size);
  const next = () => { setSeed(seed + 1); setAnswer(''); setShownHints(0); setResult(null); setError(null); };
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (result) return next();
    const c = check(ex, answer);
    if (c.error) return setError(c.error);
    setError(null);
    setResult({ ok: c.ok, expected: c.expected });
    onAttempt({ kind, size, correct: c.ok, hintsUsed: shownHints, at: Date.now() });
  }
  return (
    <div className="stack">
      <PageHead eyebrow={`Practice · streak ${streak(attempts)}`} title={<>{k.label.split(' → ')[0]} → <em>{k.label.split(' → ')[1]}</em></>} description={`Mastery for ${k.label} at ${size} bits: ${m.good} of last ${m.attempts} good${m.mastered ? ' — mastered' : ''}.`} />
      <div className="pr-pick">
        <div className="seg" role="radiogroup" aria-label="Conversion type">
          {KINDS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={kind === x.id} onClick={() => { setKind(x.id); next(); }}>{x.label}</button>)}
        </div>
        <div className="seg" role="radiogroup" aria-label="Number size">
          {SIZES.map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => { setSize(s); next(); }}>{s}-bit</button>)}
        </div>
      </div>
      <form className="card q-card" onSubmit={submit} noValidate>
        <span className="label-mono">Convert this {BASE_NAME[ex.from]} number to {BASE_NAME[ex.to]}</span>
        <p className="q-num" data-testid="prompt">{ex.from === 2 ? groupBinary(ex.prompt) : ex.from === 16 ? `0x${ex.prompt}` : ex.prompt}</p>
        <div className="answer-row">
          <label htmlFor="ans" className="sr-only">Your answer in {BASE_NAME[ex.to]}</label>
          <input id="ans" className="code" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!result} autoComplete="off" spellCheck={false} placeholder={ex.to === 2 ? 'e.g. 1011' : ex.to === 16 ? 'e.g. 3F' : 'e.g. 42'} aria-invalid={live || error ? true : undefined} aria-describedby="ans-msg" autoFocus />
          <button type="submit" className="btn btn-primary">{result ? 'Next' : 'Check'}</button>
          {!result && <button type="button" className="btn" onClick={() => setShownHints(Math.min(3, shownHints + 1))} disabled={shownHints >= 3}>Hint ({3 - shownHints} left)</button>}
        </div>
        <div id="ans-msg" aria-live="polite">
          {(error || live) && !result && <p className="error-text">{error ?? live}</p>}
          {shownHints > 0 && !result && <ol className="hints">{hints(ex).slice(0, shownHints).map((h) => <li key={h}>{h}</li>)}</ol>}
          {result && (
            <div className={`feedback ${result.ok ? 'ok' : 'no'}`}>
              <strong>{result.ok ? 'Correct!' : `Not quite — the answer is ${result.expected}.`}</strong>
              <ol className="steps-list">{explain(ex.value, ex.from, ex.to).map((s) => <li key={s.text}>{s.text}</li>)}</ol>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

function Progress({ attempts, setAttempts }: { attempts: Attempt[]; setAttempts: (a: Attempt[]) => void }) {
  if (!attempts.length) return <EmptyState title="No practice yet" actions={<a className="btn btn-primary" href="#/practice">Start practising</a>}>Your mastery grid fills in as you answer questions.</EmptyState>;
  const total = attempts.length, right = attempts.filter((a) => a.correct).length;
  const mastered = KINDS.flatMap((k) => SIZES.map((s) => mastery(attempts, k.id, s))).filter((m) => m.mastered).length;
  const isDemo = attempts.length === 50 && attempts.every((a) => a.at < Date.now() - 86_400_000);
  return (
    <div className="stack">
      <PageHead eyebrow={<>Progress {isDemo && <DemoTag />}</>} title={<>Mastery <em>grid</em></>} description={`${total} attempts · ${Math.round((right / total) * 100)}% correct · ${mastered} of ${KINDS.length * SIZES.length} mastered`} actions={<button type="button" className="btn btn-ghost" onClick={() => window.confirm('Clear all practice history?') && setAttempts([])}>Reset progress</button>} />
      <div className="table-wrap">
        <table className="table mastery">
          <thead><tr><th>Conversion</th>{SIZES.map((s) => <th key={s} className="num">{s}-bit</th>)}</tr></thead>
          <tbody>
            {KINDS.map((k) => (
              <tr key={k.id}>
                <th scope="row">{k.label}</th>
                {SIZES.map((s) => {
                  const m = mastery(attempts, k.id, s);
                  return (
                    <td key={s} className="num">
                      <span className={`m-cell ${m.mastered ? 'done' : m.pct == null ? 'none' : m.pct >= 0.6 ? 'mid' : 'low'}`} title={m.pct == null ? 'Not attempted' : `${m.good} of last ${m.attempts} good`}>
                        {m.pct == null ? '—' : m.mastered ? '★ Mastered' : `${Math.round(m.pct * 100)}%`}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notice kind="info">Mastered = at least 8 of your last 10 attempts correct, using no more than one hint each.</Notice>
    </div>
  );
}
