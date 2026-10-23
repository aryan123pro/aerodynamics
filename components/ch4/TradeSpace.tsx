"use client";
import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate } from "@/components/ui";

/* The trade-off space. Every design from the three chapters, placed by
     x  noise benefit (dB quieter)
     y  efficiency change (% better fuel / drag; negative = a penalty)
     z  readiness (1 lab or simulation · 2 concept · 3 in service)
   The corner where everything is good, the "free lunch", is empty. Values: the deck's own figures, as
   cited in each chapter; where a study gave a range we use its middle. */

interface D { id: string; name: string; noise: number; eff: number; ready: number; color: string; note: string }
const DESIGNS: D[] = [
  { id: "chev", name: "Chevron nozzle", noise: 3.5, eff: -0.3, ready: 3, color: "#f4b860", note: "3–4 dB quieter for a 0.25–0.5% thrust penalty. Flying on the 787, 747-8 and 737 MAX." },
  { id: "owlnz", name: "Owl-serrated nozzle", noise: 8.5, eff: -6, ready: 1, color: "#ff8f5a", note: "7–10 dB quieter, but a 4–8% propulsion efficiency penalty and thermal wear. Still research." },
  { id: "bionic", name: "Bionic Car", noise: 0, eff: 20, ready: 2, color: "#c9dc4f", note: "Cd 0.19 and 20% better fuel economy than a comparable car. Wind noise was not reported, so it sits at zero on that axis. A concept: never built for sale." },
  { id: "riblet", name: "Riblet film (aircraft)", noise: 0, eff: 1.5, ready: 3, color: "#55d4ff", note: "5–8% less skin friction in the lab, about 1–2% fuel in service; any noise change is too small to report. Durability limits it." },
  { id: "d17", name: "Riblet sonar · Design 17", noise: 8.8, eff: -7.3, ready: 1, color: "#5eead0", note: "Quietest array (−8.81 dB), but 7.34% more drag. Simulation only." },
  { id: "d27", name: "Riblet sonar · Design 27", noise: 6.9, eff: 0.3, ready: 1, color: "#9d86ff", note: "−6.87 dB and slightly less drag. The closest to a free lunch, and only in simulation." },
];
const X = (n: number) => -3 + (n / 10) * 6, Y = (e: number) => -1.6 + ((e + 8) / 28) * 3.6, Z = (r: number) => -2 + ((r - 1) / 2) * 4;

function Orb({ d, sel, onPick }: { d: D; sel: boolean; onPick: () => void }) {
  const m = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { const s = (sel ? 1.45 : 1) * (1 + 0.06 * Math.sin(clock.elapsedTime * 2 + d.noise)); m.current.scale.setScalar(s); });
  const p: [number, number, number] = [X(d.noise), Y(d.eff), Z(d.ready)];
  return (
    <group>
      <mesh ref={m} position={p} onClick={(e) => { e.stopPropagation(); onPick(); }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={sel ? 2.2 : 1.1} toneMapped={false} />
      </mesh>
      {/* drop lines to the floor so the depth reads */}
      <Line points={[p, [p[0], -1.6, p[2]]]} color={d.color} lineWidth={1} transparent opacity={0.4} dashed dashSize={0.08} gapSize={0.06} />
      <Label3D position={[p[0], p[1] + 0.32, p[2]]} color={d.color} size={0.2} dim={!sel}>{d.name}</Label3D>
    </group>
  );
}

function Box() {
  const e = [[-3, -1.6, -2], [3, -1.6, -2], [3, -1.6, 2], [-3, -1.6, 2]] as [number, number, number][];
  return (
    <group>
      <Line points={[...e, e[0]]} color="#3a3d55" lineWidth={1} />
      <Line points={[[-3, -1.6, -2], [-3, 2, -2]]} color="#3a3d55" lineWidth={1} />
      <Line points={[[-3, Y(0), -2], [3, Y(0), -2], [3, Y(0), 2], [-3, Y(0), 2], [-3, Y(0), -2]]} color="#5a5d7a" lineWidth={1} dashed dashSize={0.1} gapSize={0.08} />
      <Label3D position={[0, -2.05, 2.3]} color="#b4b1c6" size={0.2}>QUIETER →</Label3D>
      <Label3D position={[-3.5, 0.2, -2]} color="#b4b1c6" size={0.2}>MORE EFFICIENT ↑</Label3D>
      <Label3D position={[3.5, -1.9, 0]} color="#b4b1c6" size={0.2}>READY TO USE →</Label3D>
      <Label3D position={[3.2, Y(0) + 0.1, 2.3]} color="#7c798f" size={0.16}>no change in efficiency</Label3D>
    </group>
  );
}

