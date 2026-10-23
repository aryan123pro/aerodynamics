"use client";
/* The sound engine. Every sound on the site is synthesised live from a model's spectrum:
   white noise is split into ten octave bands (31.5 Hz to 16 kHz), each band is given the level the
   physics predicts, and tonal lines (blade tones, sonar contacts, machinery hum) are added as
   oscillators. So a 3 dB change in a model is a 3 dB change you hear. Absolute loudness is set by
   your speakers; only the differences are real.

   One AudioContext, created on the first click (browsers require a gesture). A master analyser feeds
   the live spectrum and the level meter in the masthead. */

export const BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const BAND_LABELS = ["31", "63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];

type Listener = () => void;

/** A-weighting in dB at frequency f (IEC 61672). */
export function aWeight(f: number) {
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  analyser!: AnalyserNode;
  noise!: AudioBuffer;
  on = false;
  private subs = new Set<Listener>();
  /** what the loudest playing model says its level is, for the meter */
  readouts = new Map<number, { db: number; unit: string }>();

  subscribe(f: Listener) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  emit() { this.subs.forEach((f) => f()); }

  private build() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.2;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 4096; this.analyser.smoothingTimeConstant = 0.8;
    this.master.connect(limiter); limiter.connect(this.analyser); this.analyser.connect(ctx.destination);
    // 4 s of white noise, looped; each voice starts at its own offset so voices are uncorrelated
    const n = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume();
    });
  }

  /** Turn sound on or off. Must be called from a click or key press the first time. */
  set(on: boolean) {
    if (on) this.build();
    this.on = on;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(on ? 0.55 : 0, t, 0.08);
      if (on) this.ctx.resume();
    }
    try { localStorage.setItem("silentwake.sound", on ? "1" : "0"); } catch { /* ignore */ }
    this.emit();
  }
  toggle() { this.set(!this.on); }
  meter() {
    let best: { db: number; unit: string } | null = null;
    this.readouts.forEach((r) => { if (!best || r.db > best.db) best = r; });
    return best as { db: number; unit: string } | null;
  }
}

let engine: Engine | null = null;
export function audio() {
  if (!engine) engine = new Engine();
  return engine;
}

let ids = 0;

export interface VoiceOpts {
  /** model level (dB) that plays at full scale; anything quieter is attenuated by the true difference */
  ref?: number;
  /** extra low-pass, for sound heard through water or a wall */
  lowpass?: number;
  /** for the meter */
  unit?: string;
}

/** A sound source: shaped noise plus optional tones, with an optional amplitude flutter (wingbeats, blade passes). */
export class Voice {
  id = ++ids;
  private e = audio();
  private src: AudioBufferSourceNode | null = null;
  private bandGains: GainNode[] = [];
  private out: GainNode | null = null;
  private mod: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoDepth: GainNode | null = null;
  private tones = new Map<string, { osc: OscillatorNode; g: GainNode }>();
  private ref: number;
  private unit: string;
  private lowpass?: number;
  private alive = true;
  private spectrum: number[] = BANDS.map(() => -200);

  constructor(o: VoiceOpts = {}) { this.ref = o.ref ?? 100; this.unit = o.unit ?? "dB"; this.lowpass = o.lowpass; }

  private ensure() {
    const e = this.e;
    if (!e.ctx || this.out || !this.alive) return !!this.out;
    const ctx = e.ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.mod = ctx.createGain(); this.mod.gain.value = 1;
    let tail: AudioNode = this.out;
    this.mod.connect(this.out);
    if (this.lowpass) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = this.lowpass; lp.Q.value = 0.5; this.out.connect(lp); tail = lp; }
    tail.connect(e.master);
    this.src = ctx.createBufferSource(); this.src.buffer = e.noise; this.src.loop = true;
    BANDS.forEach((f) => {
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 1.414;
      const g = ctx.createGain(); g.gain.value = 0;
      this.src!.connect(bp); bp.connect(g); g.connect(this.mod!);
      this.bandGains.push(g);
    });
    this.src.start(0, Math.random() * 3.5);
    this.out.gain.setTargetAtTime(1, ctx.currentTime, 0.15);
    return true;
  }

  /** Band levels in dB (model units, one per octave band in BANDS). */
  setSpectrum(db: number[], meterDb?: number) {
    this.spectrum = db;
    if (meterDb != null) this.e.readouts.set(this.id, { db: meterDb, unit: this.unit });
    if (!this.e.ctx || !this.ensure()) return;
    const t = this.e.ctx.currentTime;
    db.forEach((l, i) => {
      // white noise carries power in proportion to bandwidth, so take that out to get the asked-for band level
      const amp = Math.pow(10, (l - this.ref) / 20) / Math.sqrt(BANDS[i] / 250);
      this.bandGains[i]?.gain.setTargetAtTime(Math.min(amp, 4), t, 0.06);
    });
  }

  /** A tonal line: frequency in Hz and level in dB (model units); level ≤ -150 silences it. */
  setTone(key: string, freq: number, db: number, type: OscillatorType = "sine") {
    if (!this.e.ctx || !this.ensure()) return;
    const ctx = this.e.ctx;
    let tn = this.tones.get(key);
    if (!tn) {
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(this.mod!); osc.start();
      tn = { osc, g }; this.tones.set(key, tn);
    }
    const t = ctx.currentTime;
    tn.osc.frequency.setTargetAtTime(freq, t, 0.05);
    tn.g.gain.setTargetAtTime(db <= -150 ? 0 : Math.min(2, Math.pow(10, (db - this.ref) / 20) * 0.5), t, 0.06);
  }

  /** Flutter the whole voice at rate Hz, depth 0..1 (wingbeats, propeller blade passes). */
  setFlutter(rate: number, depth: number) {
    if (!this.e.ctx || !this.ensure()) return;
    const ctx = this.e.ctx;
    if (!this.lfo) {
      this.lfo = ctx.createOscillator(); this.lfo.type = "sine";
      this.lfoDepth = ctx.createGain();
      this.lfo.connect(this.lfoDepth); this.lfoDepth.connect(this.mod!.gain); this.lfo.start();
    }
    const t = ctx.currentTime;
    this.lfo.frequency.setTargetAtTime(Math.max(0.01, rate), t, 0.05);
    this.lfoDepth!.gain.setTargetAtTime(depth * 0.5, t, 0.05);
    this.mod!.gain.setTargetAtTime(1 - depth * 0.5, t, 0.05);
  }

  /** Re-apply the last spectrum once the context exists (sound was switched on after the model loaded). */
  wake() { if (this.e.ctx && this.e.on) this.setSpectrum(this.spectrum); }

  stop() {
    this.alive = false;
    this.e.readouts.delete(this.id);
    const ctx = this.e.ctx;
    if (!ctx || !this.out) return;
    const t = ctx.currentTime;
    this.out.gain.setTargetAtTime(0, t, 0.08);
    const src = this.src, tones = [...this.tones.values()], lfo = this.lfo, out = this.out;
    setTimeout(() => {
      try { src?.stop(); tones.forEach((x) => x.osc.stop()); lfo?.stop(); out.disconnect(); } catch { /* already stopped */ }
    }, 400);
  }
}

/** Sum ten octave bands, A-weighted, into one dBA figure. */
export function dbaOf(bands: number[]) {
  let s = 0;
  bands.forEach((l, i) => { s += Math.pow(10, (l + aWeight(BANDS[i])) / 10); });
  return 10 * Math.log10(s || 1e-12);
}
