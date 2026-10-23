"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChevronShape } from "@/lib/jet";

/* A high-bypass turbofan, built from revolved profiles, with chevron nozzles on the fan and core exits.
   Axis along z: intake at +z, exhaust towards -z. Fan radius 1. */

/** Revolve an (r, z) profile around the z axis. */
export function revolve(profile: [number, number][], seg = 96) {
  const pos: number[] = [], idx: number[] = [];
  const n = profile.length;
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    for (const [r, z] of profile) pos.push(r * c, r * s, z);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = (j + 1) * n + i;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tooth profile at fraction f of one chevron period (0 at a notch root, 1 at a tip). */
function tooth(f: number, k: number, shape: ChevronShape) {
  const tri = 1 - Math.abs(2 * f - 1);
  if (shape === "sine") return 0.5 - 0.5 * Math.cos(2 * Math.PI * f);
  if (shape === "asym") return (f < 0.32 ? f / 0.32 : (1 - f) / 0.68) * (k % 2 ? 0.68 : 1);
  if (shape === "owl") return tri * 0.9 + 0.1 * (1 - Math.abs(2 * ((f * 9) % 1) - 1)) * Math.min(1, tri * 2.5);
  return tri;
}

/** A conical nozzle shell whose trailing edge is cut into chevrons that bend into the jet by `pen` (0..1). */
export function chevronNozzle({ r0, r1, len, count, pen, shape = "triangle", toothLen }: {
  r0: number; r1: number; len: number; count: number; pen: number; shape?: ChevronShape; toothLen: number;
}) {
  const na = Math.max(120, count * 16), ns = 22;
  const pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= na; j++) {
    const th = (j / na) * Math.PI * 2;
    const fpos = (th / (Math.PI * 2)) * Math.max(1, count);
    const k = Math.floor(fpos), f = fpos - k;
    const prof = count ? tooth(f, k, shape) : 0;
    const ext = len + toothLen * prof;
    for (let i = 0; i <= ns; i++) {
      const s = i / ns, ax = s * ext;
      let r = r0 + ((r1 - r0) * ax) / len;
      if (ax > len && toothLen > 0) { const d = (ax - len) / toothLen; r -= pen * toothLen * 0.42 * d * d; }
      pos.push(r * Math.cos(th), r * Math.sin(th), -ax);
    }
  }
  for (let j = 0; j < na; j++) for (let i = 0; i < ns; i++) {
    const a = j * (ns + 1) + i, b = (j + 1) * (ns + 1) + i;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** One ring of thin blades between radii, twisted along the span. */
function bladeRing(n: number, rIn: number, rOut: number, chord: number, twist: number, lean = 0) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], idx: number[] = [];
  const S = 6, C = 3;
  for (let b = 0; b < n; b++) {
    const base = pos.length / 3, a0 = (b / n) * Math.PI * 2;
    for (let i = 0; i <= S; i++) {
      const u = i / S, r = rIn + (rOut - rIn) * u, tw = twist * (0.35 + 0.65 * u);
      const c = chord * (1 - 0.25 * u);
      for (let k = 0; k <= C; k++) {
        const v = k / C - 0.5;
        const da = (v * c * Math.sin(tw)) / r + lean * u, dz = v * c * Math.cos(tw);
        const a = a0 + da;
        pos.push(r * Math.cos(a), r * Math.sin(a), dz);
      }
    }
    for (let i = 0; i < S; i++) for (let k = 0; k < C; k++) {
      const p = base + i * (C + 1) + k, q = p + C + 1;
      idx.push(p, q, p + 1, q, q + 1, p + 1);
    }
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface FanProps {
  fanCount?: number; fanPen?: number; coreCount?: number; corePen?: number; shape?: ChevronShape;
  cutaway?: boolean; spin?: number; glow?: number; paint?: string; showInside?: boolean;
}

export const FAN_EXIT_Z = -0.9, CORE_EXIT_Z = -1.62, FAN_EXIT_R = 0.95, CORE_EXIT_R = 0.5;

export default function Turbofan({ fanCount = 0, fanPen = 0, coreCount = 0, corePen = 0, shape = "triangle", cutaway = false, spin = 1, glow = 1, paint = "#e9e8ef", showInside }: FanProps) {
  const fan = useRef<THREE.Group>(null!);
  const lp = useRef<THREE.Group>(null!);
  const hp = useRef<THREE.Group>(null!);
  // a classic quarter cutaway: remove the wedge where x > 0 and y > 0
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)], []);
  const planes = cutaway ? clip : [];
  const inside = showInside ?? cutaway;

  const geo = useMemo(() => {
    const nacelle = revolve([
      [0.99, 2.05], [1.06, 2.12], [1.13, 2.05], [1.19, 1.6], [1.2, 1.1], [1.15, 0.2], [1.04, -0.5], [0.975, FAN_EXIT_Z],
      [0.955, FAN_EXIT_Z], [0.96, -0.3], [1.0, 1.0], [1.0, 1.5], [0.98, 1.95], [0.99, 2.05],
    ], 128);
    const coreCowl = revolve([[0.36, 1.12], [0.5, 0.9], [0.62, 0.3], [0.64, -0.2], [0.6, -0.9], [CORE_EXIT_R + 0.02, CORE_EXIT_Z]], 96);
    const coreInner = revolve([[CORE_EXIT_R, CORE_EXIT_Z], [0.5, -1.0], [0.46, -0.2], [0.33, 0.9]], 96);
    const plug = revolve([[0.0001, -2.55], [0.12, -2.35], [0.26, -1.95], [0.32, -1.6], [0.33, -1.1]], 72);
    const spinner = revolve([[0.0001, 1.78], [0.12, 1.7], [0.24, 1.55], [0.32, 1.32], [0.33, 1.2]], 72);
    const fanBlades = bladeRing(22, 0.33, 0.985, 0.42, 1.05, 0.12);
    const shaft = new THREE.CylinderGeometry(0.06, 0.06, 4, 16).rotateX(Math.PI / 2);
    return { nacelle, coreCowl, coreInner, plug, spinner, fanBlades, shaft };
  }, []);
  const fanNozzle = useMemo(() => chevronNozzle({ r0: 0.968, r1: 0.94, len: 0.02, count: fanCount, pen: fanPen, shape, toothLen: 0.34 }), [fanCount, fanPen, shape]);
  const coreNozzle = useMemo(() => chevronNozzle({ r0: CORE_EXIT_R + 0.015, r1: CORE_EXIT_R - 0.005, len: 0.02, count: coreCount, pen: corePen, shape, toothLen: 0.22 }), [coreCount, corePen, shape]);

  // compressor and turbine stages: cold blue to hot orange
  const stages = useMemo(() => {
    const st: { z: number; rIn: number; rOut: number; n: number; color: string; hot: number; spool: "lp" | "hp" }[] = [];
    for (let i = 0; i < 3; i++) st.push({ z: 0.98 - i * 0.12, rIn: 0.3, rOut: 0.5 - i * 0.02, n: 34, color: "#7fb4ff", hot: 0, spool: "lp" });
    for (let i = 0; i < 8; i++) st.push({ z: 0.58 - i * 0.075, rIn: 0.27 + i * 0.006, rOut: 0.42 - i * 0.012, n: 40, color: ["#8fb8ff", "#a3b6f5", "#b7b2e8", "#c9adda", "#d9a6c6", "#e6a0ae", "#ef9b93", "#f39a7c"][i], hot: i / 10, spool: "hp" });
    for (let i = 0; i < 2; i++) st.push({ z: -0.42 - i * 0.1, rIn: 0.28, rOut: 0.39 + i * 0.02, n: 36, color: "#ff8a4a", hot: 0.9, spool: "hp" });
    for (let i = 0; i < 5; i++) st.push({ z: -0.68 - i * 0.13, rIn: 0.3, rOut: 0.43 + i * 0.012, n: 44, color: ["#ff9a52", "#ffad60", "#f6b874", "#e9bf88", "#d7c09c"][i], hot: 0.7 - i * 0.12, spool: "lp" });
    return st.map((s) => ({ ...s, geo: bladeRing(s.n, s.rIn, s.rOut, 0.06, s.spool === "lp" ? 0.9 : 0.7, 0) }));
  }, []);

  useFrame((_s, dt) => {
    if (fan.current) fan.current.rotation.z -= dt * 6 * spin;
    if (lp.current) lp.current.rotation.z -= dt * 6 * spin;
    if (hp.current) hp.current.rotation.z -= dt * 14 * spin;
  });
  useEffect(() => () => { Object.values(geo).forEach((g) => g.dispose()); }, [geo]);
  useEffect(() => () => fanNozzle.dispose(), [fanNozzle]);
  useEffect(() => () => coreNozzle.dispose(), [coreNozzle]);

  return (
    <group>
      <mesh geometry={geo.nacelle} castShadow receiveShadow>
        <meshPhysicalMaterial color={paint} metalness={0.25} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} side={THREE.DoubleSide} clippingPlanes={planes} clipIntersection />
      </mesh>
      <mesh geometry={fanNozzle} castShadow position-z={FAN_EXIT_Z}>
        <meshStandardMaterial color="#c9ccd6" metalness={1} roughness={0.28} side={THREE.DoubleSide} clippingPlanes={planes} clipIntersection />
      </mesh>
      <mesh geometry={geo.coreCowl} castShadow>
        <meshStandardMaterial color="#9ea3b2" metalness={0.85} roughness={0.35} side={THREE.DoubleSide} clippingPlanes={planes} clipIntersection />
      </mesh>
      <mesh geometry={geo.coreInner}>
        <meshStandardMaterial color="#3b3e4a" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} clippingPlanes={planes} clipIntersection />
      </mesh>
      <mesh geometry={coreNozzle} position-z={CORE_EXIT_Z}>
        <meshStandardMaterial color="#b6a48f" metalness={1} roughness={0.33} side={THREE.DoubleSide} clippingPlanes={planes} clipIntersection />
      </mesh>
      <mesh geometry={geo.plug} castShadow>
        <meshStandardMaterial color="#8a7f75" metalness={0.9} roughness={0.4} emissive="#ff5a1f" emissiveIntensity={0.08 * glow} />
      </mesh>
      <group ref={fan}>
        <mesh geometry={geo.fanBlades} position-z={1.3}>
          <meshStandardMaterial color="#555b6e" metalness={0.95} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.spinner}>
          <meshStandardMaterial color="#20222b" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 1.6]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.13, 0.008, 6, 40]} />
          <meshBasicMaterial color="#ecebf4" />
        </mesh>
      </group>
      {inside && (
        <>
          <mesh geometry={geo.shaft}><meshStandardMaterial color="#6d7182" metalness={1} roughness={0.3} /></mesh>
          <group ref={lp}>
            {stages.filter((s) => s.spool === "lp").map((s, i) => (
              <mesh key={"l" + i} geometry={s.geo} position-z={s.z}>
                <meshStandardMaterial color={s.color} metalness={0.7} roughness={0.35} emissive={s.color} emissiveIntensity={s.hot * 0.6 * glow} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
          <group ref={hp}>
            {stages.filter((s) => s.spool === "hp").map((s, i) => (
              <mesh key={"h" + i} geometry={s.geo} position-z={s.z}>
                <meshStandardMaterial color={s.color} metalness={0.7} roughness={0.35} emissive={s.color} emissiveIntensity={s.hot * 0.6 * glow} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
          {/* the combustor: a ring of flame */}
          <mesh position-z={-0.18}>
            <torusGeometry args={[0.36, 0.04, 16, 64]} />
            <meshStandardMaterial color="#ff7a2e" emissive="#ff6a1a" emissiveIntensity={1.4 * glow} />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ---------------- the exhaust plume ----------------
   GPU particles: each one's position is a function of its age, so 30 000 cost nothing on the CPU.
   Hot core gas (orange) and cold bypass air (cyan) leave the nozzles and mix with the still air.
   Without chevrons the shear layer rolls up into big rings (Kelvin-Helmholtz); with chevrons the
   streamwise vortices pull the jet into lobes (one per tooth), break the rings into small eddies and
   finish the mixing sooner (a shorter potential core). */
export function Plume({ count = 26000, mixing = 0, teeth = 12, speed = 1, length = 12, coreLen = 6.5, z0 = CORE_EXIT_Z, fanZ = FAN_EXIT_Z, scale = 1, power = 1 }: {
  count?: number; mixing?: number; teeth?: number; speed?: number; length?: number; coreLen?: number; z0?: number; fanZ?: number; scale?: number; power?: number;
}) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uMix: { value: 0 }, uTeeth: { value: 12 }, uLen: { value: 12 }, uCore: { value: 6.5 }, uZ0: { value: z0 }, uFanZ: { value: fanZ }, uPx: { value: 300 }, uPow: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aR; // seed, theta, radial random, kind (0 core, 1 bypass)
      uniform float uT, uMix, uTeeth, uLen, uCore, uZ0, uFanZ, uPx, uPow;
      varying vec3 vC; varying float vA;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float seed = aR.x, th0 = aR.y, rr = aR.z, kind = aR.w;
        float age = fract(uT * 0.12 + seed);
        float s = age * uLen;                                    // distance downstream, in fan radii
        float r0 = kind < 0.5 ? 0.5 * sqrt(rr) : mix(0.55, 0.95, rr);
        float zs = kind < 0.5 ? uZ0 : uFanZ;
        // shear layers grow linearly; chevrons make them grow faster
        float grow = (0.06 + 0.045 * uMix) * s;
        float rnd = (h(seed * 91.7) - 0.5) * 2.0;
        float r = r0 * (1.0 - 0.25 * smoothstep(0.0, uCore, s)) + grow * rnd + 0.025 * s;
        // lobes: one per tooth, strongest just behind the nozzle
        float lobe = 0.2 * uMix * cos(uTeeth * th0) * smoothstep(0.0, 0.8, s) * exp(-s / 5.0);
        r *= 1.0 + lobe;
        // streamwise vortex pairs twist the flow beside each tooth
        float th = th0 + 0.22 * uMix * sin(uTeeth * th0) * smoothstep(0.0, 1.5, s);
        // big coherent rings without chevrons, small broken eddies with them
        float kh = (1.0 - 0.75 * min(1.0, uMix)) * 0.16 * sin(s * 1.5 - uT * 7.0 + th0 * 0.0) * smoothstep(0.6, 3.0, s);
        float small = 0.06 * uMix * sin(s * 6.0 - uT * 13.0 + th0 * uTeeth) * smoothstep(0.3, 2.0, s);
        r += kh * (0.6 + s * 0.08) + small;
        vec3 p = vec3(r * cos(th), r * sin(th), zs - s);
        // turbulence
        p.x += (h(seed * 17.3 + floor(uT * 8.0)) - 0.5) * 0.015 * s;
        p.y += (h(seed * 29.1 + floor(uT * 8.0)) - 0.5) * 0.015 * s;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((0.05 + 0.03 * s) * uPx / max(0.2, -mv.z), 1.5, 48.0);
        // temperature: hot inside the potential core, cooling as it mixes
        float hot = kind < 0.5 ? exp(-max(0.0, s - uCore * 0.35) / (uCore * 0.45)) : 0.0;
        vec3 core = mix(vec3(0.62, 0.55, 0.85), mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.85, 0.55), hot), hot);
        vec3 byp = mix(vec3(0.33, 0.83, 1.0), vec3(0.55, 0.5, 0.85), smoothstep(0.0, uCore, s));
        vC = kind < 0.5 ? core : byp;
        vA = smoothstep(0.0, 0.03, age) * (1.0 - smoothstep(0.55, 1.0, age)) * (kind < 0.5 ? 0.75 : 0.32) * uPow;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); float a = exp(-d * 10.0) * vA * 0.55; if (a < 0.01) discard; gl_FragColor = vec4(vC * a, a); }`,
  }), [z0, fanZ]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3), a = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { a[i * 4] = Math.random(); a[i * 4 + 1] = Math.random() * Math.PI * 2; a[i * 4 + 2] = Math.random(); a[i * 4 + 3] = i % 3 === 0 ? 0 : 1; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(a, 4));
    return g;
  }, [count]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => {
    const u = mat.uniforms;
    u.uT.value += dt * speed;
    u.uMix.value += (mixing - u.uMix.value) * Math.min(1, dt * 3);
    u.uTeeth.value = teeth || 12;
    u.uLen.value = length; u.uCore.value = coreLen; u.uPow.value = power;
    u.uPx.value = st.size.height * 0.9 * scale;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
