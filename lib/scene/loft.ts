import * as THREE from "three";

/* Lofted bodies: a stack of rounded cross-sections along z, nose at +z, tail at -z.
   Each section is a superellipse with its own exponent above and below the waist (n = 2 is an
   ellipse; higher n is boxier), an optional narrowing of the top ("tumblehome", how a car's glasshouse
   leans in), and a top and bottom height. The fish, the cars, the shark, the submarine and the airliner
   are all one function of t (0 = nose, 1 = tail), so a boxfish can be morphed into a car. */

export interface Section { w: number; top: number; bot: number; nTop: number; nBot: number; tumble: number }

/** Smooth interpolation through control points [t, v] (cosine easing between neighbours). */
export function curve(pts: [number, number][]) {
  return (t: number) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
        const u = (t - t0) / (t1 - t0);
        const e = (1 - Math.cos(u * Math.PI)) / 2;
        return v0 + (v1 - v0) * e;
      }
    }
    return pts[pts.length - 1][1];
  };
}

/** Rounds a nose or tail: a section closing to a point follows a quarter-ellipse instead of a cone. */
export const capRound = (t: number, lenNose: number, lenTail: number) => {
  const a = t < lenNose ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / lenNose, 2))) : 1;
  const b = t > 1 - lenTail ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - (1 - t) / lenTail, 2))) : 1;
  return Math.min(a, b);
};

export function lerpSection(a: Section, b: Section, k: number): Section {
  const l = (x: number, y: number) => x + (y - x) * k;
  return { w: l(a.w, b.w), top: l(a.top, b.top), bot: l(a.bot, b.bot), nTop: l(a.nTop, b.nTop), nBot: l(a.nBot, b.nBot), tumble: l(a.tumble, b.tumble) };
}

function ringPoint(s: Section, phi: number) {
  const c = Math.cos(phi), sn = Math.sin(phi);
  const mid = (s.top + s.bot) / 2;
  const up = sn >= 0;
  const n = up ? s.nTop : s.nBot;
  const ex = 2 / n;
  const sy = Math.pow(Math.abs(sn), ex);
  const narrow = up ? 1 - s.tumble * sy : 1;
  const x = (s.w / 2) * Math.sign(c) * Math.pow(Math.abs(c), ex) * narrow;
  const y = up ? mid + (s.top - mid) * sy : mid - (mid - s.bot) * sy;
  return [x, y];
}

/** Build (or refill) a lofted geometry. `at(t)` gives the section; length is along z. */
export function loftGeometry(at: (t: number) => Section, length: number, nz = 96, nr = 56, into?: THREE.BufferGeometry) {
  const verts = (nz + 1) * (nr + 1);
  const g = into ?? new THREE.BufferGeometry();
  let pos = g.getAttribute("position") as THREE.BufferAttribute | undefined;
  const fresh = !pos || pos.count !== verts;
  if (fresh) {
    pos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    g.setAttribute("position", pos);
    const uv = new Float32Array(verts * 2), surf = new Float32Array(verts * 2);
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("aSurf", new THREE.BufferAttribute(surf, 2));
    const idx: number[] = [];
    for (let i = 0; i < nz; i++) for (let j = 0; j < nr; j++) {
      const a = i * (nr + 1) + j, b = a + nr + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(idx);
  }
  const P = pos!.array as Float32Array;
  const UV = (g.getAttribute("uv") as THREE.BufferAttribute).array as Float32Array;
  const S = (g.getAttribute("aSurf") as THREE.BufferAttribute).array as Float32Array;
  for (let i = 0; i <= nz; i++) {
    // cluster rings near the nose and tail, where the shape changes fastest
    const u = i / nz;
    const t = 0.5 - 0.5 * Math.cos(u * Math.PI);
    const s = at(t);
    const z = length / 2 - t * length;
    let arc = 0, px = 0, py = 0;
    for (let j = 0; j <= nr; j++) {
      // start at the bottom so the seam hides underneath
      const phi = -Math.PI / 2 + (j / nr) * Math.PI * 2;
      const [x, y] = ringPoint(s, phi);
      if (j) arc += Math.hypot(x - px, y - py);
      px = x; py = y;
      const k = i * (nr + 1) + j;
      P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      UV[k * 2] = j / nr; UV[k * 2 + 1] = t;
      S[k * 2] = arc; S[k * 2 + 1] = -z;
    }
  }
  pos!.needsUpdate = true;
  (g.getAttribute("uv") as THREE.BufferAttribute).needsUpdate = true;
  (g.getAttribute("aSurf") as THREE.BufferAttribute).needsUpdate = true;
  g.computeVertexNormals();
  // weld the seam's normals
  const N = (g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array;
  for (let i = 0; i <= nz; i++) {
    const a = i * (nr + 1), b = a + nr;
    for (let c = 0; c < 3; c++) { const m = (N[a * 3 + c] + N[b * 3 + c]) / 2; N[a * 3 + c] = m; N[b * 3 + c] = m; }
  }
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** The section at t, and the outline it makes, for placing fins, wheels and labels on a body. */
export function outlineAt(at: (t: number) => Section, length: number, t: number) {
  const s = at(t);
  return { z: length / 2 - t * length, ...s };
}
