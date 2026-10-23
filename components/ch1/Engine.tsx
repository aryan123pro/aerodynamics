"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Floor from "@/components/three/Floor";
import Turbofan, { Plume } from "@/components/three/Turbofan";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { dbaOf } from "@/lib/audio";
import { areaForThrust, jetBands, jetSpeedForBpr, oaspl, PLAIN } from "@/lib/jet";
import { AMBER, CYAN, ROSE, VIOLET, fmt, range } from "@/lib/plot";

/* Inside the jet: where the roar comes from. A cutaway turbofan, its hot core and cold bypass streams,
   and Lighthill's law: for a fixed thrust, sound power grows with jet speed to roughly the 8th power,
   so engines got quieter by getting fatter (more bypass air, slower jet). */
const THRUST = 120_000; // N, one engine at take-off, a 787-class twin
const ERAS: [number, string][] = [[0, "1958 turbojet"], [1.5, "1970s low bypass"], [5, "1990s"], [10, "787 / GEnx"]];

export default function Engine() {
  const [bpr, setBpr] = useState(10);
  const [thr, setThr] = useState(100);
  const [cut, setCut] = useState(true);
  const vj = jetSpeedForBpr(bpr) * Math.sqrt(thr / 100);
  const area = areaForThrust(THRUST, jetSpeedForBpr(bpr));
  const d = Math.sqrt((4 * area) / Math.PI);
  const ref = oaspl(jetSpeedForBpr(10), areaForThrust(THRUST, jetSpeedForBpr(10)), 300);
  const l300 = oaspl(vj, area, 300);
  const bands = useMemo(() => jetBands({ vj, d }, PLAIN, 300, 110), [vj, d]);
  const dba = dbaOf(bands) + 3;
  const { voice, on } = useVoice({ ref: 104, unit: "dBA" });
  useEffect(() => { voice?.setSpectrum(bands.map((b) => b + 3), dba); voice?.setFlutter(0, 0); }, [voice, on, bands, dba]);

  // visual: a fatter engine for more bypass; the plume speeds up with the jet
  const fat = Math.min(1.12, Math.max(0.5, Math.sqrt(area / areaForThrust(THRUST, jetSpeedForBpr(10)))));
  const vs = range(150, 800, 40);
  const curve = vs.map((v) => oaspl(v, areaForThrust(THRUST, v), 300));

  return (
    <div className="split">
      <Plate n="I·3" title="A turbofan, cut open" note="drag to turn · scroll to zoom">
        <Stage3D label="A cutaway turbofan engine with its exhaust plume" camera={{ position: [8.2, 3.2, 5.4], fov: 34 }} look={{ bloom: 0.9 }}
          overlay={<>
            <CellTag>Cell I · engine test stand</CellTag>
            <div className="hud tag hud-tr"><span className="k">jet speed</span><span className="big">{fmt(vj)}<small>m/s</small></span><span className="k">at 300 m</span><span className="big">{fmt(l300, 1)}<small>dB</small></span></div>
            <div className="strip">
              <Range label="Bypass ratio (cold air ÷ hot air)" value={bpr} min={0} max={12} step={0.5} onChange={setBpr} fmt={(v) => v.toFixed(1) + " : 1"} />
              <Range label="Throttle" value={thr} min={40} max={100} onChange={setThr} fmt={(v) => v + "%"} />
              <Seg options={[[true, "Cut open"], [false, "Closed"]]} value={cut} onChange={setCut} label="Cutaway" />
            </div>
          </>}>
          <group position={[0, 1.25, 0]}>
            <group scale={[fat, fat, 1]}>
              <Turbofan cutaway={cut} spin={thr / 100} glow={0.6 + (thr / 100) * 0.6} />
            </group>
            <group scale={[fat, fat, 1]}>
              <Plume mixing={0} speed={vj / 260} length={13} coreLen={6.5} power={0.6 + thr / 250} />
            </group>
            {cut && <>
              <Label3D size={0.24} position={[0.2, 1.75, 1.4]} to={[0, 0.7, 1.3]}>FAN · moves most of the air</Label3D>
              <Label3D size={0.24} position={[0.3, -1.0, 0.9]} to={[0, -0.35, 0.4]} color="#9fc4ff">COMPRESSOR · squeezes the core air</Label3D>
              <Label3D size={0.24} position={[0.3, 1.35, -0.2]} to={[0, 0.38, -0.18]} color={AMBER}>COMBUSTOR · burns fuel</Label3D>
              <Label3D size={0.24} position={[0.3, -1.1, -1.3]} to={[0, -0.42, -0.95]} color="#ffad60">TURBINE · drives fan + compressor</Label3D>
            </>}
            <Label3D position={[0, 1.5, -3.8]} color={CYAN} size={0.26}>COLD BYPASS AIR</Label3D>
            <Label3D position={[0, -1.1, -3.4]} color="#ff9a52" size={0.26}>HOT CORE JET</Label3D>
            <Label3D position={[0, 2.3, -6.6]} to={[0, 0.9, -5.8]} color={ROSE} size={0.26}>SHEAR LAYER · where the noise is made</Label3D>
          </group>
          <Floor y={-0.02} color={VIOLET} />
          <OrbitControls makeDefault target={[0, 1.0, -2.2]} enablePan={false} minDistance={3} maxDistance={16} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>Where does a jet&apos;s roar come from?</strong> Not mostly from the moving parts. It comes from the exhaust: a fast, hot jet tearing into still air. The edge between them, the <em>shear layer</em>, churns into eddies, and the eddies shake the air.</p>
          <p>In 1952 James Lighthill showed that the sound power of a jet grows with roughly the <strong>8th power</strong> of its speed. Double the speed and you get 2⁸ = 256 times the sound.</p>
        </div>
        <div className="formula">sound power ∝ ρ D² <b>U⁸</b> / c⁵ &nbsp;&nbsp;→&nbsp; at fixed thrust: ∝ thrust × <b>U⁶</b></div>
        <Readouts items={[
          ["Jet speed", fmt(vj), "m/s", "acc"],
          ["Level at 300 m", fmt(dba, 0), "dBA", dba > 95 ? "hot" : undefined],
          ["vs a 787 engine", (l300 - ref >= 0 ? "+" : "") + fmt(l300 - ref, 1), "dB", l300 - ref > 3 ? "hot" : "cool"],
          ["Exit diameter", fmt(d, 2), "m"],
        ]} />
        <Plot label="Sound level at 300 m against jet speed, for the same thrust" height={190} opts={{
          x: [150, 800], y: [60, 115], xticks: [200, 300, 400, 500, 600, 700, 800], yticks: [60, 70, 80, 90, 100, 110], xlabel: "jet speed, m/s (same thrust)", ylabel: "dB at 300 m",
          series: [{ xs: vs, data: curve, color: AMBER, width: 2.2 }],
          markers: [{ x: Math.min(800, Math.max(150, vj)), label: "this engine", color: ROSE }],
        }} />
        <div className="row">
          {ERAS.map(([b, l]) => <button key={l} className="btn sm" aria-pressed={bpr === b} onClick={() => { setBpr(b); setThr(100); }}>{l}</button>)}
        </div>
        <SoundCue label="Hear it from 300 m away" />
        <p className="faint" style={{ fontSize: 13 }}>So the first big cut in jet noise was not chevrons. It was the turbofan itself: a huge fan pushing lots of slow, cold air instead of a little fast, hot air. Chevrons then attack what is left, in the shear layer.</p>
      </div>
      <Notes say="Slide the bypass ratio to zero: that is a 1950s turbojet. Same thrust, but the jet is about 2.5 times faster, and Lighthill's law makes it more than 20 dB louder."
        show="Click 1958 turbojet, then 787 / GEnx, with the sound on." ask="If speed matters so much, why not just make the jet slower still? (A bigger fan is heavier and has more drag; there is a limit.)" />
    </div>
  );
}
