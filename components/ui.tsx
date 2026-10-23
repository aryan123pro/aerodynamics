"use client";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { audio, BANDS, Voice, type VoiceOpts } from "@/lib/audio";
import { FAINT, GRID, monoFamily, plot, setupCanvas, type PlotOpts } from "@/lib/plot";
import { store } from "@/lib/site";
import { useShell, useSoundOn } from "./Shell";

/* ---------- steps ---------- */
export function Step({ children }: { title: string; children: ReactNode }) { return <>{children}</>; }

export function Steps({ id, children, next }: { id: string; children: ReactNode; next?: { href: string; label: string } }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ title: string; children: ReactNode }>[];
  const titles = items.map((c) => c.props.title);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { setSteps } = useShell();

  const go = useCallback((i: number, scroll = true) => {
    const k = Math.max(0, Math.min(titles.length - 1, i));
    setActive(k);
    try { history.replaceState(null, "", "#step-" + (k + 1)); } catch { /* ignore */ }
    if (scroll && document.body.classList.contains("story")) window.scrollTo({ top: 0, behavior: "smooth" });
    else if (scroll && barRef.current) {
      const y = barRef.current.getBoundingClientRect().top + window.scrollY - 56;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [titles.length]);

  useEffect(() => {
    const read = () => { const m = /#step-(\d+)/.exec(location.hash); if (m) go(+m[1] - 1, false); };
    read();
    setSeen(store<number[]>("seen." + id) || []);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [id, go]);
  useEffect(() => {
    setSeen((s) => { if (s.includes(active)) return s; const n = [...s, active]; store("seen." + id, n); return n; });
    tabRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active, id]);
  // arrow keys live in the Shell, which also carries story mode across pages
  useEffect(() => { setSteps({ titles, go, active }); }, [titles.join("|"), go, active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setSteps(null), [setSteps]);

  const cur = items[active];
  return (
    <>
      <div className="steps-bar" ref={barRef}>
        <div className="wrap" role="tablist" aria-label="Steps">
          {titles.map((t, i) => (
            <button key={t} role="tab" ref={(el) => { tabRefs.current[i] = el; }} aria-selected={i === active} className={seen.includes(i) ? "seen" : ""} onClick={() => go(i)}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>{t}
            </button>
          ))}
        </div>
      </div>
      <main className="wrap">
        <section className="step active" key={active}>
          {cur}
          <div className="stepnav">
            {active > 0 ? <button className="btn ghost" onClick={() => go(active - 1)}>&larr; <span>{titles[active - 1]}</span></button> : <span />}
            {active < titles.length - 1
              ? <button className="btn primary" onClick={() => go(active + 1)}>Next &middot; {titles[active + 1]} &rarr;</button>
              : next ? <Link className="btn primary" href={next.href}>{next.label} &rarr;</Link> : <span />}
          </div>
        </section>
      </main>
    </>
  );
}

export function StepHead({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="step-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </div>
  );
}

export function PageHead({ numeral, eyebrow, title, children, stats, coords }: {
  numeral: string; eyebrow: ReactNode; title: ReactNode; children?: ReactNode; stats?: [ReactNode, ReactNode][]; coords?: string[];
}) {
  return (
    <div className="wrap pagehead">
      <div className="numeral" aria-hidden="true">{numeral}</div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 style={{ marginTop: 10 }}>{title}</h1>
        {children && <p className="lede">{children}</p>}
        {coords && <div className="coords">{coords.map((c) => <span key={c} className="chip"><i />{c}</span>)}</div>}
        {stats && (
          <div className="statsrow">
            {stats.map(([b, s], i) => <div className="stat" key={i}><b>{b}</b><span>{s}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** A test cell: a framed 3D figure with bracket corners and a numbered caption. */
export function Plate({ n, title, children, note }: { n: string | number; title: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <figure style={{ margin: 0 }}>
      <div className="plate">{children}</div>
      <figcaption className="caption"><span><b>Cell {n}</b>{title}</span>{note && <span>{note}</span>}</figcaption>
    </figure>
  );
}

/** The little top-left label inside a cell: a recording light, the cell id and run. */
export function CellTag({ children }: { children: ReactNode }) {
  return <div className="cell-tag"><span className="rec" />{children}</div>;
}

/* ---------- presenter notes ---------- */
export function Notes({ say, ask, show }: { say?: ReactNode; ask?: ReactNode; show?: ReactNode }) {
  return (
    <div className="notes">
      {say && <p><b>Say</b> {say}</p>}
      {show && <p><b>Show</b> {show}</p>}
      {ask && <p><b>Ask the class</b> {ask}</p>}
    </div>
  );
}

/* ---------- controls ---------- */
export function Range({ label, value, min, max, step = 1, onChange, fmt, id }: {
  label: ReactNode; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => ReactNode; id?: string;
}) {
  const auto = useId();
  const rid = id || auto;
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="ctrl">
      <label htmlFor={rid}><span>{label}</span><output>{fmt ? fmt(value) : value}</output></label>
      <input id={rid} type="range" min={min} max={max} step={step} value={value} style={{ ["--p" as string]: p + "%" }} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export function Seg<T extends string | number | boolean>({ options, value, onChange, label }: { options: [T, ReactNode][]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/** Independent on/off switches in one console row. */
export function Toggles<K extends string>({ items, value, onChange, label }: { items: [K, ReactNode][]; value: Record<K, boolean>; onChange: (v: Record<K, boolean>) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map(([k, l]) => <button key={k} aria-pressed={value[k]} onClick={() => onChange({ ...value, [k]: !value[k] })}>{l}</button>)}
    </div>
  );
}

export function Readouts({ items }: { items: [ReactNode, ReactNode, ReactNode?, ("hot" | "cool" | "acc")?][] }) {
  return (
    <div className="readouts">
      {items.map(([k, v, u, tone], i) => <div className={"readout" + (tone ? " " + tone : "")} key={i}><span className="k">{k}</span><span className="v">{v}{u && <small>{u}</small>}</span></div>)}
    </div>
  );
}

/* ---------- sound ---------- */
/** One synthesised sound source for a model; it stops when the model leaves the screen. */
export function useVoice(opts?: VoiceOpts) {
  const on = useSoundOn();
  const [voice, setVoice] = useState<Voice | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => { const v = new Voice(optsRef.current); setVoice(v); return () => v.stop(); }, []);
  return { voice, on };
}

/** "This model makes sound" chip that doubles as the switch. */
export function SoundCue({ label = "This model makes sound" }: { label?: string }) {
  const on = useSoundOn();
  return (
    <button className="btn sm" aria-pressed={on} onClick={() => audio().toggle()} title="Sound on/off (M)">
      {on ? <Volume2 size={14} /> : <VolumeX size={14} />}{on ? "Listening" : label}<span className="kbd">M</span>
    </button>
  );
}

export interface Curve { label: string; color: string; fn?: (f: number) => number; bands?: number[]; dash?: number[]; fill?: boolean }
/** A spectrum analyser: model spectra as curves over log frequency, and the live sound underneath when it is on. */
export function Analyser({ curves, y = [0, 100], height = 230, bands, ylabel = "dB", live = true }: {
  curves: Curve[]; y?: [number, number]; height?: number; bands?: { lo: number; hi: number; color: string; label: string }[]; ylabel?: string; live?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const on = useSoundOn();
  const data = useRef({ curves, y, bands });
  data.current = { curves, y, bands };
  useEffect(() => {
    let raf = 0;
    const buf = new Float32Array(2048);
    const fq = Array.from({ length: 140 }, (_, i) => 25 * Math.pow(16000 / 25, i / 139));
    const draw = () => {
      const cv = ref.current; if (!cv) return;
      const { curves: cs, y: yr, bands: bs } = data.current;
      const { ctx, w, h } = setupCanvas(cv);
      const pad = { l: 40, r: 10, t: 12, b: 26 };
      const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
      const X = (f: number) => pad.l + (Math.log10(f / 25) / Math.log10(16000 / 25)) * pw;
      const Y = (v: number) => pad.t + ph - ((v - yr[0]) / (yr[1] - yr[0])) * ph;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "10px " + monoFamily();
      for (const b of bs || []) {
        ctx.fillStyle = b.color; ctx.fillRect(X(Math.max(25, b.lo)), pad.t, X(Math.min(16000, b.hi)) - X(Math.max(25, b.lo)), ph);
        ctx.fillStyle = FAINT; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(b.label, X(Math.max(25, b.lo)) + 4, pad.t + 3);
      }
      ctx.strokeStyle = GRID; ctx.fillStyle = FAINT; ctx.lineWidth = 1;
      [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].forEach((f, i) => {
        ctx.beginPath(); ctx.moveTo(X(f) + 0.5, pad.t); ctx.lineTo(X(f) + 0.5, pad.t + ph); ctx.stroke();
        ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(["31", "63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"][i], X(f), pad.t + ph + 8);
      });
      const step = (yr[1] - yr[0]) > 60 ? 20 : 10;
      for (let v = Math.ceil(yr[0] / step) * step; v <= yr[1]; v += step) {
        ctx.beginPath(); ctx.moveTo(pad.l, Y(v) + 0.5); ctx.lineTo(pad.l + pw, Y(v) + 0.5); ctx.stroke();
        ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(String(v), pad.l - 6, Y(v));
      }
      ctx.save(); ctx.translate(10, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(ylabel, 0, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
      // the live output, as a glow behind the model curves
      const e = audio();
      if (live && e.on && e.analyser) {
        e.analyser.getFloatFrequencyData(buf);
        const sr = e.ctx!.sampleRate, n = buf.length;
        const grd = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
        grd.addColorStop(0, "rgba(157,134,255,.35)"); grd.addColorStop(1, "rgba(255,122,217,.02)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ph);
        for (let i = 0; i < fq.length; i++) {
          const bin = Math.min(n - 1, Math.round((fq[i] / (sr / 2)) * n));
          const db = buf[bin];
          const yy = pad.t + ph - Math.max(0, Math.min(1, (db + 110) / 80)) * ph;
          ctx.lineTo(X(fq[i]), yy);
        }
        ctx.lineTo(pad.l + pw, pad.t + ph); ctx.closePath(); ctx.fill();
      }
      for (const c of cs) {
        ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.setLineDash(c.dash || []); ctx.lineJoin = "round";
        ctx.beginPath();
        if (c.fn) fq.forEach((f, i) => { const yy = Y(c.fn!(f)); if (i) ctx.lineTo(X(f), yy); else ctx.moveTo(X(f), yy); });
        else if (c.bands) BANDS.forEach((f, i) => { const yy = Y(c.bands![i]); if (i) ctx.lineTo(X(f), yy); else ctx.moveTo(X(f), yy); });
        ctx.stroke(); ctx.setLineDash([]);
        if (c.bands) { ctx.fillStyle = c.color; BANDS.forEach((f, i) => { ctx.beginPath(); ctx.arc(X(f), Y(c.bands![i]), 2.6, 0, 6.3); ctx.fill(); }); }
      }
      ctx.restore();
    };
    // a light loop: 30 fps while the live sound shows, otherwise only when something changed
    let last = 0, sig = "";
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const d = data.current;
      const k = JSON.stringify([d.curves.map((c) => c.bands || c.label + (c.fn ? c.fn(1000).toFixed(2) + c.fn(100).toFixed(2) + c.fn(8000).toFixed(2) : "")), d.y]);
      const animate = on && live && audio().on;
      if ((animate && t - last > 33) || k !== sig) { last = t; sig = k; draw(); }
    };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(draw);
    if (ref.current) ro.observe(ref.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [on, live]);
  return (
    <div className="analyser">
      <canvas ref={ref} style={{ height }} role="img" aria-label={"Spectrum: " + curves.map((c) => c.label).join(", ")} />
      <div className="legend">{curves.map((c) => <span key={c.label}><i style={{ background: c.color }} />{c.label}</span>)}{live && on && <span><i style={{ background: "linear-gradient(90deg,#9d86ff,#ff7ad9)" }} />live output</span>}</div>
    </div>
  );
}

/* ---------- canvases ---------- */
export function useRaf(cb: (t: number, dt: number) => void, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = performance.now(), t = 0;
    const f = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!document.hidden) { t += dt; ref.current(t, dt); }
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** Re-run draw() whenever deps change or the canvas is resized. */
export function useCanvas(draw: (cv: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => { if (ref.current) drawRef.current(ref.current); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ro = new ResizeObserver(() => drawRef.current(cv));
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);
  return ref;
}

export function Plot({ opts, height = 240, label }: { opts: PlotOpts; height?: number; label: string }) {
  const ref = useCanvas((cv) => plot(cv, opts), [opts]);
  return <canvas ref={ref} className="plot" style={{ height }} role="img" aria-label={label} />;
}

export function Connects({ items }: { items: { href: string; t: string; s: string }[] }) {
  return (
    <div className="connects" style={{ marginTop: 24 }}>
      {items.map((x) => <Link key={x.href} href={x.href}><b>{x.t}</b><small>{x.s}</small></Link>)}
    </div>
  );
}

export function ProsCons({ pros, cons }: { pros: [string, string][]; cons: [string, string][] }) {
  return (
    <div className="proscons">
      <div className="pro"><h4 className="good">Pros</h4><ul>{pros.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul></div>
      <div className="con"><h4 className="bad">Cons</h4><ul>{cons.map(([b, t]) => <li key={b}><b>{b}</b>{t}</li>)}</ul></div>
    </div>
  );
}

export function Timeline({ items }: { items: { y: string; t: string; d: string; key?: boolean }[] }) {
  return (
    <div className="timeline">
      {items.map((x) => <div key={x.y + x.t} className={x.key ? "key" : ""}><b>{x.y}</b><h5>{x.t}</h5><p>{x.d}</p></div>)}
    </div>
  );
}
