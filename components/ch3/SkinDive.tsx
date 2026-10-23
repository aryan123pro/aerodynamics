"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import DenticlePatch from "@/components/three/Denticles";
import Label3D from "@/components/three/Label3D";
import Shark from "@/components/three/Shark";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate } from "@/components/ui";
import { CYAN, HUSH } from "@/lib/plot";

/* Zoom into shark skin, in three jumps: the whole animal (1 m), a patch of skin cut open to show its
   layers (1 cm), and the denticles themselves (100 µm), each a tiny tooth with three ridges along the
   flow. Water streams past at the last level. The camera glides between levels; nothing snaps. */

type Level = 0 | 1 | 2;
const LEVELS: { t: string; s: string; scale: string; cam: [number, number, number]; target: [number, number, number] }[] = [
  { t: "The shark", s: "shortfin mako · ~2.5 m", scale: "50 cm", cam: [1.0, 0.45, 1.3], target: [0, 0, 0] },
  { t: "The skin", s: "cut open · ~1 cm across", scale: "1 mm", cam: [1.2, 2.2, 3.6], target: [-0.4, -0.3, 0] },
  { t: "The denticles", s: "each crown ~0.2 mm", scale: "100 µm", cam: [1.7, 1.25, 2.3], target: [0, 0.1, 0] },
];

function Rig({ level }: { level: Level }) {
  const { camera } = useThree();
  const tgt = useRef(new THREE.Vector3());
  // glide for a moment after each jump, then hand the camera back to the visitor
  const until = useRef(0);
  useEffect(() => { until.current = performance.now() + 2200; }, [level]);
  useFrame((st, dt) => {
    if (performance.now() > until.current) return;
    const L = LEVELS[level], k = Math.min(1, dt * 2.8);
    camera.position.lerp(new THREE.Vector3(...L.cam), k);
    tgt.current.lerp(new THREE.Vector3(...L.target), k);
    const c = st.controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (c) { c.target.copy(tgt.current); c.update(); } else camera.lookAt(tgt.current);
  });
  return null;
}

/** A block of skin with its layers: denticles on top, then epidermis, dermis (criss-cross collagen), hypodermis and muscle. */
function SkinBlock() {
  const layers = [
    { h: 0.12, c: "#7f8fa6", n: "EPIDERMIS · thin living layer" },
    { h: 0.4, c: "#c7a77d", n: "DERMIS · criss-cross collagen, springy" },
    { h: 0.25, c: "#e8d8b8", n: "HYPODERMIS · fat and connective tissue" },
    { h: 0.45, c: "#b2534a", n: "MUSCLE · the swimming engine" },
  ];
  let y = 0;
  return (
    <group>
      <group position-y={0.02}><DenticlePatch rows={9} cols={10} scale={0.26} spacing={0.78} /></group>
      {layers.map((L, i) => {
        y -= L.h;
        const yc = y + L.h / 2;
        return (
          <group key={i}>
            <mesh position={[0, yc, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.2, L.h, 2.0]} />
              <meshStandardMaterial color={L.c} roughness={0.8} />
            </mesh>
            <Label3D position={[-1.2, yc, 1.05]} anchorX="right" color={L.c} size={0.13}>{L.n}</Label3D>
          </group>
        );
      })}
      <Label3D position={[-1.2, 0.14, 1.05]} anchorX="right" color={CYAN} size={0.13}>DENTICLES · tooth-like scales</Label3D>
    </group>
  );
}

