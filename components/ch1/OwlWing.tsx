"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { Analyser, CellTag, Notes, Plate, Range, Readouts, Seg, SoundCue, Toggles, useVoice } from "@/components/ui";
import { dbaOf } from "@/lib/audio";
import { HEARING, OWL_OFF, wingBands, wingNoise, type Owl } from "@/lib/jet";
import { AMBER, CYAN, HUSH, ROAR, fmt } from "@/lib/plot";

/* The silent wing. A slice of wing in a smoke tunnel, chord 1 unit, air flowing towards +x.
   The owl's three features (deck slide 3) are real geometry you can switch on and off:
     comb   – stiff serrations on the leading edge that comb the oncoming air
     velvet – soft down on the upper surface that damps the near-wall turbulence
     fringe – a soft, porous fringe on the trailing edge that lets pressure leak gently across it
   The smoke: without the fringe the wake rolls up into big, regular vortices (a strong, tonal source);
   with it the wake breaks into small, weak eddies. The spectrum and the sound come from lib/jet.ts.  */

const AOA = 0.1;
const camber = (x: number) => 0.07 * (1 - 4 * x * x);
const thick = (x: number) => { const u = x + 0.5; return 0.13 * (1.4845 * Math.sqrt(Math.max(0, u)) - 0.63 * u - 1.758 * u * u + 1.4215 * u * u * u - 0.5075 * u ** 4); };
const upper = (x: number) => camber(x) + thick(x) / 2;
const SPAN = 3;

