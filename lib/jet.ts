/* Jet noise, chevrons and the silent owl.

   Overall level: the SAE/Tanna empirical fit to Lighthill's acoustic analogy,
       OASPL(90°, R) = 141 + 10 log(A/R²) + 10 log[ M^7.5 / (1 + 0.01 M^4.5) ],  M = Vj / c0
   so at low speed sound power grows as Vj^8 (Lighthill 1952).
   Spectrum: two humps, after Tam's two-source picture: the big eddies of the mixing layer (peak at a
   Strouhal number St = f D / Vj of about 0.2, loudest behind the engine) and the fine-scale turbulence
   (St about 0.7, heard everywhere).
   Chevrons: the parametric trends of Bridges & Brown (2004) and Saiyed et al. (2000). Streamwise vortices
   speed up mixing, which takes energy out of the big low-frequency eddies (a few dB around the peak)
   and puts a little into high frequencies near the nozzle. Thrust loss grows with how far the teeth
   bend into the flow. The constants are fitted so a typical 12-tooth nozzle gives NASA's ~2.7 EPNdB at
   a fraction of a percent thrust, the order reported in those tests. */

import { BANDS, dbaOf } from "./audio";

export const C0 = 340;
export const RHO = 1.2;

/** ISO 9613-1 air absorption at 20 °C, 70% RH, dB per km, at the octave centres in BANDS. */
export const ALPHA = [0.03, 0.1, 0.4, 1.0, 1.9, 3.7, 9.7, 32.8, 117, 400];

/** Overall SPL at 90° and distance R (m) for a jet of exit area A (m²) and speed Vj (m/s). */
export function oaspl(vj: number, area: number, r: number) {
  const m = vj / C0;
  return 141 + 10 * Math.log10(area / (r * r)) + 10 * Math.log10(Math.pow(m, 7.5) / (1 + 0.01 * Math.pow(m, 4.5)));
}

/** A spectral hump: 0 dB at the peak, rising a·3 dB/octave below and falling b·3 dB/octave above. */
export function hump(f: number, fp: number, a: number, b: number) {
  const r = f / fp;
  return -10 * Math.log10(0.5 * (Math.pow(r, -a) + Math.pow(r, b)));
}

export type ChevronShape = "triangle" | "sine" | "asym" | "owl";
export const SHAPES: Record<ChevronShape, { name: string; mix: number; hf: number; thrust: number; note: string }> = {
  triangle: { name: "Triangular", mix: 1.0, hf: 1.0, thrust: 1.0, note: "The standard sawtooth on the 787 and 737 MAX" },
  sine: { name: "Sinusoidal", mix: 0.86, hf: 0.6, thrust: 0.8, note: "Rounded teeth: gentler vortices, less hiss" },
  asym: { name: "Asymmetric", mix: 1.12, hf: 0.9, thrust: 1.1, note: "Uneven teeth, like an owl's feather edge, scatter the eddies" },
  owl: { name: "Owl dual-scale", mix: 1.45, hf: 0.45, thrust: 2.6, note: "Fine fringes on each tooth: research, not yet flying" },
};

export interface Nozzle { count: number; pen: number; shape: ChevronShape }
export const PLAIN: Nozzle = { count: 0, pen: 0, shape: "triangle" };

/** Mixing strength 0..~1.6: how hard the chevron vortices stir the shear layer. */
export function mixing(n: Nozzle) {
  if (!n.count || n.pen <= 0) return 0;
  return n.pen * SHAPES[n.shape].mix * Math.min(1.25, (1.5 * n.count) / (n.count + 6));
}

const LF_GAIN = 4.8, LF_ST = 1.2, LF_W = 0.65, HF_GAIN = 1.8, HF_ST = 7;
/** dB change the chevrons make at Strouhal number St. */
export function chevronDelta(st: number, n: Nozzle) {
  const m = mixing(n);
  if (!m) return 0;
  const lf = -LF_GAIN * m * Math.exp(-Math.pow(Math.log10(st / LF_ST), 2) / (2 * LF_W * LF_W));
  const hf = HF_GAIN * m * m * SHAPES[n.shape].hf / (1 + Math.pow(HF_ST / st, 2));
  return lf + hf;
}

/** Thrust lost to the chevrons, % of take-off thrust. */
export function thrustLoss(n: Nozzle) {
  if (!n.count || n.pen <= 0) return 0;
  return 0.04 + 0.5 * SHAPES[n.shape].thrust * n.pen * n.pen * Math.sqrt(n.count / 12);
}

/** Potential-core length in nozzle diameters: chevrons shorten it (mixing completes sooner). */
export const coreLength = (n: Nozzle) => 6.5 / (1 + 0.55 * mixing(n));

export interface Jet { vj: number; d: number }
/** A big twin-engine airliner at take-off: one engine's mixed jet. */
export const TAKEOFF: Jet = { vj: 300, d: 1.9 };

/** Continuous spectrum (dB, 1 Hz-ish shape, not normalised) at frequency f for observer angle theta (deg from the inlet). */
export function jetShape(f: number, jet: Jet, n: Nozzle, theta = 120) {
  const st = (f * jet.d) / jet.vj;
  const wl = Math.min(1, Math.max(0, (theta - 80) / 70)); // big eddies beam backwards
  const large = Math.pow(10, hump(st, 0.2, 2.6, 3.2) / 10) * (0.15 + 0.85 * wl) * 3.2;
  const fine = Math.pow(10, hump(st, 0.75, 1.6, 1.9) / 10);
  return 10 * Math.log10(large + fine) + chevronDelta(st, n);
}

