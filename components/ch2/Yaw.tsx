"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Boxfish, TunnelBody } from "@/components/three/Bodies";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import TunnelSmoke from "@/components/three/TunnelSmoke";
import WindTunnel from "@/components/three/WindTunnel";
import { CellTag, Notes, Plate, Plot, Range, Seg } from "@/components/ui";
import { YAW, yawMoment } from "@/lib/car";
import { CYAN, HUSH, ROAR, YELLOW, range } from "@/lib/plot";

/* The twist. The deck says the boxfish is a model of stability. In 2015 Van Wassenbergh and colleagues
   measured it in a flow tank and found the opposite: turn a boxfish a little and the water pushes it
   to turn further. That is not a flaw. A reef fish needs to turn on the spot, and an unstable body turns
   easily. Release the model and watch: yaw angle β obeys  I β'' = q·Cn(β) − c β',  Cn = k sin 2β. */

type Who = keyof typeof YAW;

function Dart() {
  return (
    <group position-y={0.9}>
      <mesh rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[0.32, 3.2, 8, 24]} /><meshPhysicalMaterial color="#c9cbe0" metalness={0.7} roughness={0.25} clearcoat={1} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -1.7]} rotation-z={(i * Math.PI) / 2} castShadow>
          <boxGeometry args={[0.04, 1.6, 0.8]} /><meshStandardMaterial color="#9d86ff" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ who, beta, run, onBeta }: { who: Who; beta: number; run: boolean; onBeta: (b: number) => void }) {
  const g = useRef<THREE.Group>(null!);
  const arrow = useRef<THREE.Group>(null!);
  const st = useRef({ b: beta, w: 0 });
  const last = useRef(0);
  if (!run) st.current = { b: beta, w: 0 };
  useFrame((_s, dt) => {
    const s = st.current, k = YAW[who].k;
    if (run) {
      const h = Math.min(dt, 0.03);
      // cars have tyres: a strong restoring force from the road that fish and darts don't get
      const tyre = who === "car" ? 20 : 0;
      const acc = 7 * yawMoment(k, (s.b * 180) / Math.PI) - tyre * s.b - (who === "car" ? 4 : 1.1) * s.w;
      s.w += acc * h; s.b += s.w * h;
      s.b = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.b));
      if (Math.abs(s.b) >= Math.PI / 2) s.w = 0;
      if (performance.now() - last.current > 80) { last.current = performance.now(); onBeta((s.b * 180) / Math.PI); }
    }
    g.current.rotation.y = s.b;
    // the moment arrow: which way the flow is twisting the body, and how hard
    const m = yawMoment(k, (s.b * 180) / Math.PI);
    arrow.current.scale.setScalar(0.4 + Math.min(1.2, Math.abs(m) * 1.4));
    arrow.current.rotation.set(-Math.PI / 2, 0, 0);
    arrow.current.scale.x *= Math.sign(m) || 1;
    arrow.current.visible = Math.abs(m) > 0.02;
  });
  const destab = YAW[who].k > 0;
  const arc = useMemo(() => new THREE.TorusGeometry(2.6, 0.06, 8, 40, Math.PI / 3), []);
  return (
    <group>
      <group ref={g}>
        {who === "fish" ? <group position-y={0}><Boxfish swim={0.2} /></group> : who === "car" ? <TunnelBody kind="bionic" /> : <Dart />}
      </group>
      <group ref={arrow} position={[0, 2.6, 0]}>
        <mesh geometry={arc} rotation-z={-Math.PI / 6}><meshBasicMaterial color={destab ? ROAR : HUSH} toneMapped={false} /></mesh>
        <mesh position={[2.6 * Math.cos(Math.PI / 6), 2.6 * Math.sin(Math.PI / 6), 0]} rotation-z={Math.PI / 6 + Math.PI}><coneGeometry args={[0.18, 0.4, 16]} /><meshBasicMaterial color={destab ? ROAR : HUSH} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

export default function Yaw() {
  const [who, setWho] = useState<Who>("fish");
  const [beta, setBeta] = useState(10);
  const [run, setRun] = useState(false);
  const [live, setLive] = useState(10);
  const shown = run ? live : beta;
  const bs = range(-90, 90, 91);
  const destab = YAW[who].k > 0;
  return (
    <div className="split">
      <Plate n="II·4" title="Yaw test: turn the model, then let go" note="drag to turn · scroll to zoom">
        <Stage3D label="Top view of a wind tunnel yaw test of a boxfish, a dart and a car" camera={{ position: [0.01, 13, 2.2], fov: 38 }} look={{ bloom: 0.5 }}
          overlay={<>
            <CellTag>Cell II · yaw rig · {YAW[who].name}</CellTag>
            <div className="hud tag hud-tr"><span className="k">yaw angle β</span><span className="big">{shown.toFixed(1)}<small>°</small></span><span className="k">flow pushes it</span><span className="big" style={{ color: destab ? ROAR : HUSH, fontSize: "1.1rem" }}>{destab ? "further round" : "back straight"}</span></div>
            <div className="strip">
              <Seg options={(Object.keys(YAW) as Who[]).map((k) => [k, YAW[k].name])} value={who} onChange={(v) => { setWho(v); setRun(false); }} label="Model" />
              <Range label="Start angle β" value={beta} min={-30} max={30} step={1} onChange={(v) => { setBeta(v); setRun(false); }} fmt={(v) => v + "°"} />
              <button className="btn sm accent" onClick={() => { setLive(beta); setRun((r) => !r); }}>{run ? "Reset" : "Let go"}</button>
            </div>
          </>}>
          <group scale={who === "fish" ? 0.9 : 1}>
            <Rig who={who} beta={(beta * Math.PI) / 180} run={run} onBeta={setLive} />
          </group>
          <WindTunnel fan={1} turntable={(shown * Math.PI) / 180} />
          <TunnelSmoke center={[0, 0.9, 0]} radii={who === "dart" ? [0.45, 0.45, 2.1] : [0.85, 0.75, 2.15]} yaw={(shown * Math.PI) / 180} wake={who === "dart" ? 0.1 : 0.3} span={[2.4, 0.6]} lanes={[13, 2]} count={16000} speed={1.2} />
          <Label3D position={[0, 1, 6.6]} color={YELLOW} size={0.45}>WIND</Label3D>
          <OrbitControls makeDefault target={[0, 0, 0.6]} enablePan={false} minDistance={5} maxDistance={20} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>The plot twist.</strong> The boxfish was long thought to keep itself pointing straight: the deck says its body is &ldquo;adapted for stable movement&rdquo;. In 2015 a team measured it in a flow tank. When a boxfish turns a little, the water pushes it to turn <em>further</em>.</p>
          <p>That makes sense for a fish that lives among corals: an unstable body can spin on the spot. A dart is the opposite: its tail fin swings it back into the wind, like a weathervane.</p>
        </div>
        <Plot label="Yaw moment against yaw angle for the three models" height={200} opts={{
          x: [-90, 90], y: [-1.1, 1.1], xticks: [-90, -45, 0, 45, 90], yticks: [-1, 0, 1], xlabel: "yaw angle β (°)", ylabel: "moment",
          series: (Object.keys(YAW) as Who[]).map((k) => ({ xs: bs, data: bs.map((b) => yawMoment(YAW[k].k, b)), color: k === "fish" ? YELLOW : k === "dart" ? CYAN : "#9fe0a6", width: k === who ? 3 : 1.2, dash: k === who ? [] : [4, 4] })),
          markers: [{ x: shown, color: destab ? ROAR : HUSH }],
        }} />
        <p className="faint" style={{ fontSize: 13 }}>Positive slope through zero: unstable (turns further). Negative: stable (turns back). Shapes are a sketch of the measured trend (Van Wassenbergh et al. 2015, J. R. Soc. Interface 12: 20141146).</p>
        <div className="verdict warn"><b>So what did the car copy?</b><p>Not the fish&apos;s stability, which it doesn&apos;t have. It copied a roomy box that still lets air slip past. Cars are mildly unstable in yaw too; their tyres keep them straight. Lesson from the deck&apos;s summary: <i>borrow the principle, not the exact shape.</i></p></div>
      </div>
      <Notes say="Here's the twist the deck hints at in its summary. The boxfish is not stable, it's built to turn. Mercedes copied the shape for drag and room, which still works; but the 'stable like a boxfish' story was wrong." show="Boxfish: Let go. Then Dart: Let go." ask="Why would a reef fish want to be unstable?" />
    </div>
  );
}
