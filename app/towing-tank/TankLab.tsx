"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Label3D from "@/components/three/Label3D";
import { NearWallFlow, ribHeight, RibSurface, WALL_UNITS } from "@/components/three/RibletWall";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg } from "@/components/ui";
import { cfLocal, dragReduction, flowNoiseDelta, KNOT, NU_SEA, RHO_SEA, RIBS, splus, type RibShape } from "@/lib/riblet";
import { CYAN, HUSH, ROAR, ROSE, fmt, range } from "@/lib/plot";

/* L3 · Towing Tank. A carriage tows a hull plate through a long tank. Choose a riblet shape, its real
   spacing in micrometres, how worn it is, and the ship's speed. s⁺ follows from the flat-plate friction
   law at a point 30 m from the bow; drag reduction from the Bechert-type curves. Then scale it up to a
   100 m ship: skin friction is ~60% of its resistance, so a riblet cut of DR saves ~0.6 DR of the power. */

const SHIP = { L: 100, S: 3000, frictionShare: 0.6, sfc: 0.19 }; // m, m² wetted, share, kg fuel per kWh

function useWater({ speed }: { speed: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uX: { value: 0 }, uU: { value: 1 } },
    vertexShader: "varying vec2 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uT, uX, uU; varying vec2 vP;
      void main(){
        vec2 d = vP - vec2(0.0, uX);
        // a Kelvin wake: the 19.5° V behind the strut
        float behind = step(d.y, 0.0);
        float ang = abs(d.x) / max(0.001, -d.y);
        float vee = behind * exp(-pow((ang - 0.354) * 9.0, 2.0)) * exp(d.y * 0.08) * smoothstep(0.0, 1.0, -d.y);
        float ripple = 0.5 + 0.5 * sin(d.y * 6.0 * (1.0 / max(0.4, uU)) + uT * 3.0) ;
        float w = 0.08 + 0.05 * sin(vP.x * 2.0 + uT) * sin(vP.y * 1.3 - uT * 0.7);
        vec3 col = vec3(0.05, 0.25, 0.35) + w;
        col += vec3(0.8, 0.95, 1.0) * vee * ripple * 0.55 * uU;
        gl_FragColor = vec4(col, 0.72);
      }`,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_s, dt) => { mat.uniforms.uT.value += dt; mat.uniforms.uU.value = speed; });
  return { mat };
}

function Tank({ kn }: { kn: number }) {
  const carriage = useRef<THREE.Group>(null!);
  const speed = Math.min(1.6, kn / 15);
  const { mat } = useWater({ speed });
  useFrame(({ clock }) => {
    const L = 34, z = L / 2 - ((clock.elapsedTime * speed * 2.2) % L);
    carriage.current.position.z = z;
    mat.uniforms.uX.value = z;
  });
  return (
    <group>
      {/* the tank: glass sides, dark floor, rails */}
      <mesh position={[0, -1.2, 0]}><boxGeometry args={[4, 0.1, 36]} /><meshStandardMaterial color="#0b1622" /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 2, -0.35, 0]}><boxGeometry args={[0.05, 1.8, 36]} /><meshPhysicalMaterial color="#8fd0ff" transparent opacity={0.12} roughness={0.05} depthWrite={false} /></mesh>
          <mesh position={[s * 2.15, 0.62, 0]}><boxGeometry args={[0.12, 0.08, 36]} /><meshStandardMaterial color="#9a9fb3" metalness={0.9} roughness={0.3} /></mesh>
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0} material={mat}><planeGeometry args={[4, 36, 1, 1]} /></mesh>
      <group ref={carriage}>
        <mesh position={[0, 0.85, 0]} castShadow><boxGeometry args={[4.6, 0.35, 1.2]} /><meshStandardMaterial color="#ffd84a" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.08, 1.1, 0.3]} /><meshStandardMaterial color="#c9cbe0" metalness={0.9} roughness={0.3} /></mesh>
        {/* the hull plate under the water */}
        <mesh position={[0, -0.45, -0.6]}><boxGeometry args={[0.06, 0.6, 2.6]} /><meshPhysicalMaterial color="#55d4ff" metalness={0.4} roughness={0.25} clearcoat={1} /></mesh>
        <Label3D position={[0, 1.5, 0]} color="#ffd84a" size={0.32}>{`CARRIAGE · ${fmt(kn)} kn (scaled)`}</Label3D>
      </group>
    </group>
  );
}

export default function TankLab() {
  const [shape, setShape] = useState<RibShape>("blade");
  const [um, setUm] = useState(60);
  const [kn, setKn] = useState(15);
  const [wear, setWear] = useState(0);
  const [x, setX] = useState(30);
  const U = kn * KNOT;
  const sp = splus(um, U, x);
  const dr = dragReduction(sp, shape, wear);
  // the ship: friction drag from the flat-plate average Cf, then total resistance
  const ReL = (U * SHIP.L) / NU_SEA, CfAvg = 0.074 * Math.pow(ReL, -0.2);
  const Rf = 0.5 * RHO_SEA * U * U * SHIP.S * CfAvg, Rtot = Rf / SHIP.frictionShare;
  const P = (Rtot * U) / 1000; // kW
  const saved = P * SHIP.frictionShare * (dr / 100);
  const fuel = (saved * 24 * SHIP.sfc) / 1000; // t per day
  const kns = range(2, 35, 67);
  const S = sp / WALL_UNITS, H = ribHeight(shape, S);
  const sink = Math.min(1, Math.max(0, (sp - 22) / 14));

  return (
    <div className="lab-grid">
      <div className="stack">
        <Plate n="L3" title="The towing tank: a hull plate dragged through still water" note="drag to turn · scroll to zoom">
          <Stage3D label="A towing tank with a carriage pulling a hull plate through water" camera={{ position: [7, 4, 9], fov: 38 }} background="radial-gradient(ellipse 90% 80% at 50% 0%, #10304a, #03101a 75%)" look={{ bloom: 0.5 }}>
            <Tank kn={kn} />
            <OrbitControls makeDefault target={[0, -0.2, 0]} enablePan={false} minDistance={4} maxDistance={30} maxPolarAngle={Math.PI * 0.49} />
          </Stage3D>
        </Plate>
        <Plate n="L3·b" title={`Under the microscope: the riblets on that plate (s⁺ = ${fmt(sp, 1)})`} note="the same wall-unit view as Chapter III">
          <Stage3D label="Close-up of the riblets and near-wall vortices at the chosen design point" style={{ height: "min(46svh, 420px)" }} camera={{ position: [3.2, 2.0, 8.4], fov: 34 }} background="radial-gradient(ellipse 80% 70% at 50% 30%, #0e2a3d, #03101a 80%)" look={{ bloom: 0.6 }}
            overlay={<><CellTag>Microscope · wear {fmt(wear * 100)}%</CellTag><div className="hud tag hud-tr"><span className="k">drag cut</span><span className="big" style={{ color: dr > 0 ? HUSH : ROAR }}>{fmt(dr, 1)}<small>%</small></span></div></>}>
            <group scale={[1, 1 - wear * 0.6, 1]}><RibSurface shape={shape} S={S} /></group>
            <NearWallFlow S={S} H={H * (1 - wear * 0.6)} smooth={false} sink={sink} />
            <OrbitControls makeDefault target={[0, 0.6, 0]} enablePan={false} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI * 0.48} />
          </Stage3D>
        </Plate>
      </div>

      <aside className="lab-side">
        <div className="panel">
          <h4>Riblets</h4>
          <Seg options={(Object.keys(RIBS) as RibShape[]).map((k) => [k, RIBS[k].name])} value={shape} onChange={setShape} label="Shape" />
          <Range label="Spacing" value={um} min={10} max={250} step={5} onChange={setUm} fmt={(v) => v + " µm"} />
          <Range label="Wear (rounded tips)" value={wear} min={0} max={1} step={0.05} onChange={setWear} fmt={(v) => fmt(v * 100) + "%"} />
        </div>
        <div className="panel">
          <h4>Ship</h4>
          <Range label="Speed" value={kn} min={2} max={35} step={1} onChange={setKn} fmt={(v) => v + " kn"} />
          <Range label="Measured at, from the bow" value={x} min={2} max={95} step={1} onChange={setX} fmt={(v) => v + " m"} />
        </div>
        <Readouts items={[
          ["s⁺ here", fmt(sp, 1), "", sp > 10 && sp < 20 ? "cool" : sp > 28 ? "hot" : undefined],
          ["Drag cut", fmt(dr, 1), "%", dr > 0 ? "cool" : "hot"],
          ["Power saved", fmt(saved), "kW", "acc"],
          ["Fuel saved", fmt(fuel, 2), "t / day"],
          ["Noise forcing", fmt(flowNoiseDelta(dr), 2), "dB"],
          ["Cf at this point", (cfLocal((U * x) / NU_SEA) * 1000).toFixed(2), "×10⁻³"],
        ]} />
        <div className="panel">
          <h4>Drag cut across the ship&apos;s speed range</h4>
          <Plot label="Drag reduction against ship speed for the chosen riblets" height={180} opts={{
            x: [2, 35], y: [-10, 12], xticks: [5, 10, 15, 20, 25, 30, 35], yticks: [-10, -5, 0, 5, 10], xlabel: "speed, knots", ylabel: "drag cut %",
            series: [{ xs: kns, data: kns.map((k) => dragReduction(splus(um, k * KNOT, x), shape, wear)), color: CYAN, width: 2.4 }],
            hlines: [{ y: 0, color: "#7c798f" }], markers: [{ x: kn, color: ROSE, label: `${kn} kn` }],
          }} />
          <p className="faint" style={{ fontSize: 12.5 }}>A riblet is tuned to one speed: too slow and it does little, too fast and the grooves swallow the vortices. Wear rounds the tips and flattens the whole curve.</p>
        </div>
      </aside>
      <Notes say="Find the spacing that works at 15 knots, then push the speed to 30 and watch the benefit disappear, then turn into extra drag." ask="A ship cruises at one speed but a submarine changes speed often. Who benefits more from riblets?" />
    </div>
  );
}
