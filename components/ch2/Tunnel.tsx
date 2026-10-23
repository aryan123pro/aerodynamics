"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { TunnelBody, type BodyKind } from "@/components/three/Bodies";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import TunnelSmoke from "@/components/three/TunnelSmoke";
import WindTunnel from "@/components/three/WindTunnel";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { BANDS } from "@/lib/audio";
import { dragN, vehicle, VEHICLES, windNoise } from "@/lib/car";
import { hump } from "@/lib/jet";
import { fmt, YELLOW } from "@/lib/plot";

/* Into the wind tunnel. The models Mercedes-Benz actually tested in 2005, plus an ordinary car and a brick
   for scale, at full size in smoke. Cd and the forces come from lib/car.ts; the smoke from TunnelSmoke.
   Drag F = ½ ρ v² Cd A; the power to push the air aside is F × v. */

export const SMOKE_FIT: Record<BodyKind, { c: [number, number, number]; r: [number, number, number]; sep: number }> = {
  fish: { c: [0, 0.95, 0.05], r: [0.7, 0.82, 2.15], sep: 0 },
  clay: { c: [0, 0.92, 0], r: [0.85, 0.75, 2.15], sep: 0 },
  bionic: { c: [0, 0.86, 0], r: [0.92, 0.72, 2.15], sep: 0 },
  normal: { c: [0, 0.84, 0], r: [0.9, 0.66, 2.13], sep: 0.25 },
  brick: { c: [0, 0.85, 0], r: [0.92, 0.68, 2.13], sep: 1 },
};
/** How big the wake is: the share of drag that is not skin friction. */
export const wakeOf = (cd: number) => Math.min(1.4, Math.max(0.05, (cd - 0.04) / 0.32));

export function useTunnelSound(v: number, cd: number) {
  const { voice, on } = useVoice({ ref: 104, unit: "dB" });
  const bands = useMemo(() => {
    const l = windNoise(v, cd), w = wakeOf(cd);
    // the tunnel's broadband roar, plus low-frequency buffeting from the body's wake
    return BANDS.map((f) => l + hump(f, 180 * (v / 30), 1.2, 1.3) + 10 * Math.log10(1 + 4 * w * Math.pow(10, hump(f, 40 * (v / 30), 1.5, 2) / 10)));
  }, [v, cd]);
  useEffect(() => { voice?.setSpectrum(bands, windNoise(v, cd)); }, [voice, on, bands, v, cd]);
}

export default function Tunnel() {
  const [kind, setKind] = useState<BodyKind>("bionic");
  const [kmh, setKmh] = useState(120);
  const v = kmh / 3.6;
  const car = vehicle(kind);
  const F = dragN(car.cd, car.area, v);
  const fit = SMOKE_FIT[kind];
  useTunnelSound(v, car.cd);

  return (
    <div className="split">
      <Plate n="II·2" title="Five models, one wind tunnel, full size" note="drag to turn · scroll to zoom">
        <Stage3D label="A wind tunnel with a car-sized model and smoke streamlines" camera={{ position: [2.5, 1.9, 4.9], fov: 46 }} look={{ bloom: 0.55 }}
          overlay={<>
            <CellTag>Cell II · wind tunnel · {fmt(kmh)} km/h</CellTag>
            <div className="hud tag hud-tr"><span className="k">drag coefficient</span><span className="big" style={{ color: car.color }}>{car.cd.toFixed(car.cd < 0.1 ? 3 : 2)}<small>Cd</small></span><span className="k">drag at {fmt(kmh)} km/h</span><span className="big">{fmt(F)}<small>N</small></span></div>
            <div className="hud tag hud-bl" style={{ display: "grid", gap: 4 }}>
              <span className="k">smoke colour</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#ff8c40", marginRight: 8 }} />air slows · pressure up</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#5ae6ff", marginRight: 8 }} />air speeds up · pressure down</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#ff6b4a", marginRight: 8 }} />turbulent wake</span>
            </div>
            <div className="strip" style={{ left: "auto", width: "min(360px, calc(100% - 24px))" }}>
              <Range label="Wind speed" value={kmh} min={30} max={200} step={5} onChange={setKmh} fmt={(x) => x + " km/h"} />
            </div>
          </>}>
          <WindTunnel fan={kmh / 100} />
          <group key={kind}>
            <TunnelBody kind={kind} spin={v / 0.32} />
          </group>
          <TunnelSmoke center={fit.c} radii={fit.r} wake={wakeOf(car.cd)} sep={fit.sep} speed={kmh / 90} span={[0.5, 2.3]} lanes={[3, 12]} />
          <Label3D position={[0, 3.05, 7.6]} color={YELLOW} size={0.3}>AIR IN · honeycomb straightener</Label3D>
          <OrbitControls makeDefault target={[0, 0.9, -0.6]} enablePan={false} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={VEHICLES.map((x) => [x.id as BodyKind, x.name])} value={kind} onChange={setKind} label="Model in the tunnel" />
        <p className="faint" style={{ fontSize: 13, marginTop: -4 }}>{car.note}</p>
        <Readouts items={[
          ["Drag coefficient", car.cd.toFixed(car.cd < 0.1 ? 3 : 2), "Cd", "acc"],
          ["Drag force", fmt(F), "N"],
          ["Power to push air", fmt((F * v) / 1000, 1), "kW", car.cd > 0.5 ? "hot" : undefined],
          ["vs normal car", fmt((car.cd / 0.3) * 100), "%", car.cd < 0.3 ? "cool" : "hot"],
        ]} />
        <div className="formula">drag force F = ½ ρ v² <b>C<sub>d</sub></b> A &nbsp;·&nbsp; power = F × v</div>
        <Plot label="Drag coefficient of each model" height={200} opts={{
          x: [-0.6, VEHICLES.length - 0.4], y: [0, 1.1], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0], padL: 38,
          bars: VEHICLES.map((x, i) => ({ x: i, v: x.cd, w: 0.6, color: x.id === kind ? x.color : x.color + "55", label: x.name.replace("Normal compact", "Normal").replace("Boxfish model", "Boxfish") })),
          hlines: [{ y: 0.3, label: "typical car 0.25–0.35", color: "#7c798f" }],
        }} />
        <SoundCue label="Hear the tunnel" />
      </div>
      <Notes say="Same tunnel, same speed. The boxfish model reached a drag coefficient of 0.06, which is astonishing for a box. The car built from it got 0.19, still far below the 0.3 of a normal car." show="Click Brick, then Boxfish, then Bionic Car. Watch the wake behind each." ask="The fish scored 0.06 but the car only 0.19. What did the car add that the fish doesn't have? (Wheels, mirrors, a road underneath, a flat underbody.)" />
    </div>
  );
}
