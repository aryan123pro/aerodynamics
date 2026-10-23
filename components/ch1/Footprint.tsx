"use client";
import { OrbitControls, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Jetliner from "@/components/three/Jetliner";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { dbaOf } from "@/lib/audio";
import { CLIMB, distToPath, jetBands, levelAt, levelTable, PLAIN, ROLL_M, TABLE_N, TAKEOFF, TWIN_CAL_DB, type Nozzle } from "@/lib/jet";
import { fmt } from "@/lib/plot";

/* The problem, from the ground. A twin-jet takes off at night over a town. The coloured footprint on
   the ground is the loudest level each spot hears during the climb, from the jet-noise model (Lighthill
   scaling, two-source spectrum, A-weighting, spherical spreading and air absorption). Homes inside the
   65 dBA line light up. Switch the nozzles and watch the footprint shrink.
   Scale: 1 unit = 100 m. The aircraft is drawn 5× larger so it can be seen. Its flight is time-lapsed. */

const U = 100; // metres per unit
const MODES = {
  plain: { name: "Plain nozzles", n: PLAIN },
  chevron: { name: "Chevrons (787)", n: { count: 12, pen: 0.6, shape: "triangle" } },
  owl: { name: "Owl dual-scale", n: { count: 12, pen: 1, shape: "owl" } },
} satisfies Record<string, { name: string; n: Nozzle }>;
type Mode = keyof typeof MODES;
const THRESH = 65;

/* towns: deterministic clusters of homes */
function makeHomes() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const towns = [[22, -12, 9, 520], [46, 9, 11, 640], [74, -24, 8, 380], [34, 30, 8, 360], [95, 6, 10, 460], [-8, 26, 7, 260], [60, 38, 7, 220], [120, -10, 9, 300]];
  const homes: [number, number][] = [];
  for (const [cx, cz, r, n] of towns) for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = r * Math.sqrt(-2 * Math.log(Math.max(1e-6, rnd()))) * 0.55;
    // snap to a street grid
    const x = Math.round((cx + Math.cos(a) * d) / 0.55) * 0.55, z = Math.round((cz + Math.sin(a) * d) / 0.4) * 0.4;
    if (Math.abs(z) < 1.4 && x < 2) continue; // keep the runway clear
    homes.push([x, z]);
  }
  return homes;
}

