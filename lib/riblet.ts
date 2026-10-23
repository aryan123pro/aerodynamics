/* Shark skin, riblets, ship noise and sonar.

   Wall units. In a turbulent boundary layer the size that matters is the viscous length ν/uτ, with the
   friction velocity uτ = U √(Cf/2) and the flat-plate friction law Cf = 0.0592 Re_x^-0.2.
   A riblet spacing s in wall units is s⁺ = s uτ / ν.
   Drag reduction curve: grows linearly in the "viscous regime", peaks near s⁺ ≈ 15–17, then falls and
   turns into a drag increase past s⁺ ≈ 25–30 (Bechert et al. 1997; García-Mayoral & Jiménez 2011).
   Peak values from Bechert et al.: thin blades 9.9%, scalloped 6.5%, sawtooth ~5%.
   Noise: wall-pressure fluctuations scale with the wall shear stress (p_rms ≈ 2.5–3 τ_w), so a drag cut
   of DR lowers the flow-noise forcing by 20 log10(1 − DR) dB. Modest, exactly as the deck says.          */

import { BANDS } from "./audio";

export const NU_SEA = 1.05e-6, RHO_SEA = 1025;
export const KNOT = 0.5144;

export type RibShape = "blade" | "scalloped" | "sawtooth" | "rect" | "denticle";
export const RIBS: Record<RibShape, { name: string; max: number; opt: number; note: string }> = {
  blade: { name: "Thin blades", max: 9.9, opt: 16, note: "Best in the lab, but fragile" },
  scalloped: { name: "Scalloped", max: 6.5, opt: 16, note: "U-shaped grooves, sturdier" },
  sawtooth: { name: "Sawtooth", max: 5, opt: 15, note: "V-grooves: the easiest to make (3M film)" },
  rect: { name: "Rectangular", max: 8.2, opt: 17, note: "Used on the towed sonar array (Wei et al. 2025)" },
  denticle: { name: "Shark denticles", max: 4, opt: 15, note: "Real scales overlap and flex; replicas give a few %" },
};

export const cfLocal = (re: number) => 0.0592 * Math.pow(Math.max(re, 1e4), -0.2);
/** Friction velocity (m/s) at distance x (m) from the bow, speed U (m/s). */
export function uTau(u: number, x: number) { return u * Math.sqrt(cfLocal((u * x) / NU_SEA) / 2); }
/** Viscous length in micrometres. */
export const viscousUm = (u: number, x: number) => (NU_SEA / Math.max(1e-6, uTau(u, x))) * 1e6;
export const splus = (sUm: number, u: number, x: number) => sUm / viscousUm(u, x);

/** Drag reduction in % (negative means more drag). wear 0..1 rounds the tips off. */
export function dragReduction(sp: number, shape: RibShape, wear = 0) {
  const r = RIBS[shape];
  const x = sp / r.opt;
  const max = r.max * (1 - 0.85 * wear);
  if (x <= 1) return max * x * Math.exp(1 - x) * (x < 0.05 ? x / 0.05 : 1);
  const y = (x - 1) / 0.72;
  return max * (1 - y * y) - (x > 1.72 ? 2.2 * (x - 1.72) * r.max * 0.2 : 0);
}
export const flowNoiseDelta = (drPct: number) => 20 * Math.log10(1 - drPct / 100);

/* ---------------- the submarine ---------------- */

export interface SubState { speedKn: number; depth: number; mounts: boolean; riblets: boolean; skewProp: boolean }

/** Speed (knots) at which the propeller starts to cavitate: deeper water squeezes the bubbles shut. */
export const cavitationKn = (depth: number, skew: boolean) => (skew ? 8 : 6) * Math.sqrt(1 + depth / 10);