function FreeLunch() {
  const m = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { (m.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + 0.06 * Math.sin(clock.elapsedTime * 1.5); });
  return (
    <group position={[2.2, 1.4, 1.4]}>
      <mesh ref={m}><boxGeometry args={[1.6, 1.2, 1.2]} /><meshBasicMaterial color="#ff7ad9" transparent opacity={0.1} depthWrite={false} /></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(1.6, 1.2, 1.2)]} /><lineBasicMaterial color="#ff7ad9" /></lineSegments>
      <Label3D position={[0, 0.85, 0]} color="#ff7ad9" size={0.22}>FREE LUNCH · empty</Label3D>
    </group>
  );
}

export default function TradeSpace() {
  const [sel, setSel] = useState("chev");
  const d = DESIGNS.find((x) => x.id === sel)!;
  return (
    <div className="split">
      <Plate n="IV·1" title="Six designs in one trade-off space" note="drag to turn · click an orb">
        <Stage3D label="A 3D chart of six bio-inspired designs by noise benefit, efficiency and readiness" camera={{ position: [6.5, 3.4, 7.5], fov: 36 }} look={{ bloom: 0.9, threshold: 0.6 }} lights={false} env={false}>
          <ambientLight intensity={0.6} />
          <Box />
          <FreeLunch />
          {DESIGNS.map((x) => <Orb key={x.id} d={x} sel={x.id === sel} onPick={() => setSel(x.id)} />)}
          <OrbitControls makeDefault target={[0, 0, 0]} enablePan={false} minDistance={5} maxDistance={16} autoRotate autoRotateSpeed={0.4} />
        </Stage3D>
      </Plate>
      <div className="stack">
        <div className="card" style={{ borderColor: d.color }}>
          <h4 style={{ color: d.color }}>{d.name}</h4>
          <p className="muted" style={{ fontSize: 14.5 }}>{d.note}</p>
          <div className="readouts" style={{ marginTop: 12 }}>
            <div className="readout"><span className="k">Quieter by</span><span className="v">{d.noise}<small>dB</small></span></div>
            <div className="readout"><span className="k">Efficiency</span><span className="v" style={{ color: d.eff >= 0 ? "var(--hush)" : "var(--roar)" }}>{d.eff > 0 ? "+" : ""}{d.eff}<small>%</small></span></div>
            <div className="readout"><span className="k">Readiness</span><span className="v" style={{ fontSize: "1.1rem" }}>{["", "lab / sim", "concept", "in service"][d.ready]}</span></div>
          </div>
        </div>
        <div className="row">{DESIGNS.map((x) => <button key={x.id} className="btn sm" aria-pressed={x.id === sel} onClick={() => setSel(x.id)}><span style={{ color: x.color }}>●</span> {x.name}</button>)}</div>
        <div className="prose">
          <p><strong>The common lesson:</strong> bio-inspired designs rarely give a free improvement. They shift a balance between drag, noise, efficiency and practicality, so they pay off most when matched to the right job.</p>
          <p>Chevrons show the trade most clearly: less noise for a small efficiency penalty. Denticles give small but real gains, held back by durability and cost. The Bionic Car showed nature can guide a whole body&apos;s aerodynamics, but a concept still has to meet manufacturing, safety and styling rules.</p>
        </div>
      </div>
      <Notes say="Every orb is a real design from today's talk. The pink box, quieter, more efficient and ready to use, is empty. That's the summary in one picture." ask="Which design would you put money into, and what would you need to fix first?" />
    </div>
  );
}