function Ground({ tables, mode }: { tables: Record<Mode, number[]>; mode: Mode }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uA: { value: tables.plain }, uB: { value: tables.plain }, uMix: { value: 1 }, uT: { value: 0 } },
    vertexShader: "varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      #define N ${TABLE_N}
      uniform float uA[N]; uniform float uB[N]; uniform float uMix; uniform float uT; varying vec3 vW; varying vec2 vUv;
      const float CLIMB = ${CLIMB.toFixed(4)}; const float ROLL = ${ROLL_M.toFixed(1)};
      float dist(float x, float z){
        if (x <= 0.0) { float dx = x < -ROLL ? x + ROLL : 0.0; return length(vec3(dx, z, 12.0)); }
        float k = 1.0 / sqrt(1.0 + CLIMB * CLIMB); float al = x * k;
        return length(vec3(x - al * k, al * CLIMB * k, z));
      }
      float lookup(float d, bool b){
        float x = clamp(log(max(30.0, d) / 30.0) / log(10.0) / 3.0 * float(N - 1), 0.0, float(N - 1) - 0.001);
        int i = int(floor(x)); float f = x - float(i);
        float a0 = 0.0, a1 = 0.0;
        for (int k = 0; k < N; k++) { if (k == i) { a0 = b ? uB[k] : uA[k]; } if (k == i + 1) { a1 = b ? uB[k] : uA[k]; } }
        return mix(a0, a1, f);
      }
      vec3 band(float L){
        if (L >= 85.0) return vec3(1.0, 0.29, 0.23);
        if (L >= 75.0) return vec3(1.0, 0.54, 0.23);
        if (L >= 65.0) return vec3(1.0, 0.77, 0.34);
        return vec3(0.62, 0.53, 1.0);
      }
      void main(){
        float d = dist(vW.x * ${U.toFixed(1)}, vW.z * ${U.toFixed(1)});
        float L = mix(lookup(d, false), lookup(d, true), uMix);
        if (L < 55.0) discard;
        vec3 c = band(L);
        float a = L >= 65.0 ? 0.16 + 0.1 * smoothstep(65.0, 95.0, L) : 0.06 * smoothstep(55.0, 64.0, L);
        // contour lines every 10 dB
        float fw = fwidth(L) * 1.2;
        float ln = smoothstep(fw, 0.0, abs(mod(L + 5.0, 10.0) - 5.0));
        a += ln * 0.65;
        c = mix(c, vec3(1.0), ln * 0.3);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
        gl_FragColor = vec4(c * (1.0 + ln), a * edge);
      }`,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useRef<Mode>(mode);
  useEffect(() => {
    // fade from the old footprint to the new one
    const u = mat.uniforms;
    u.uA.value = tables[prev.current]; u.uB.value = tables[mode]; u.uMix.value = 0;
    prev.current = mode;
  }, [mode, tables, mat]);
  useFrame((_s, dt) => { mat.uniforms.uMix.value = Math.min(1, mat.uniforms.uMix.value + dt * 1.6); });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[50, 0.02, 0]} material={mat} renderOrder={2}>
      <planeGeometry args={[200, 140, 1, 1]} />
    </mesh>
  );
}

function Homes({ homes, lit }: { homes: [number, number][]; lit: boolean[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    homes.forEach(([x, z], i) => {
      const h = 0.08 + ((i * 37) % 7) * 0.012;
      m.makeScale(0.16, h, 0.16); m.setPosition(x, h / 2, z);
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, lit[i] ? c.set("#ffb15a").multiplyScalar(2.2) : c.set("#2a2c44"));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [homes, lit]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, homes.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Runway() {
  const lights = useMemo(() => {
    const p: number[] = [];
    for (let x = -ROLL_M / U - 4; x <= 3; x += 0.6) { p.push(x, 0.03, 0.3, x, 0.03, -0.3); }
    return new Float32Array(p);
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[-ROLL_M / U / 2 - 0.5, 0.01, 0]}>
        <planeGeometry args={[ROLL_M / U + 7, 0.6]} />
        <meshStandardMaterial color="#14151c" roughness={0.9} />
      </mesh>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[lights, 3]} /></bufferGeometry>
        <pointsMaterial color={[3, 2.6, 1.6]} size={0.12} sizeAttenuation toneMapped={false} />
      </points>
    </group>
  );
}

/** The aircraft flies the path on a loop; reports its position for the fly-over sound. */
function Flight({ nozzle, posRef }: { nozzle: Nozzle; posRef: React.MutableRefObject<THREE.Vector3> }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const T = 18, p = (clock.elapsedTime % T) / T;
    let x: number, y: number;
    if (p < 0.25) { const q = p / 0.25; x = -ROLL_M / U + (ROLL_M / U) * q * q; y = 0.25; }
    else { const q = (p - 0.25) / 0.75; x = q * 140; y = 0.25 + x * CLIMB; }
    g.current.position.set(x, y, 0);
    g.current.rotation.z = p < 0.25 ? 0 : Math.atan(CLIMB) * 1.6;
    posRef.current.set(x * U, y * U, 0);
  });
  return (
    <group ref={g}>
      <group rotation-y={Math.PI / 2} scale={2.9}>
        <Jetliner count={nozzle.count} pen={nozzle.pen} shape={nozzle.shape} />
      </group>
    </group>
  );
}

export default function Footprint() {
  const [mode, setMode] = useState<Mode>("plain");
  const [hx, setHx] = useState(4.5);   // km past lift-off
  const [hz, setHz] = useState(1.2);   // km to the side
  const tables = useMemo(() => ({ plain: levelTable(MODES.plain.n), chevron: levelTable(MODES.chevron.n), owl: levelTable(MODES.owl.n) }), []);
  const homes = useMemo(makeHomes, []);
  const levels = useMemo(() => {
    const out = {} as Record<Mode, number[]>;
    (Object.keys(MODES) as Mode[]).forEach((m) => { out[m] = homes.map(([x, z]) => levelAt(tables[m], distToPath(x * U, z * U))); });
    return out;
  }, [homes, tables]);
  const lit = useMemo(() => levels[mode].map((l) => l >= THRESH), [levels, mode]);
  const woken = (m: Mode) => levels[m].filter((l) => l >= THRESH).length;
  const area = useMemo(() => {
    const out = {} as Record<Mode, number>;
    (Object.keys(MODES) as Mode[]).forEach((m) => {
      let n = 0;
      for (let x = -60; x < 300; x += 0.5) for (let z = -80; z < 80; z += 0.5) if (levelAt(tables[m], distToPath(x * U, z * U)) >= THRESH) n++;
      out[m] = (n * 0.25 * U * U) / 1e6;
    });
    return out;
  }, [tables]);
  const houseL = levelAt(tables[mode], distToPath(hx * 1000, hz * 1000));
  const plainL = levelAt(tables.plain, distToPath(hx * 1000, hz * 1000));

  // the fly-over, heard at your house: level follows the aircraft's distance and angle
  const plane = useRef(new THREE.Vector3());
  const { voice, on } = useVoice({ ref: 92, unit: "dBA" });
  const nz = MODES[mode].n;
  useEffect(() => {
    if (!voice) return;
    const id = setInterval(() => {
      const p = plane.current, h = new THREE.Vector3(hx * 1000, 0, hz * 1000);
      const rel = h.clone().sub(p), d = Math.max(30, rel.length());
      const fwd = new THREE.Vector3(1, CLIMB, 0).normalize();
      const theta = (Math.acos(Math.max(-1, Math.min(1, rel.dot(fwd) / d))) * 180) / Math.PI;
      const b = jetBands(TAKEOFF, nz, d, theta).map((x) => x + TWIN_CAL_DB);
      voice.setSpectrum(b, dbaOf(b));
    }, 90);
    return () => clearInterval(id);
  }, [voice, on, nz, hx, hz]);

  return (
    <div className="split">
      <Plate n="I·1" title="A night take-off over a town" note="aircraft drawn 5× larger · flight time-lapsed">
        <Stage3D label="Map of a take-off noise footprint over a town at night" camera={{ position: [-34, 42, 70], fov: 34, far: 5000 }} look={{ bloom: 1.1, threshold: 0.6 }}
          overlay={<>
            <CellTag>Cell I · runway 27 · night departure</CellTag>
            <div className="hud tag hud-bl" style={{ display: "grid", gap: 4 }}>
              <span className="k">loudest level heard</span>
              {[["#ff4a3a", "85+ dBA"], ["#ff8a3a", "75–85"], ["#ffc457", "65–75"], ["#9d86ff", "55–65"]].map(([c, l]) => <span key={l}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: c, marginRight: 8, verticalAlign: -1 }} />{l}</span>)}
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#ffb15a", marginRight: 8, boxShadow: "0 0 8px #ffb15a" }} />home above 65 dBA</span>
            </div>
          </>}>
          <Stars radius={600} depth={200} count={2500} factor={8} fade speed={0.3} />
          <mesh rotation-x={-Math.PI / 2} position={[50, 0, 0]} receiveShadow>
            <planeGeometry args={[400, 300]} />
            <meshStandardMaterial color="#090a10" roughness={1} />
          </mesh>
          <Ground tables={tables} mode={mode} />
          <Runway />
          <Homes homes={homes} lit={lit} />
          <Flight nozzle={nz} posRef={plane} />
          {/* your house */}
          <group position={[hx * 10, 0, hz * 10]}>
            <mesh position-y={2}><cylinderGeometry args={[0.06, 0.06, 4, 8]} /><meshBasicMaterial color={[0.4, 3, 2.6]} toneMapped={false} /></mesh>
            <mesh position-y={4.1}><sphereGeometry args={[0.35, 16, 16]} /><meshBasicMaterial color={[0.4, 3, 2.6]} toneMapped={false} /></mesh>
            <Label3D position={[0, 4.8, 0]} color="#5eead0" size={4}>{`YOUR HOUSE · ${fmt(houseL)} dBA`}</Label3D>
          </group>
          <Label3D position={[-14, 1.5, -4]} color="#ecebf4" size={3.5} dim>RUNWAY</Label3D>
          <OrbitControls makeDefault target={[42, 0, 0]} enablePan={false} minDistance={20} maxDistance={220} maxPolarAngle={Math.PI * 0.46} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>The problem.</strong> Hot exhaust from a jet engine mixes violently with the cold air around it. The roar spreads for kilometres, breaks airport rules and keeps whole towns awake.</p>
          <p>The coloured carpet is the loudest sound each spot on the ground hears as the jet climbs out. Homes that light up hear more than <b className="warn">{THRESH} dBA</b>.</p>
        </div>
        <Seg options={(Object.keys(MODES) as Mode[]).map((m) => [m, MODES[m].name])} value={mode} onChange={setMode} label="Nozzle" />
        <Readouts items={[
          ["Homes above 65 dBA", fmt(woken(mode)), "", mode === "plain" ? "hot" : "cool"],
          ["65 dBA area", fmt(area[mode], 1), "km²"],
          ["At your house", fmt(houseL, 1), "dBA", "acc"],
          ["Change", (houseL - plainL <= 0 ? "" : "+") + fmt(houseL - plainL, 1), "dB", houseL < plainL ? "cool" : undefined],
        ]} />
        <div className="panel" style={{ display: "grid", gap: 10 }}>
          <Range label="Your house: distance past lift-off" value={hx} min={0.5} max={13} step={0.1} onChange={setHx} fmt={(v) => fmt(v, 1) + " km"} />
          <Range label="…and to the side of the flight path" value={hz} min={-5} max={5} step={0.1} onChange={setHz} fmt={(v) => fmt(Math.abs(v), 1) + " km"} />
          <SoundCue label="Hear the fly-over from your house" />
        </div>
        <p className="faint" style={{ fontSize: 13 }}>
          Chevrons take {fmt(woken("plain") - woken("chevron"))} homes ({fmt((1 - woken("chevron") / woken("plain")) * 100)}%) out of the {THRESH} dBA zone. A few dB is a lot: every 3 dB halves the sound energy, so the footprint shrinks much faster than the number suggests.
        </p>
      </div>
      <Notes say="Every orange light is a home that hears more than 65 dBA when this plane takes off. Now watch what a ring of metal teeth on the engine does." show="Switch Plain → Chevrons → Owl dual-scale. Drag your house under the flight path and turn the sound on." ask="Why does the footprint stretch so far along the runway but not sideways?" />
    </div>
  );
}