/** Octave-band source levels (dB re 1 µPa at 1 m) of the three noise sources. */
export function subSources(s: SubState) {
  const v = Math.max(1, s.speedKn);
  const cav = Math.max(0, (v - cavitationKn(s.depth, s.skewProp)) / 4);
  const cavOn = Math.min(1, cav);
  const machinery = BANDS.map((f) => 115 - (s.mounts ? 15 : 0) + 4 * Math.log10(v / 10) + hump(f, 120, 2, 1.6));
  const flowBase = 104 + 60 * Math.log10(v / 10) + (s.riblets ? flowNoiseDelta(7) - 2.5 : 0);
  const flow = BANDS.map((f) => flowBase + hump(f, 300, 1.2, 1.4));
  const prop = BANDS.map((f) => 112 + 40 * Math.log10(v / 10) + hump(f, 90, 2.2, 1.8)
    + (cavOn > 0 ? 10 * Math.log10(1 + 60 * cavOn * Math.pow(10, hump(f, 3000, 1.4, 1.1) / 10)) : 0));
  return { machinery, flow, prop, cavitating: cavOn > 0 };
}
function hump(f: number, fp: number, a: number, b: number) {
  const r = f / fp;
  return -10 * Math.log10(0.5 * (Math.pow(r, -a) + Math.pow(r, b)));
}
export const sumBands = (...ls: number[][]) => ls[0].map((_, i) => 10 * Math.log10(ls.reduce((s, l) => s + Math.pow(10, l[i] / 10), 0)));
export const overall = (bands: number[]) => 10 * Math.log10(bands.reduce((s, l) => s + Math.pow(10, l / 10), 0));

/** Passive sonar equation: an enemy hears you while SL − TL ≥ NL − DI + DT. TL = 20 log r + α r. Returns km. */
export function detectionKm(sl: number, nl = 64, di = 15, dt = 6, alphaDbPerKm = 0.07) {
  const tlMax = sl - (nl - di + dt);
  let lo = 1, hi = 3e6;
  for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); const tl = 20 * Math.log10(mid) + (alphaDbPerKm * mid) / 1000; if (tl > tlMax) hi = mid; else lo = mid; }
  return lo / 1000;
}

/* ---------------- the towed sonar array: Wei et al. 2025 ---------------- */
export interface ArrayDesign { id: string; name: string; known: string; noise: number | null; drag: number | null; p250: number | null; p750: number | null; spacing: number; height: number; color: string }
/** Bioinspiration & Biomimetics 20, 066002 (2025), simulation against a smooth surface; values as in the deck (slide 34). */
export const ARRAY_DESIGNS: ArrayDesign[] = [
  { id: "smooth", name: "Smooth", known: "Baseline", noise: 0, drag: 0, p250: 0, p750: 0, spacing: 0, height: 0, color: "#9aa0b4" },
  { id: "d17", name: "Design 17", known: "Quietest overall, best at higher frequency", noise: -8.81, drag: 7.34, p250: null, p750: -96.91, spacing: 0.9, height: 1.3, color: "#5eead0" },
  { id: "d27", name: "Design 27", known: "Quiet and also lowers drag", noise: -6.87, drag: -0.34, p250: -89.08, p750: -90.33, spacing: 1, height: 1, color: "#55d4ff" },
  { id: "d40", name: "Design 40", known: "Biggest drag reduction", noise: null, drag: -5.18, p250: null, p750: null, spacing: 1.4, height: 0.8, color: "#9d86ff" },
  { id: "d41", name: "Design 41", known: "Strongest cut of the 250 Hz tone", noise: null, drag: 0.8, p250: -95.3, p750: null, spacing: 0.9, height: 1.25, color: "#ff7ad9" },
  { id: "d61", name: "Design 61", known: "Best trade-off between noise and drag", noise: null, drag: -4.91, p250: -67.02, p750: -59.19, spacing: 1.15, height: 1.05, color: "#ffc457" },
];
/** Percent peak reduction to dB. */
export const pctToDb = (p: number | null) => (p == null ? 0 : 20 * Math.log10(Math.max(0.005, 1 + p / 100)));
