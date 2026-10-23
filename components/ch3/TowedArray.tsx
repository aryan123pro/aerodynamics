"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Submarine, { SoundRings } from "@/components/three/Submarine";
import { Analyser, CellTag, Notes, Plate, Readouts, SoundCue, useVoice } from "@/components/ui";
import { BANDS } from "@/lib/audio";
import { hump } from "@/lib/jet";
import { ARRAY_DESIGNS, pctToDb, type ArrayDesign } from "@/lib/riblet";
import { CYAN, HUSH, ROAR, fmt } from "@/lib/plot";

/* A quieter sonar. A submarine tows a long sonar array (a hose full of hydrophones). Dragging it through
   the water makes its own flow noise, which drowns out the faint sound of a distant ship. Wei et al.
   (2025) simulated riblets on the array's skin; the deck's table gives their results for five designs.
   What you hear: the array's self-noise (broadband hiss with tones at 250 and 750 Hz), reduced exactly
   as the paper reports where it reports a value, and a faint contact at ~420 Hz that you are trying
   to hear. Values the paper did not report are played unchanged and marked "n/r".                    */

const SELF = 78, CONTACT = 66;
function selfNoise(d: ArrayDesign) {
  const all = d.noise ?? 0;
  return BANDS.map((f) => SELF + all + hump(f, 350, 1.3, 1.2));
}

