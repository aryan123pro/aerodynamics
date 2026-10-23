"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useTunnelSound, wakeOf } from "@/components/ch2/Tunnel";
import { Wheel } from "@/components/three/Bodies";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import TunnelSmoke from "@/components/three/TunnelSmoke";
import WindTunnel from "@/components/three/WindTunnel";
import { CellTag, Notes, Plate, Range, Readouts, SoundCue } from "@/components/ui";
import { bodyCd, dragN, evRangeKm, fuelL100, PRESETS, type Body } from "@/lib/car";
import { CAR_LEN, sculpt } from "@/lib/scene/bodies";
import { loftGeometry } from "@/lib/scene/loft";
import { HUSH, ROAR, YELLOW, fmt } from "@/lib/plot";
import { store } from "@/lib/site";

/* L2 · Wind Tunnel. Six sliders, each a thing car designers really change, reshape a lofted body live.
   The drag coefficient is a teaching build-up (lib/car.ts) calibrated so the presets land on the
   measured values: boxfish 0.06, Bionic 0.19, a normal car ~0.30, a brick ~1. The bar shows where the
   drag comes from. Then drive it: diesel per 100 km and electric range at a chosen speed. */

const SLIDERS: [keyof Body, string, string, string][] = [
  ["nose", "Nose", "sharp box", "rounded"],
  ["roof", "Windscreen", "upright", "raked"],
  ["tail", "Tail taper", "square cut", "boat-tail"],
  ["wheels", "Open wheels", "covered", "exposed"],
  ["ride", "Underbody", "rough", "smooth, sealed"],
  ["keel", "Boxfish keels", "none", "full"],
];
const PART_COLORS: Record<string, string> = { friction: "#9d86ff", fore: "#ff6b4a", roof: "#ff9a52", base: "#ffc457", wheels: "#55d4ff", ground: "#5eead0" };
const PART_NAMES: Record<string, string> = { friction: "skin friction", fore: "front", roof: "windscreen", base: "wake behind", wheels: "wheels", ground: "underbody" };

function SculptedCar({ b }: { b: Body }) {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  useMemo(() => loftGeometry(sculpt(b), CAR_LEN, 110, 64, geo), [b, geo]);
  useEffect(() => () => geo.dispose(), [geo]);
  const show = b.wheels > 0.04;
  const cover = Math.max(0, 1 - b.wheels * 1.4);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c9dc4f" metalness={0.7} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      {show && <>
        <Wheel position={[0.8, 0.32, 1.25]} cover={cover} spin={8} /><Wheel position={[-0.8, 0.32, 1.25]} cover={cover} spin={8} />
        <Wheel position={[0.8, 0.32, -1.3]} cover={cover} spin={8} /><Wheel position={[-0.8, 0.32, -1.3]} cover={cover} spin={8} />
      </>}
    </group>
  );
}

export default function TunnelLab() {
  const [b, setB] = useState<Body>(PRESETS.normal.body);
  const [kmh, setKmh] = useState(110);
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => { setBest(store<number>("tunnelBest")); }, []);
  const { cd, parts } = bodyCd(b);
  useEffect(() => { if (best == null || cd < best) { setBest(cd); store("tunnelBest", cd); } }, [cd]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = kmh / 3.6, A = 2.2, mass = 1250;
  useTunnelSound(v, cd);
  const total = Object.values(parts).reduce((s, x) => s + Math.max(0, x), 0);

  return (
    <div className="lab-grid">
      <Plate n="L2" title="Sculpt a car body in the wind tunnel" note="drag to turn · scroll to zoom">
        <Stage3D label="A sculptable car body in a wind tunnel with smoke" camera={{ position: [2.5, 1.9, 4.9], fov: 46 }} look={{ bloom: 0.55 }}
          overlay={<>
            <CellTag>Wind tunnel lab · {fmt(kmh)} km/h</CellTag>
            <div className="hud tag hud-tr"><span className="k">drag coefficient</span><span className="big" style={{ color: cd <= 0.19 ? HUSH : cd > 0.4 ? ROAR : YELLOW }}>{cd.toFixed(3)}<small>Cd</small></span><span className="k">{cd <= 0.19 ? "beats the Bionic Car!" : "Bionic Car: 0.19"}</span></div>
            <div className="strip" style={{ left: "auto", width: "min(340px, calc(100% - 24px))" }}>
              <Range label="Wind speed" value={kmh} min={30} max={200} step={5} onChange={setKmh} fmt={(x) => x + " km/h"} />
            </div>
          </>}>
          <WindTunnel fan={kmh / 100} />
          <SculptedCar b={b} />
          <TunnelSmoke center={[0, 0.86, 0]} radii={[0.92, 0.7, 2.15]} wake={wakeOf(cd)} sep={Math.max(0, 1 - b.nose * 1.6)} speed={kmh / 90} span={[0.5, 2.3]} lanes={[3, 12]} />
          <Label3D position={[0, 3.05, 7.6]} color={YELLOW} size={0.3}>AIR IN</Label3D>
          <OrbitControls makeDefault target={[0, 0.9, -0.6]} enablePan={false} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <aside className="lab-side">
        <div className="panel">
          <h4>Presets</h4>
          <div className="row">{Object.entries(PRESETS).map(([k, p]) => <button key={k} className="btn sm" onClick={() => setB(p.body)}>{p.name}</button>)}</div>
          {SLIDERS.map(([k, label, lo, hi]) => (
            <Range key={k} label={label} value={b[k]} min={0} max={1} step={0.01} onChange={(x) => setB({ ...b, [k]: x })} fmt={(x) => (x < 0.15 ? lo : x > 0.85 ? hi : fmt(x * 100) + "%")} />
          ))}
        </div>
        <div className="panel">
          <h4>Where the drag comes from</h4>
          <div style={{ display: "flex", height: 16, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
            {Object.entries(parts).map(([k, x]) => <i key={k} title={PART_NAMES[k]} style={{ width: (Math.max(0, x) / total) * 100 + "%", background: PART_COLORS[k] }} />)}
          </div>
          <div className="legend">{Object.entries(parts).map(([k, x]) => <span key={k}><i style={{ background: PART_COLORS[k] }} />{PART_NAMES[k]} {fmt(Math.max(0, x), 3)}</span>)}</div>
        </div>
        <Readouts items={[
          ["Drag at speed", fmt(dragN(cd, A, v)), "N"],
          ["Diesel", fmt(fuelL100(cd, A, mass, v), 1), "L/100 km", "acc"],
          ["EV range", fmt(evRangeKm(cd, A, mass, v)), "km", "cool"],
          ["Your best", best == null ? "—" : best.toFixed(3), "Cd"],
        ]} />
        <SoundCue label="Hear the tunnel" />
        <p className="faint" style={{ fontSize: 12.5 }}>Teaching model, not CFD: each slider adds or removes a share of drag sized from wind-tunnel experience, calibrated to the measured presets. The smoke uses ideal flow around the body, with a wake sized by its drag.</p>
      </aside>
      <Notes say="Start from Normal compact and try to beat the Bionic Car's 0.19. You'll find the tail and the wheels matter as much as the nose." ask="Why does a boat-tail help so much? (The wake behind is where most drag hides.)" />
    </div>
  );
}