/** Octave-band levels for a jet heard at slant distance r (m), including air absorption. */
export function jetBands(jet: Jet, n: Nozzle, r: number, theta = 120) {
  const area = (Math.PI * jet.d * jet.d) / 4;
  const total = oaspl(jet.vj, area, r) + 6 * Math.min(1, Math.max(0, (theta - 90) / 60)); // louder behind
  // distribute the plain jet's energy over the octave bands, then apply chevron changes band by band
  const sub = 6;
  const plainP: number[] = [], chevP: number[] = [];
  BANDS.forEach((fc) => {
    let p0 = 0, p1 = 0;
    for (let k = 0; k < sub; k++) {
      const f = fc * Math.pow(2, (k + 0.5) / sub - 0.5);
      const df = f * Math.LN2 / sub;
      p0 += Math.pow(10, jetShape(f, jet, PLAIN, theta) / 10) * df;
      p1 += Math.pow(10, jetShape(f, jet, n, theta) / 10) * df;
    }
    plainP.push(p0); chevP.push(p1);
  });
  const sum = plainP.reduce((a, b) => a + b, 0);
  return chevP.map((p, i) => total + 10 * Math.log10(p / sum) - (ALPHA[i] * r) / 1000);
}

/** Lighthill: for a fixed thrust, a fatter, slower jet is quieter. Mixed jet speed at take-off versus bypass ratio. */
export const jetSpeedForBpr = (bpr: number) => 700 / Math.sqrt(1 + 0.6 * bpr);
export const areaForThrust = (thrustN: number, vj: number) => thrustN / (RHO * vj * vj);

/* ---------------- the owl ---------------- */

export interface Owl { comb: boolean; velvet: boolean; fringe: boolean }
export const OWL_ON: Owl = { comb: true, velvet: true, fringe: true };
export const OWL_OFF: Owl = { comb: false, velvet: false, fringe: false };
const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Self-noise of a bird's wing at 1 m (dB), continuous in f. U: flight speed m/s.
    A plain (pigeon-like) edge scales as U^5; the owl's porous, elastic fringe as U^6 (Jaworski & Peake 2013).
    The owl's three features take noise out above ~1.6 kHz, up to ~18 dB, which is the deck's figure and
    the order Neuhaus et al. (1973) and Geyer et al. measured.                                          */
export function wingNoise(f: number, u: number, o: Owl) {
  const fp = 700 * (u / 6);
  let l = 52 + 50 * Math.log10(u / 6) + hump(f, fp, 1.4, 1.15);
  const x = Math.log2(f / 1600);
  if (o.fringe) l += -8.5 * sig(2.2 * x) + 10 * Math.log10(u / 9);
  if (o.velvet) l += -6 * sig(2.4 * (x - 0.6));
  if (o.comb) l += -3.5 * Math.exp(-((x + 0.3) * (x + 0.3)) / 1.2);
  return l;
}
export function wingBands(u: number, o: Owl, r = 1) {
  return BANDS.map((fc, i) => {
    let p = 0;
    for (let k = 0; k < 4; k++) { const f = fc * Math.pow(2, (k + 0.5) / 4 - 0.5); p += Math.pow(10, wingNoise(f, u, o) / 10) * f * 0.17; }
    return 10 * Math.log10(p) - 20 * Math.log10(r) - (ALPHA[i] * r) / 1000 - 28;
  });
}

/** Hearing ranges used on the owl step (Hz). */
export const HEARING = {
  human: { lo: 20, hi: 20000, best: [2000, 5000] as [number, number] },
  mouse: { lo: 1000, hi: 90000, best: [8000, 20000] as [number, number] },
  owl: { lo: 200, hi: 12000, best: [3000, 9000] as [number, number] },
};

/* ---------------- the take-off footprint ---------------- */
/** Slant distances (m) at which the level table is sampled: 30 m to 30 km, log spaced. */
export const TABLE_N = 48;
export const tableDist = (i: number) => 30 * Math.pow(10, (i * 3) / (TABLE_N - 1));
/** Ground absorption, wing shielding and the thrust cut-back after take-off, lumped into one figure:
    calibrated so a 787-class twin gives about 77 dBA at 450 m to the side of the runway, the A-weighted
    level that goes with its ~89 EPNdB lateral certification figure. Two engines add 3 dB. */
export const TWIN_CAL_DB = 3 - 9;
/** A-weighted maximum level (dBA) of a twin-engine take-off at each table distance. */
export function levelTable(n: Nozzle, jet: Jet = TAKEOFF) {
  return Array.from({ length: TABLE_N }, (_, i) => dbaOf(jetBands(jet, n, tableDist(i), 120)) + TWIN_CAL_DB);
}
export function levelAt(table: number[], d: number) {
  const x = (Math.log10(Math.max(30, d) / 30) / 3) * (TABLE_N - 1);
  const i = Math.min(TABLE_N - 2, Math.floor(x)), f = Math.min(1, x - i);
  return table[i] + (table[i + 1] - table[i]) * f;
}
/** Climb gradient after lift-off (rise per metre of ground), and the ground roll before it. */
export const CLIMB = 0.1, ROLL_M = 2400;
/** Slant distance (m) from a ground point (x along the runway from lift-off, z sideways) to the flight path. */
export function distToPath(x: number, z: number) {
  if (x <= 0) { const dx = x < -ROLL_M ? x + ROLL_M : 0; return Math.hypot(dx, z, 12); }
  // closest point on the climb line y = CLIMB x
  const k = 1 / Math.sqrt(1 + CLIMB * CLIMB);
  const along = x * k; // projection of (x, 0) on the unit direction (k, CLIMB k)
  const px = along * k, py = along * CLIMB * k;
  return Math.hypot(x - px, py, z);
}
