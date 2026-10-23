"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import Floor from "@/components/three/Floor";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Turbofan, { Plume } from "@/components/three/Turbofan";
import { Analyser, CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { dbaOf } from "@/lib/audio";
import { coreLength, jetBands, mixing, PLAIN, SHAPES, thrustLoss, type ChevronShape, type Nozzle } from "@/lib/jet";
import { AMBER, HUSH, ROAR, ROSE, fmt } from "@/lib/plot";
import { store } from "@/lib/site";

/* L1 · Nozzle Lab. Design a chevron nozzle and test it on an outdoor stand with a ring of thirteen
   microphones from 30° to 150° off the intake. Each mic's pole shows the A-weighted level it hears;
   click one (or use the slider) to listen from there. Save designs to plot them on the noise-versus-
   thrust trade-off, the curve every engine maker has to choose a point on. */

const ANGLES = Array.from({ length: 13 }, (_, i) => 30 + i * 10);
const RING = 7;
interface Saved { n: Nozzle; dA: number; loss: number }

function MicRing({ levels, sel, onPick, ref0 }: { levels: number[]; sel: number; onPick: (a: number) => void; ref0: number[] }) {
  return (
    <group>
      {ANGLES.map((a, i) => {
        const th = (a * Math.PI) / 180, x = Math.sin(th) * RING, z = Math.cos(th) * RING;
        const h = Math.max(0.15, (levels[i] - 55) / 10);
        const d = levels[i] - ref0[i];
        const c = d < -0.3 ? HUSH : d > 0.3 ? ROAR : "#c9cbe0";
        return (
          <group key={a} position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onPick(a); }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
            <mesh position-y={h / 2}><cylinderGeometry args={[0.07, 0.07, h, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={a === sel ? 1.6 : 0.4} /></mesh>
            <mesh position-y={h + 0.12}><sphereGeometry args={[a === sel ? 0.16 : 0.1, 16, 16]} /><meshBasicMaterial color={a === sel ? ROSE : "#ecebf4"} toneMapped={false} /></mesh>
            {a % 30 === 0 && <Label3D position={[0, h + 0.5, 0]} color="#b4b1c6" size={0.22}>{`${a}°`}</Label3D>}
          </group>
        );
      })}
    </group>
  );
}

export default function NozzleLab() {
  const [count, setCount] = useState(12);
  const [pen, setPen] = useState(0.6);
  const [shape, setShape] = useState<ChevronShape>("triangle");
  const [vj, setVj] = useState(300);
  const [angle, setAngle] = useState(120);
  const [dist, setDist] = useState(150);
  const [ab, setAb] = useState(false);
  const [plainNow, setPlainNow] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => { setSaved(store<Saved[]>("nozzleLab") || []); }, []);
  const n: Nozzle = { count, pen, shape };
  const jet = { vj, d: 1.9 };
  const levels = useMemo(() => ANGLES.map((a) => dbaOf(jetBands(jet, n, dist, a))), [vj, count, pen, shape, dist]); // eslint-disable-line react-hooks/exhaustive-deps
  const plainLv = useMemo(() => ANGLES.map((a) => dbaOf(jetBands(jet, PLAIN, dist, a))), [vj, dist]); // eslint-disable-line react-hooks/exhaustive-deps
  const bandsN = useMemo(() => jetBands(jet, n, dist, angle), [vj, count, pen, shape, dist, angle]); // eslint-disable-line react-hooks/exhaustive-deps
  const bandsP = useMemo(() => jetBands(jet, PLAIN, dist, angle), [vj, dist, angle]); // eslint-disable-line react-hooks/exhaustive-deps
  const dA = dbaOf(bandsN) - dbaOf(bandsP);
  const avg = levels.reduce((s, l, i) => s + (l - plainLv[i]), 0) / levels.length;

  useEffect(() => { if (!ab) { setPlainNow(false); return; } const id = setInterval(() => setPlainNow((x) => !x), 2500); return () => clearInterval(id); }, [ab]);
  const { voice, on } = useVoice({ ref: 104, unit: "dBA" });
  useEffect(() => { const b = plainNow ? bandsP : bandsN; voice?.setSpectrum(b, dbaOf(b)); }, [voice, on, bandsN, bandsP, plainNow]);

  const save = () => { const s = [...saved, { n, dA: avg, loss: thrustLoss(n) }].slice(-24); setSaved(s); store("nozzleLab", s); };
  const shown = plainNow ? PLAIN : n;

  return (
    <div className="lab-grid">
      <Plate n="L1" title="Outdoor engine test stand with a microphone ring" note="click a microphone to listen there">
        <Stage3D label="A jet engine on a test stand surrounded by a ring of microphones" camera={{ position: [10, 6.5, 6], fov: 36 }} look={{ bloom: 0.9 }}
          overlay={<>
            <CellTag>Nozzle lab · {count} {SHAPES[shape].name.toLowerCase()} teeth · {fmt(pen * 100)}% bend</CellTag>
            <div className="hud tag hud-tr"><span className="k">mic at {angle}° · {fmt(dist)} m</span><span className="big">{fmt(dbaOf(plainNow ? bandsP : bandsN), 1)}<small>dBA</small></span><span className="k">vs plain nozzle</span><span className="big" style={{ color: dA < 0 ? HUSH : ROAR }}>{dA > 0 ? "+" : ""}{fmt(dA, 1)}<small>dB</small></span>{ab && <span className="k" style={{ color: plainNow ? ROAR : HUSH }}>now playing: {plainNow ? "A · plain" : "B · your design"}</span>}</div>
          </>}>
          <group position={[0, 1.6, 0]} rotation-y={0}>
            <Turbofan fanCount={shown.count} fanPen={shown.pen} coreCount={shown.count} corePen={shown.pen} shape={shown.shape} spin={vj / 300} />
            <Plume mixing={mixing(shown)} teeth={shown.count || 12} coreLen={coreLength(shown)} speed={vj / 280} length={11} />
          </group>
          <mesh position={[0, 0.6, 0.3]}><boxGeometry args={[0.3, 1.2, 1.2]} /><meshStandardMaterial color="#2b2f40" metalness={0.7} roughness={0.4} /></mesh>
          <MicRing levels={levels} ref0={plainLv} sel={angle} onPick={setAngle} />
          <Label3D position={[0, 3.6, 3.2]} color={AMBER} size={0.3}>INTAKE · 0°</Label3D>
          <Label3D position={[0, 3.6, -8.5]} color={AMBER} size={0.3}>EXHAUST · 180°</Label3D>
          <Floor color="#f4b860" />
          <OrbitControls makeDefault target={[0, 1, -1.5]} enablePan={false} minDistance={4} maxDistance={24} maxPolarAngle={Math.PI * 0.48} />
        </Stage3D>
      </Plate>

      <aside className="lab-side">
        <div className="panel">
          <h4>Nozzle</h4>
          <Seg options={(Object.keys(SHAPES) as ChevronShape[]).map((k) => [k, SHAPES[k].name])} value={shape} onChange={setShape} label="Tooth shape" />
          <Range label="Teeth" value={count} min={4} max={24} step={2} onChange={setCount} />
          <Range label="Bend into the jet" value={pen} min={0} max={1} step={0.05} onChange={setPen} fmt={(v) => fmt(v * 100) + "%"} />
          <Range label="Jet speed (throttle)" value={vj} min={200} max={450} step={10} onChange={setVj} fmt={(v) => v + " m/s"} />
        </div>
        <div className="panel">
          <h4>Microphone</h4>
          <Range label="Angle from the intake" value={angle} min={30} max={150} step={10} onChange={setAngle} fmt={(v) => v + "°"} />
          <Range label="Distance" value={dist} min={50} max={1500} step={50} onChange={setDist} fmt={(v) => v + " m"} />
          <div className="row"><SoundCue label="Listen" /><button className="btn sm" aria-pressed={ab} onClick={() => setAb((x) => !x)}>A/B</button></div>
        </div>
        <Readouts items={[
          ["Avg. change", (avg > 0 ? "+" : "") + fmt(avg, 2), "dBA", avg < 0 ? "cool" : "hot"],
          ["Thrust lost", fmt(thrustLoss(n), 2), "%"],
          ["Hot core", fmt(coreLength(n), 1), "D", "acc"],
        ]} />
        <Analyser y={[20, 100]} ylabel={`dB at ${dist} m`} curves={[{ label: "plain", color: ROAR, bands: bandsP }, { label: "your nozzle", color: HUSH, bands: bandsN }]} height={180} />
        <div className="panel">
          <h4>Trade-off · your saved designs</h4>
          <Plot label="Noise change against thrust loss for saved designs" height={190} opts={{
            x: [0, 2], y: [-6, 1], xticks: [0, 0.5, 1, 1.5, 2], yticks: [-6, -4, -2, 0], xlabel: "thrust lost (%)", ylabel: "avg dBA change",
            series: [{ xs: saved.map((s) => s.loss), data: saved.map((s) => s.dA), color: AMBER, width: 0.001, dots: true }, { xs: [thrustLoss(n)], data: [avg], color: ROSE, width: 0.001, dots: true }],
            markers: [{ x: 0.06, label: "NASA 2000 best: 0.06%", color: HUSH }],
          }} />
          <div className="row"><button className="btn sm accent" onClick={save}>Save this design</button><button className="btn sm ghost" onClick={() => { setSaved([]); store("nozzleLab", []); }}>Clear</button></div>
        </div>
      </aside>
      <Notes say="Listen from the side at 90° and from behind at 150°. Jet noise beams backwards; that's where chevrons help most." ask="Can you find a design that is 2 dB quieter for under 0.2% thrust?" />
    </div>
  );
}