/** Water streaming over the denticles, faster above, slowed in the grooves. */
function Stream() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPx: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute vec3 aR; uniform float uT, uPx; varying float vA; varying float vS;
      void main(){
        float y = aR.z;
        float sp = 0.25 + 2.0 * y;                     // a sheared flow: slow at the wall, fast above
        float age = fract(uT * sp * 0.08 + aR.x);
        vec3 p = vec3(aR.y, 0.12 + y, 2.2 - age * 4.4);
        // in the grooves between ridges the flow is calm and slow
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.035 * uPx / max(0.3, -mv.z), 1.0, 8.0);
        vA = smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.85, 1.0, age));
        vS = clamp(sp / 1.6, 0.0, 1.0);
      }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c)*10.0) * vA * 0.7; if (a < 0.01) discard; vec3 col = mix(vec3(0.37, 0.92, 0.82), vec3(0.6, 0.85, 1.0), vS); gl_FragColor = vec4(col * a, a); }`,
  }), []);
  const geo = useMemo(() => {
    const n = 9000, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([Math.random(), (Math.floor(Math.random() * 22) - 11) * 0.13, 0.05 + Math.floor(Math.random() * 5) * 0.14], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("aR", new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => { mat.uniforms.uT.value += dt; mat.uniforms.uPx.value = st.size.height; });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export default function SkinDive() {
  const [level, setLevel] = useState<Level>(0);
  return (
    <div className="split">
      <Plate n="III·1" title="From shark to scale, in three jumps" note="drag to turn · scroll to zoom">
        <Stage3D label="Zooming from a swimming shark into its skin layers and tooth-like denticles" camera={{ position: [1.0, 0.45, 1.3], fov: 36 }} background="radial-gradient(ellipse 90% 80% at 50% 10%, #0d3550, #02101a 75%)" look={{ bloom: 0.45 }}
          overlay={<>
            <CellTag>Cell III · dive · {LEVELS[level].t}</CellTag>
            <div className="hud tag hud-br" style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <i style={{ display: "block", width: 90, height: 6, border: "1.5px solid #ecebf4", borderTop: 0 }} />
              <span>{LEVELS[level].scale}</span>
            </div>
          </>}>
          <fog attach="fog" args={["#03192a", 3, 9]} />
          <Rig level={level} />
          <group visible={level === 0}>
            <Shark swim={1} />
            <Label3D position={[0.18, 0.2, 0.05]} to={[0.05, 0.08, 0.05]} color={CYAN} size={0.06}>SKIN · feels like sandpaper backwards</Label3D>
          </group>
          <group visible={level === 1} position={[0, 0, 0]}>
            <SkinBlock />
          </group>
          <group visible={level === 2}>
            <DenticlePatch rows={6} cols={6} scale={0.62} />
            <Stream />
            <Label3D position={[0.9, 0.85, 0.6]} to={[0.15, 0.22, 0.3]} color={HUSH} size={0.14}>RIBLETS · ridges along the flow</Label3D>
            <Label3D position={[-1.4, 1.05, -1.2]} color="#9fc4ff" size={0.14}>WATER RUNS ALONG THE RIDGES</Label3D>
          </group>
          <OrbitControls makeDefault enablePan={false} minDistance={0.4} maxDistance={8} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="dive-levels" style={{ marginTop: 0 }}>
          {LEVELS.map((L, i) => <button key={L.t} aria-pressed={level === i} onClick={() => setLevel(i as Level)}><b>{L.t}</b><small>{L.s}</small></button>)}
        </div>
        <div className="prose">
          <p><strong>A shark&apos;s skin isn&apos;t smooth.</strong> It is covered in tiny tooth-like scales called dermal denticles (placoid scales), roughly 100 to 500 micrometres across. Each one has fine ridges running along the direction of the water flow: <b>riblets</b>.</p>
          <p>Run a hand from head to tail and it feels smooth; tail to head, like sandpaper. The scales are made of the same stuff as teeth: dentine under a hard enamel-like cap.</p>
        </div>
        <div className="readouts">
          <div className="readout"><span className="k">Denticle size</span><span className="v">100–500<small>µm</small></span></div>
          <div className="readout"><span className="k">Ridges per crown</span><span className="v">3–5</span></div>
          <div className="readout"><span className="k">Ridge spacing (mako)</span><span className="v">~40–80<small>µm</small></span></div>
        </div>
      </div>
      <Notes say="Three jumps: the shark, a block of its skin cut open, then the scales themselves. Each scale is a little tooth with ridges lined up with the water." show="Click the three levels in order. At the last level, watch the water slide along the grooves." ask="Why would ridges along the flow help, rather than a perfectly smooth skin?" />
    </div>
  );
}