function featherTexture(owl: boolean) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = owl ? "#d8b07a" : "#7d8494"; g.fillRect(0, 0, 512, 512);
  // overlapping feathers: shafts along the chord, barbs angled back, barn-owl barring
  for (let row = 0; row < 9; row++) for (let k = 0; k < 7; k++) {
    const x0 = k * 80 + (row % 2) * 40 - 20, y0 = row * 60;
    g.save(); g.translate(x0, y0);
    g.fillStyle = owl ? (k + row) % 3 ? "#e3c08c" : "#cfa064" : (k + row) % 3 ? "#8a91a2" : "#6f7686";
    g.beginPath(); g.ellipse(38, 30, 36, 46, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = owl ? "rgba(90,60,30,.35)" : "rgba(30,34,45,.35)"; g.lineWidth = 1;
    for (let b = -30; b < 40; b += 3) { g.beginPath(); g.moveTo(38, 30 + b * 0.6); g.lineTo(6, 30 + b * 0.6 + 14); g.moveTo(38, 30 + b * 0.6); g.lineTo(70, 30 + b * 0.6 + 14); g.stroke(); }
    g.strokeStyle = owl ? "rgba(255,245,225,.6)" : "rgba(220,225,235,.4)"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(38, -14); g.lineTo(38, 74); g.stroke();
    if (owl) { g.fillStyle = "rgba(95,70,45,.28)"; for (let s = 0; s < 3; s++) g.fillRect(8, 10 + s * 22, 60, 6); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function Wing({ owl, look }: { owl: Owl; look: "owl" | "pigeon" }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const N = 60;
    for (let i = 0; i <= N; i++) { const x = 0.5 - i / N; s[i ? "lineTo" : "moveTo"](x, camber(x) + thick(x) / 2); }
    for (let i = 1; i < N; i++) { const x = -0.5 + i / N; s.lineTo(x, camber(x) - thick(x) / 2); }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: SPAN, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -SPAN / 2);
    // map the texture by chord and span so feathers run along the chord
    const p = g.getAttribute("position"), uv = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.5) * 1.6, (p.getZ(i) + SPAN / 2) * 1.1);
    uv.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);
  const tex = useMemo(() => ({ owl: featherTexture(true), pigeon: featherTexture(false) }), []);
  useEffect(() => () => { geo.dispose(); tex.owl.dispose(); tex.pigeon.dispose(); }, [geo, tex]);

  // comb: stiff hooks along the leading edge, pointing into the wind
  const comb = useRef<THREE.InstancedMesh>(null!);
  const fringe = useRef<THREE.InstancedMesh>(null!);
  const NC = 90, NF = 170;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < NC; i++) {
      const z = -SPAN / 2 + (i + 0.5) * (SPAN / NC);
      e.set(0, 0, Math.PI / 2 - 0.35 + Math.sin(i * 7.1) * 0.08); q.setFromEuler(e);
      m.compose(new THREE.Vector3(-0.525, camber(-0.5) + 0.018, z), q, new THREE.Vector3(1, 1 + 0.25 * Math.sin(i * 3.3), 1));
      comb.current.setMatrixAt(i, m);
    }
    comb.current.instanceMatrix.needsUpdate = true;
  }, []);
  const velvet = useMemo(() => {
    const n = 7000, p = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const x = -0.42 + Math.random() * 0.86, z = -SPAN / 2 + Math.random() * SPAN, y = upper(x);
      const l = 0.008 + Math.random() * 0.012, a = (Math.random() - 0.3) * 0.9;
      p.set([x, y, z, x + Math.sin(a) * l, y + Math.cos(a) * l, z + (Math.random() - 0.5) * 0.006], i * 6);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  useFrame(({ clock }) => {
    if (!fringe.current) return;
    const t = clock.elapsedTime;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < NF; i++) {
      const z = -SPAN / 2 + (i + 0.5) * (SPAN / NF);
      // soft filaments that flutter in the wake, each on its own
      e.set(0, 0, -Math.PI / 2 - 0.08 + Math.sin(t * 17 + i * 1.7) * 0.18 + Math.sin(t * 5.3 + i * 0.37) * 0.08); q.setFromEuler(e);
      m.compose(new THREE.Vector3(0.5 + 0.05 * Math.cos(e.z + Math.PI / 2), camber(0.5) + 0.002 + 0.05 * Math.sin(e.z + Math.PI / 2), z), q, new THREE.Vector3(1, 0.8 + 0.4 * Math.abs(Math.sin(i * 2.7)), 1));
      fringe.current.setMatrixAt(i, m);
    }
    fringe.current.instanceMatrix.needsUpdate = true;
  });
  const isOwl = look === "owl";
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial map={isOwl ? tex.owl : tex.pigeon} roughness={isOwl ? 0.95 : 0.6} sheen={isOwl ? 1 : 0.2} sheenColor={isOwl ? "#fff1d6" : "#cfd6e6"} sheenRoughness={0.6} />
      </mesh>
      <instancedMesh ref={comb} args={[undefined, undefined, NC]} visible={owl.comb} castShadow>
        <coneGeometry args={[0.005, 0.06, 5]} />
        <meshStandardMaterial color="#efd2a0" roughness={0.6} />
      </instancedMesh>
      <lineSegments geometry={velvet} visible={owl.velvet}>
        <lineBasicMaterial color="#fff2da" transparent opacity={0.55} />
      </lineSegments>
      <instancedMesh ref={fringe} args={[undefined, undefined, NF]} visible={owl.fringe}>
        <cylinderGeometry args={[0.0018, 0.0006, 0.11, 3, 1]} />
        <meshStandardMaterial color="#f2dcb4" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/* Smoke over the wing: GPU particles whose path is a function of age. */
function Smoke({ owl, speed }: { owl: Owl; speed: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uFringe: { value: 0 }, uComb: { value: 0 }, uVelvet: { value: 0 }, uPx: { value: 400 }, uHot: { value: new THREE.Color(ROAR) }, uCool: { value: new THREE.Color(HUSH) } },
    vertexShader: /* glsl */ `
      attribute vec3 aR; // seed, span z, start height
      uniform float uT, uFringe, uComb, uVelvet, uPx; varying float vA; varying float vTurb;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      float camber(float x){ return 0.07 * (1.0 - 4.0 * x * x); }
      float thick(float x){ float u = clamp(x + 0.5, 0.0, 1.0); return 0.13 * (1.4845 * sqrt(u) - 0.63 * u - 1.758 * u * u + 1.4215 * u * u * u - 0.5075 * u * u * u * u); }
      void main(){
        float seed = aR.x, z = aR.y, y0 = aR.z;
        float age = fract(uT * 0.22 + seed);
        float x = -1.6 + age * 4.2;
        float side = sign(y0 + 1e-4);
        float onWing = step(-0.5, x) * step(x, 0.5);
        float near = exp(-abs(y0) * 9.0);
        float y = y0;
        // flow round the section: lifted by the camber, pushed out by the thickness
        float xc = clamp(x, -0.5, 0.5);
        y += (camber(xc) + side * thick(xc) * 0.5) * near * smoothstep(-0.9, -0.5, x) * (1.0 - smoothstep(0.5, 1.6, x) * 0.6);
        float turb = 0.0;
        // without the comb: a separation bubble near the leading edge on the upper side
        float bubble = (1.0 - uComb) * step(0.0, y0) * near * smoothstep(-0.48, -0.35, x) * (1.0 - smoothstep(-0.1, 0.15, x));
        y += bubble * (0.02 + 0.015 * sin(x * 60.0 - uT * 30.0 + z * 9.0));
        turb += bubble;
        // without velvet: jittery near-wall turbulence on the upper surface
        float wall = (1.0 - uVelvet) * onWing * step(0.0, y0) * exp(-abs(y0) * 22.0);
        y += wall * 0.012 * (h(seed * 31.0 + floor(uT * 30.0)) - 0.5);
        turb += wall * 0.6;
        // the wake: big rolled-up vortices, or small broken eddies with the fringe
        float wk = smoothstep(0.45, 0.7, x) * exp(-abs(y0) * 7.0);
        float big = (1.0 - uFringe);
        float ph = (x - 0.5) * 9.0 - uT * 16.0;
        y += wk * big * 0.07 * sin(ph) * (1.0 + (x - 0.5) * 0.4);
        x += wk * big * 0.05 * cos(ph);
        y += wk * uFringe * 0.018 * sin((x - 0.5) * 42.0 - uT * 40.0 + z * 25.0 + seed * 6.0);
        turb += wk * (big * 1.0 + uFringe * 0.2);
        vec3 p = vec3(x, y, z);
        // the whole tunnel is tilted with the wing
        float c = cos(-${AOA.toFixed(3)}), s = sin(-${AOA.toFixed(3)});
        p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.032 * uPx / max(0.2, -mv.z), 1.5, 14.0);
        vA = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(0.8, 1.0, age));
        vTurb = clamp(turb, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHot, uCool; varying float vA; varying float vTurb;
      void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 10.0) * vA * 0.9; if (a < 0.01) discard;
        vec3 col = mix(vec3(0.82, 0.84, 0.95), uHot, vTurb); gl_FragColor = vec4(col * a, a); }`,
  }), []);
  const geo = useMemo(() => {
    const n = 16000, p = new Float32Array(n * 3), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // rakes of smoke at a few heights, denser close to the wing
      const lane = Math.floor(Math.random() * 15) - 7;
      a.set([Math.random(), -SPAN / 2 + 0.1 + Math.floor(Math.random() * 9) * ((SPAN - 0.2) / 8), lane * 0.035 + (Math.random() - 0.5) * 0.006], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => {
    const u = mat.uniforms;
    u.uT.value += dt * (speed / 6);
    const k = Math.min(1, dt * 4);
    u.uFringe.value += ((owl.fringe ? 1 : 0) - u.uFringe.value) * k;
    u.uComb.value += ((owl.comb ? 1 : 0) - u.uComb.value) * k;
    u.uVelvet.value += ((owl.velvet ? 1 : 0) - u.uVelvet.value) * k;
    u.uPx.value = st.size.height;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export default function OwlWing() {
  const [owl, setOwl] = useState<Owl>({ comb: true, velvet: true, fringe: true });
  const [u, setU] = useState(6);
  const look = owl.comb || owl.velvet || owl.fringe ? "owl" : "pigeon";
  const bOwl = useMemo(() => wingBands(u, owl), [u, owl]);
  const bPlain = useMemo(() => wingBands(u, OWL_OFF), [u]);
  const dOwl = dbaOf(bOwl), dPlain = dbaOf(bPlain);
  const hf = (b: number[]) => 10 * Math.log10(b.slice(6).reduce((s, l) => s + Math.pow(10, l / 10), 0));
  const { voice, on } = useVoice({ ref: 66, unit: "dBA" });
  useEffect(() => {
    if (!voice) return;
    voice.setSpectrum(bOwl, dOwl);
    voice.setFlutter(look === "owl" ? 2.6 : 6.5, 0.7);
  }, [voice, on, bOwl, dOwl, look]);
  const preset = (o: Owl) => setOwl(o);

  return (
    <div className="split">
      <Plate n="I·2" title="A slice of wing in a smoke tunnel" note="drag to turn · scroll to zoom">
        <Stage3D label="A wing section with owl leading-edge comb, velvet and trailing-edge fringe, in a smoke stream" camera={{ position: [0.9, 0.75, 3.9], fov: 32 }} look={{ bloom: 0.6 }}
          overlay={<>
            <CellTag>Cell I · smoke tunnel · {fmt(u)} m/s</CellTag>
            <div className="hud tag hud-tr"><span className="k">wing noise at 1 m</span><span className="big" style={{ color: look === "owl" ? HUSH : ROAR }}>{fmt(dOwl)}<small>dBA</small></span><span className="k">above 1.6 kHz</span><span className="big">{(hf(bOwl) - hf(bPlain)).toFixed(1)}<small>dB</small></span></div>
            <div className="strip">
              <Seg options={[["owl", "Barn owl"], ["pigeon", "Pigeon"]]} value={look} onChange={(v) => preset(v === "owl" ? { comb: true, velvet: true, fringe: true } : OWL_OFF)} label="Bird" />
              <Toggles items={[["comb", "Comb"], ["velvet", "Velvet"], ["fringe", "Fringe"]]} value={owl} onChange={setOwl} label="Owl features" />
              <Range label="Flight speed" value={u} min={2} max={12} step={0.5} onChange={setU} fmt={(v) => v + " m/s"} />
            </div>
          </>}>
          <group rotation-z={AOA} position={[0, 0.05, 0]}>
            <Wing owl={owl} look={look} />
          </group>
          <Smoke owl={owl} speed={u} />
          <Label3D position={[-0.75, 0.36, 1.2]} to={[-0.52, 0.06, 1.2]} color={AMBER} size={0.11}>COMB · leading edge</Label3D>
          <Label3D position={[-0.05, 0.42, 1.0]} to={[-0.05, 0.13, 1.0]} color="#fff2da" size={0.11}>VELVET · upper surface</Label3D>
          <Label3D position={[0.85, 0.3, 1.25]} to={[0.56, 0.03, 1.2]} color={CYAN} size={0.11}>FRINGE · trailing edge</Label3D>
          <Label3D position={[1.45, -0.3, -1.4]} color={look === "owl" ? HUSH : ROAR} size={0.12}>{owl.fringe ? "SMALL, WEAK EDDIES" : "BIG ROLLING VORTICES"}</Label3D>
          <OrbitControls makeDefault target={[0.25, 0.02, 0.4]} enablePan={false} minDistance={1.2} maxDistance={6} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>A barn owl hunts by ear,</strong> and so does its prey. Its feathers hide the sound of its own wings in exactly the range both of them hear best.</p>
          <p>Switch the three features off one by one. The smoke behind the plain edge rolls into big, regular vortices: a loud, organised source. The fringe breaks them into small, random eddies.</p>
        </div>
        <Analyser y={[-10, 60]} ylabel="dB at 1 m" bands={[
          { lo: HEARING.owl.best[0], hi: HEARING.owl.best[1], color: "rgba(244,184,96,.08)", label: "owl hears best" },
          { lo: HEARING.mouse.best[0], hi: 16000, color: "rgba(85,212,255,.07)", label: "mouse hears best" },
        ]} curves={[
          { label: "pigeon-like wing", color: ROAR, fn: (f) => wingNoise(f, u, OWL_OFF) - 22 },
          { label: "this wing", color: look === "owl" ? HUSH : AMBER, fn: (f) => wingNoise(f, u, owl) - 22 },
        ]} />
        <Readouts items={[
          ["This wing", fmt(dOwl, 1), "dBA", look === "owl" ? "cool" : "hot"],
          ["Pigeon-like", fmt(dPlain, 1), "dBA"],
          ["Difference", (dOwl - dPlain).toFixed(1), "dB", "acc"],
        ]} />
        <SoundCue label="Hear the wingbeats" />
        <p className="faint" style={{ fontSize: 13 }}>Model: a plain trailing edge scales as U⁵, a porous elastic fringe as U⁶ (Jaworski &amp; Peake 2013), so the owl gains most when it flies slowly. Its features cut noise above about 1.6 kHz, up to ~18 dB (deck; Neuhaus et al. 1973).</p>
      </div>
      <Notes say="The owl doesn't just make less noise; it removes it exactly where the mouse's ears, and its own ears, are most sensitive." show="Turn off the fringe first: watch the wake roll up. Then the comb: a bubble forms at the front." ask="Why might slow flight make the owl even quieter? (Look at the U⁶ scaling.)" />
    </div>
  );
}
