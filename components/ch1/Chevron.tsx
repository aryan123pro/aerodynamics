"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import Floor from "@/components/three/Floor";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Turbofan, { Plume } from "@/components/three/Turbofan";
import { Analyser, CellTag, Notes, Plate, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { dbaOf } from "@/lib/audio";
import { coreLength, jetBands, mixing, PLAIN, SHAPES, TAKEOFF, thrustLoss, type ChevronShape, type Nozzle } from "@/lib/jet";
import { AMBER, HUSH, ROAR, VIOLET, fmt } from "@/lib/plot";

/* Teeth on the nozzle. The engine seen from behind, chevrons on its fan and core nozzles.
   Each tooth bends a little into the jet and sheds a pair of counter-rotating streamwise vortices.
   They stir hot core, cold bypass and still air together sooner, so the big, slow, loud eddies never
   grow as large. Listen: the low roar drops and a little hiss appears near the nozzle. A/B flips
   between plain and chevron every 2.5 s so the ear can compare. */

export function useNozzleSound(n: Nozzle, ab: boolean, r = 300) {
  const [showing, setShowing] = useState<"A" | "B">("B");
  useEffect(() => {
    if (!ab) { setShowing("B"); return; }
    const id = setInterval(() => setShowing((s) => (s === "A" ? "B" : "A")), 2500);
    return () => clearInterval(id);
  }, [ab]);
  const playing = ab && showing === "A" ? PLAIN : n;
  const bands = useMemo(() => jetBands(TAKEOFF, playing, r, 120), [playing, r]);
  const { voice, on } = useVoice({ ref: 98, unit: "dBA" });
  useEffect(() => { voice?.setSpectrum(bands, dbaOf(bands)); }, [voice, on, bands]);
  return { showing, playingPlain: playing === PLAIN };
}

export default function Chevron() {
  const [has, setHas] = useState(true);
  const [count, setCount] = useState(12);
  const [pen, setPen] = useState(0.6);
  const [shape, setShape] = useState<ChevronShape>("triangle");
  const [ab, setAb] = useState(false);
  const n: Nozzle = has ? { count, pen, shape } : PLAIN;
  const plain = useMemo(() => jetBands(TAKEOFF, PLAIN, 300, 120), []);
  const chev = useMemo(() => jetBands(TAKEOFF, n, 300, 120), [n.count, n.pen, n.shape]); // eslint-disable-line react-hooks/exhaustive-deps
  const dA = dbaOf(chev) - dbaOf(plain);
  const { showing, playingPlain } = useNozzleSound(n, ab);
  const m = mixing(n);
  const visibleN = ab && showing === "A" ? PLAIN : n;

  return (
    <div className="split">
      <Plate n="I·4" title="The exhaust from behind, chevrons on both nozzles" note="drag to turn · scroll to zoom">
        <Stage3D label="A jet engine's chevron nozzle and its exhaust plume" camera={{ position: [3.4, 2.2, -6.2], fov: 36 }} look={{ bloom: 0.9 }}
          overlay={<>
            <CellTag>Cell I · jet noise rig · {visibleN === PLAIN ? "plain nozzle" : `${count} ${SHAPES[shape].name.toLowerCase()} chevrons`}</CellTag>
            {ab && <div className="hud tag hud-tr" style={{ borderColor: playingPlain ? ROAR : HUSH }}><span className="k">A/B · now playing</span><span className="big" style={{ color: playingPlain ? ROAR : HUSH }}>{playingPlain ? "A · plain" : "B · chevrons"}</span></div>}
            <div className="strip">
              <Seg options={[[false, "Plain"], [true, "Chevrons"]]} value={has} onChange={setHas} label="Nozzle" />
              <Range label="Teeth" value={count} min={6} max={24} step={2} onChange={setCount} />
              <Range label="Bend into the jet" value={pen} min={0} max={1} step={0.05} onChange={setPen} fmt={(v) => fmt(v * 100) + "%"} />
            </div>
          </>}>
          <group position={[0, 1.4, 0]}>
            <Turbofan fanCount={visibleN.count} fanPen={visibleN.pen} coreCount={visibleN.count} corePen={visibleN.pen} shape={visibleN.shape} />
            <Plume mixing={mixing(visibleN)} teeth={visibleN.count || 12} coreLen={coreLength(visibleN)} length={11} speed={1.1} />
            {visibleN.count > 0 && <Label3D position={[1.6, 1.3, -1.2]} to={[0.9, 0.35, -1.1]} color={AMBER} size={0.22}>CHEVRONS · bent into the flow</Label3D>}
            <Label3D position={[1.8, -0.9, -5]} color={visibleN.count ? HUSH : ROAR} size={0.24}>{visibleN.count ? "LOBED JET · mixes sooner" : "SMOOTH RING · big eddies"}</Label3D>
          </group>
          <Floor color={VIOLET} />
          <OrbitControls makeDefault target={[0, 1.3, -1.8]} enablePan={false} minDistance={2.5} maxDistance={14} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>How an owl&apos;s feather became a jet part.</strong> The serrated edge of an owl feather breaks big, turbulent air currents into small, separate micro-vortices. Chevrons do the same at the back of an engine.</p>
        </div>
        <Seg options={(Object.keys(SHAPES) as ChevronShape[]).map((k) => [k, SHAPES[k].name])} value={shape} onChange={(v) => { setShape(v); setHas(true); }} label="Tooth shape" />
        <p className="faint" style={{ fontSize: 13, marginTop: -4 }}>{SHAPES[shape].note}</p>
        <Analyser y={[30, 95]} ylabel="dB at 300 m (octave band)" curves={[
          { label: "plain nozzle", color: ROAR, bands: plain },
          { label: has ? "chevrons" : "plain (same)", color: HUSH, bands: chev },
        ]} />
        <Readouts items={[
          ["Change at 300 m", (dA > 0 ? "+" : "") + dA.toFixed(1), "dBA", dA < -0.2 ? "cool" : dA > 0.2 ? "hot" : undefined],
          ["Thrust lost", fmt(thrustLoss(n), 2), "%"],
          ["Hot core length", fmt(coreLength(n), 1), "D", "acc"],
          ["Mixing", fmt(m * 100), "%"],
        ]} />
        <div className="row">
          <SoundCue label="Listen" />
          <button className="btn sm" aria-pressed={ab} onClick={() => setAb((x) => !x)}>A/B compare</button>
        </div>
        <p className="faint" style={{ fontSize: 13 }}>Notice the trade: the low-frequency roar (left) falls, a little high-frequency hiss (right) rises, and the more the teeth bend, the more thrust they cost. NASA&apos;s best nozzle: 2.7 EPNdB quieter for 0.06% cruise thrust (Saiyed et al. 2000).</p>
      </div>
      <Notes say="The teeth bend a few degrees into the jet. Each one makes a pair of spinning vortices along the flow, which stir the jet into the air sooner." show="Turn A/B compare on with the sound up. Then push 'Bend into the jet' to 100% and watch thrust loss." ask="Why not bend the teeth all the way in? (Thrust loss grows with the square of the bend; the hiss grows too.)" />
    </div>
  );
}