function ArrayHose({ design }: { design: ArrayDesign }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -4.1), new THREE.Vector3(0.4, -0.6, -6.5), new THREE.Vector3(0.9, -1.2, -9.5), new THREE.Vector3(1.2, -1.45, -13), new THREE.Vector3(1.3, -1.55, -17),
  ]), []);
  const cable = useMemo(() => new THREE.TubeGeometry(curve, 120, 0.02, 8, false), [curve]);
  const hose = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(60).slice(24)), 200, 0.075, 24, false), [curve]);
  const uni = useMemo(() => ({ uRib: { value: 0 }, uSp: { value: 1 } }), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: "#d9d36a", roughness: 0.45, clearcoat: 0.4 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uRib, uSp;").replace("#include <color_fragment>", `#include <color_fragment>
        float ring = smoothstep(0.92, 0.97, fract(vUv.x * 18.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.1, 0.12), ring);
        float rib = 0.5 + 0.5 * sin(vUv.y * 6.2832 * 46.0 / uSp);
        diffuseColor.rgb *= 1.0 - uRib * 0.45 * rib;`);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uRib, uSp;");
    };
    m.defines = { USE_UV: "" };
    return m;
  }, [uni]);
  useEffect(() => { uni.uRib.value = design.id === "smooth" ? 0 : 1; uni.uSp.value = design.spacing || 1; }, [design, uni]);
  useEffect(() => () => { cable.dispose(); hose.dispose(); mat.dispose(); }, [cable, hose, mat]);
  return (
    <group>
      <mesh geometry={cable}><meshStandardMaterial color="#2a2d36" roughness={0.6} /></mesh>
      <mesh geometry={hose} material={mat} castShadow />
    </group>
  );
}

/** Turbulent flow noise around the array: busy for a smooth skin, calmer with good riblets. */
function FlowAround({ level }: { level: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uL: { value: 1 }, uPx: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute vec3 aR; uniform float uT, uL, uPx; varying float vA;
      void main(){
        float age = fract(uT * 0.25 + aR.x);
        float s = aR.y;  // along the array, 0..1
        vec3 base = mix(vec3(0.75, -1.0, -8.5), vec3(1.3, -1.55, -17.0), s);
        float th = aR.z * 6.2832 + uT * (3.0 + uL * 6.0);
        float r = 0.1 + 0.12 * age + uL * 0.08 * sin(th * 3.0 + uT * 9.0);
        vec3 p = base + vec3(r * cos(th), r * sin(th), -age * 1.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.03 * uPx / max(0.3, -mv.z), 1.0, 6.0);
        vA = (0.15 + 0.6 * uL) * (1.0 - age);
      }`,
    fragmentShader: `uniform float uL; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c)*10.0) * vA; if (a < 0.01) discard; gl_FragColor = vec4(mix(vec3(0.37,0.92,0.82), vec3(1.0,0.42,0.29), uL) * a, a); }`,
  }), []);
  const geo = useMemo(() => {
    const n = 5000, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([Math.random(), Math.random(), Math.random()], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("aR", new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => { const u = mat.uniforms; u.uT.value += dt; u.uL.value += (level - u.uL.value) * Math.min(1, dt * 2); u.uPx.value = st.size.height; });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function DistantShip() {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { g.current.position.y = 4.2 + Math.sin(clock.elapsedTime) * 0.05; });
  return (
    <group ref={g} position={[-9, 4.2, -14]}>
      <mesh><boxGeometry args={[0.7, 0.25, 3]} /><meshStandardMaterial color="#3b4252" /></mesh>
      <mesh position={[0, 0.3, 0.3]}><boxGeometry args={[0.5, 0.4, 0.9]} /><meshStandardMaterial color="#4b5263" /></mesh>
    </group>
  );
}

export default function TowedArray() {
  const [id, setId] = useState("smooth");
  const d = ARRAY_DESIGNS.find((x) => x.id === id) || ARRAY_DESIGNS[0];
  const base = ARRAY_DESIGNS[0];
  const noise = useMemo(() => selfNoise(d), [d]);
  const noise0 = useMemo(() => selfNoise(base), [base]);
  const t250 = SELF + 6 + pctToDb(d.p250), t750 = SELF + 2 + pctToDb(d.p750);
  // can the array hear the contact? compare it with the self-noise in its octave (500 Hz band)
  const snr = CONTACT - Math.max(noise[4], d.p750 == null ? t750 - 8 : -200);
  const heard = snr > -3;
  const { voice, on } = useVoice({ ref: 92, unit: "dB", lowpass: 6000 });
  useEffect(() => {
    if (!voice) return;
    voice.setSpectrum(noise, SELF + (d.noise ?? 0));
    voice.setTone("t250", 250, t250); voice.setTone("t750", 750, t750);
    voice.setTone("contact", 420, CONTACT, "triangle"); voice.setTone("contact2", 840, CONTACT - 8);
    voice.setFlutter(0.5, 0.15);
  }, [voice, on, noise, t250, t750, d.noise]);

  const level = d.noise == null ? 0.75 : Math.max(0.1, 1 + d.noise / 10);

  return (
    <div className="split">
      <Plate n="III·4" title="A submarine towing its sonar array" note="drag to turn · scroll to zoom">
        <Stage3D label="A submarine towing a long sonar array with riblets on its skin, listening for a distant ship" camera={{ position: [10, 3.2, 3.5], fov: 40 }} background="radial-gradient(ellipse 90% 80% at 50% 0%, #0b4566, #010a12 75%)" look={{ bloom: 0.6 }}
          overlay={<>
            <CellTag>Cell III · towed array · {d.name}</CellTag>
            <div className="hud tag hud-tr"><span className="k">distant ship</span><span className="big" style={{ color: heard ? HUSH : ROAR, fontSize: "1.2rem" }}>{heard ? "HEARD" : "LOST IN NOISE"}</span><span className="k">signal vs self-noise</span><span className="big">{snr > 0 ? "+" : ""}{fmt(snr, 1)}<small>dB</small></span></div>
          </>}>
          <fog attach="fog" args={["#03192a", 8, 32]} />
          <group scale={8}><Submarine prop={1} riblets={false} /></group>
          <ArrayHose design={d} />
          <FlowAround level={level} />
          <DistantShip />
          <SoundRings position={[-9, 4, -14]} color={CYAN} level={0.9} rate={0.35} max={2.4} />
          <Label3D position={[1.6, -0.5, -12]} color="#e8e07a" size={0.4}>{d.id === "smooth" ? "ARRAY · smooth skin" : `ARRAY · riblet skin (${d.name})`}</Label3D>
          <Label3D position={[-9, 5.4, -14]} color={CYAN} size={0.4}>THE SHIP YOU ARE LISTENING FOR</Label3D>
          <OrbitControls makeDefault target={[-0.5, -0.4, -6.5]} enablePan={false} minDistance={4} maxDistance={26} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>The problem:</strong> submarines and ships tow sonar arrays to listen underwater. Dragging them fast makes flow noise that drowns out what they are listening for. <strong>The idea:</strong> put shark-skin riblets on the array (inspired by owl serrations too). <strong>Method:</strong> computer simulation, not a sea trial.</p>
        </div>
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Design</th><th>Noise</th><th>Drag</th><th>250 Hz</th><th>750 Hz</th></tr></thead>
            <tbody>
              {ARRAY_DESIGNS.map((x) => (
                <tr key={x.id} className={"clickable" + (x.id === id ? " sel" : "")} onClick={() => setId(x.id)}>
                  <td><span style={{ color: x.color }}>●</span> {x.name}</td>
                  <td className="n">{x.noise == null ? "n/r" : x.noise === 0 ? "0" : x.noise + " dB"}</td>
                  <td className={"n " + (x.drag != null && x.drag < 0 ? "good" : x.drag ? "bad" : "")}>{x.drag == null ? "n/r" : (x.drag > 0 ? "+" : "") + x.drag + "%"}</td>
                  <td className="n">{x.p250 == null ? "n/r" : x.p250 + "%"}</td>
                  <td className="n">{x.p750 == null ? "n/r" : x.p750 + "%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ fontSize: 12.5, marginTop: -4 }}>{d.known}. Source: Wei et al. 2025, Bioinspiration &amp; Biomimetics 20, 066002 (deck slide 34). n/r: not reported in the paper&apos;s text.</p>
        <Analyser y={[40, 95]} ylabel="dB (array self-noise)" curves={[
          { label: "smooth array", color: ROAR, bands: noise0.map((v, i) => v + (i === 3 ? 6 : i === 5 ? 2 : 0)) },
          { label: d.name, color: d.color, bands: noise.map((v, i) => (i === 3 ? 10 * Math.log10(10 ** (v / 10) + 10 ** (t250 / 10)) : i === 5 ? 10 * Math.log10(10 ** (v / 10) + 10 ** (t750 / 10)) : v)) },
        ]} />
        <Readouts items={[
          ["Overall noise", d.noise == null ? "n/r" : fmt(d.noise, 2), d.noise == null ? "" : "dB", d.noise ? "cool" : undefined],
          ["Drag", d.drag == null ? "n/r" : (d.drag > 0 ? "+" : "") + fmt(d.drag, 2), d.drag == null ? "" : "%", d.drag != null && d.drag < 0 ? "cool" : d.drag ? "hot" : undefined],
          ["Rectangular best", "−14.3", "% noise", "acc"],
        ]} />
        <SoundCue label="Listen on the array" />
      </div>
      <Notes say="Listen for the faint hum of the distant ship. On a smooth array it hides under the hiss. Design 17 makes the array 8.8 dB quieter, and the hum comes through." show="Click Smooth, then Design 17, then Design 40." ask="Design 17 is quietest but adds 7% drag; Design 40 cuts drag but its noise wasn't reported. Which would you fit, and for what mission?" />
    </div>
  );
}
