import type { Body } from "../car";
import { capRound, curve, lerpSection, type Section } from "./loft";

/* Body profiles in metres, nose at t = 0. Car dimensions are the Bionic Car's: 4.24 m long,
   1.82 m wide, 1.59 m tall (Mercedes-Benz, 2005). The boxfish is drawn at the same length so the two
   can be morphed; in its own scene it is scaled down to a real 40 cm Ostracion cubicus. */

export const CAR_LEN = 4.24;

/** Pull a section towards its centre near the nose and tail, so the ends close smoothly. */
function capped(s: Section, f: number): Section {
  const mid = (s.top + s.bot) / 2;
  return { ...s, w: s.w * f, top: mid + (s.top - mid) * f, bot: mid - (mid - s.bot) * f };
}

const fishTop = curve([[0, 0.78], [0.1, 1.28], [0.28, 1.68], [0.5, 1.72], [0.68, 1.5], [0.8, 1.12], [0.9, 1.02], [1, 1.0]]);
const fishBot = curve([[0, 0.5], [0.12, 0.22], [0.35, 0.1], [0.6, 0.16], [0.74, 0.5], [0.82, 0.82], [0.9, 0.88], [1, 0.9]]);
const fishW = curve([[0, 0.42], [0.14, 1.12], [0.4, 1.36], [0.62, 1.22], [0.74, 0.7], [0.82, 0.26], [0.9, 0.17], [1, 0.14]]);
export function boxfish(t: number): Section {
  return capped({ w: fishW(t), top: fishTop(t), bot: fishBot(t), nTop: 3.4, nBot: 4.6, tumble: 0.34 }, capRound(t, 0.1, 0.03));
}

const bionicTop = curve([[0, 0.5], [0.04, 0.68], [0.13, 0.84], [0.22, 0.98], [0.42, 1.55], [0.56, 1.58], [0.78, 1.44], [0.93, 1.16], [1, 1.02]]);
const bionicBot = curve([[0, 0.34], [0.06, 0.2], [0.2, 0.17], [0.8, 0.17], [0.94, 0.26], [1, 0.36]]);
const bionicW = curve([[0, 1.42], [0.08, 1.66], [0.25, 1.82], [0.7, 1.82], [0.9, 1.68], [1, 1.52]]);
export function bionic(t: number): Section {
  return capped({ w: bionicW(t), top: bionicTop(t), bot: bionicBot(t), nTop: 3.1, nBot: 5.5, tumble: 0.22 * curve([[0, 0], [0.3, 1], [0.85, 1], [1, 0.5]])(t) }, capRound(t, 0.07, 0.035));
}

const compactTop = curve([[0, 0.58], [0.05, 0.74], [0.22, 0.96], [0.3, 1.06], [0.45, 1.46], [0.84, 1.47], [0.93, 1.34], [0.985, 0.98], [1, 0.84]]);
const compactBot = curve([[0, 0.3], [0.05, 0.2], [0.95, 0.2], [1, 0.32]]);
const compactW = curve([[0, 1.6], [0.1, 1.74], [0.5, 1.76], [0.95, 1.72], [1, 1.66]]);
export function compact(t: number): Section {
  return capped({ w: compactW(t), top: compactTop(t), bot: compactBot(t), nTop: 4.2, nBot: 7, tumble: 0.18 * curve([[0, 0], [0.35, 1], [1, 1]])(t) }, capRound(t, 0.035, 0.012));
}

export function brick(t: number): Section {
  return capped({ w: 1.8, top: 1.5, bot: 0.2, nTop: 40, nBot: 40, tumble: 0 }, capRound(t, 0.004, 0.004));
}

/** The Wind Tunnel's sculpted body: each slider changes one thing engineers really change. */
export function sculpt(b: Body) {
  const roofStart = 0.27 + 0.2 * b.roof;
  const top = curve([[0, 0.62 + 0.4 * (1 - b.nose)], [0.12, 0.86 + 0.25 * (1 - b.nose)], [0.24, 0.98], [roofStart, 1.52], [0.72, 1.53], [0.985, 1.48 - 0.5 * b.tail], [1, 1.46 - 0.52 * b.tail]]);
  const bot = curve([[0, 0.3], [0.06, 0.18], [0.8, 0.18], [1, 0.2 + 0.24 * b.tail]]);
  const w = curve([[0, 1.5 + 0.22 * (1 - b.nose)], [0.12, 1.8], [0.68, 1.82], [1, 1.82 - 0.36 * b.tail]]);
  const nTop = Math.max(2.6, 14 - 11 * b.nose), nBot = Math.max(3.2, 16 - 10 * b.nose) + 2 * b.keel;
  const noseLen = 0.004 + 0.1 * b.nose, tailLen = 0.004 + 0.035 * b.tail;
  return (t: number): Section => capped({ w: w(t), top: top(t), bot: bot(t), nTop, nBot, tumble: (0.08 + 0.18 * b.keel) * Math.min(1, t * 4) }, capRound(t, noseLen, tailLen));
}

export const morph = (a: (t: number) => Section, b: (t: number) => Section, k: number) => (t: number) => lerpSection(a(t), b(t), k);

/* ---- sea creatures and machines, length 1 (scale in the scene) ---- */
const sharkTop = curve([[0, 0.0], [0.08, 0.06], [0.22, 0.105], [0.42, 0.12], [0.62, 0.085], [0.82, 0.035], [1, 0.022]]);
const sharkBot = curve([[0, -0.005], [0.08, -0.05], [0.25, -0.085], [0.45, -0.09], [0.65, -0.055], [0.82, -0.022], [1, -0.016]]);
const sharkW = curve([[0, 0], [0.08, 0.1], [0.28, 0.16], [0.45, 0.15], [0.65, 0.09], [0.82, 0.035], [1, 0.022]]);
export function shark(t: number): Section {
  return capped({ w: sharkW(t), top: sharkTop(t), bot: sharkBot(t), nTop: 2.1, nBot: 2.3, tumble: 0.05 }, capRound(t, 0.12, 0.02));
}

const SUB_R = 0.058;
export function submarine(t: number): Section {
  const r = SUB_R * curve([[0, 1], [0.7, 1], [0.86, 0.62], [1, 0.12]])(t);
  return capped({ w: 2 * r, top: r, bot: -r, nTop: 2, nBot: 2, tumble: 0 }, capRound(t, 0.09, 0.012));
}
export const SUB_RADIUS = SUB_R;

const fusTop = curve([[0, 0.0], [0.06, 0.055], [0.2, 0.06], [0.74, 0.06], [0.92, 0.05], [1, 0.042]]);
const fusBot = curve([[0, -0.02], [0.06, -0.055], [0.2, -0.06], [0.7, -0.06], [0.9, -0.01], [1, 0.03]]);
const fusW = curve([[0, 0], [0.06, 0.105], [0.2, 0.12], [0.72, 0.12], [0.92, 0.05], [1, 0.012]]);
export function fuselage(t: number): Section {
  return capped({ w: fusW(t), top: fusTop(t), bot: fusBot(t), nTop: 2, nBot: 2.1, tumble: 0 }, capRound(t, 0.06, 0.01));
}
