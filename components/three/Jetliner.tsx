"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { loftGeometry } from "@/lib/scene/loft";
import { fuselage } from "@/lib/scene/bodies";
import { chevronNozzle, revolve } from "./Turbofan";
import type { ChevronShape } from "@/lib/jet";

/* A twin-engine airliner, 1 unit long, nose towards +z. Built from a lofted fuselage, extruded
   swept wings and tail, and two nacelles whose exhausts carry the chevrons. Navigation lights blink. */

function planform(span: number, root: number, tip: number, sweep: number, thick: number) {
  const s = new THREE.Shape();
  s.moveTo(0, root / 2);
  s.lineTo(span, root / 2 - sweep);
  s.lineTo(span, root / 2 - sweep - tip);
  s.lineTo(0, -root / 2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.45, bevelSize: thick * 0.6, bevelSegments: 2 });
  g.translate(0, 0, -thick / 2);
  return g;
}

export default function Jetliner({ count = 0, pen = 0, shape = "triangle", paint = "#f1f0f6", lights = true, exhaust = 1 }: {
  count?: number; pen?: number; shape?: ChevronShape; paint?: string; lights?: boolean; exhaust?: number;
}) {
  const strobe = useRef<THREE.MeshBasicMaterial>(null!);
  const beacon = useRef<THREE.MeshBasicMaterial>(null!);
  const geo = useMemo(() => {
    const body = loftGeometry(fuselage, 1, 72, 40);
    // wings lie in x (span) / z (chord): build in the xy plane then rotate flat
    const wing = planform(0.5, 0.2, 0.055, 0.2, 0.012).rotateX(Math.PI / 2);
    const tail = planform(0.17, 0.09, 0.035, 0.08, 0.007).rotateX(Math.PI / 2);
    // the fin is drawn in (chord, height) and turned edge-on: front at -x becomes +z
    const fs = new THREE.Shape();
    fs.moveTo(-0.07, 0); fs.lineTo(0.05, 0); fs.lineTo(0.1, 0.16); fs.lineTo(0.05, 0.16); fs.closePath();
    const fin = new THREE.ExtrudeGeometry(fs, { depth: 0.007, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2 }).translate(0, 0, -0.0035).rotateY(Math.PI / 2);
    const nacelle = revolve([[0.03, 0.06], [0.036, 0.055], [0.038, 0.0], [0.034, -0.06], [0.031, -0.062], [0.03, 0.06]], 40);
    const cone = revolve([[0.0001, -0.11], [0.012, -0.085], [0.016, -0.062]], 24);
    return { body, wing, tail, fin, nacelle, cone };
  }, []);
  const nozzle = useMemo(() => chevronNozzle({ r0: 0.031, r1: 0.029, len: 0.002, count, pen, shape, toothLen: 0.014 }), [count, pen, shape]);
  useEffect(() => () => { Object.values(geo).forEach((g) => g.dispose()); }, [geo]);
  useEffect(() => () => nozzle.dispose(), [nozzle]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (strobe.current) strobe.current.opacity = (t % 1.2) < 0.08 ? 1 : 0;
    if (beacon.current) beacon.current.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 5));
  });

  const metal = <meshPhysicalMaterial color={paint} metalness={0.3} roughness={0.35} clearcoat={0.7} side={THREE.DoubleSide} />;
  const engines = [-0.17, 0.17];
  return (
    <group>
      <mesh geometry={geo.body} castShadow>{metal}</mesh>
      {/* a violet cheat line and dark cockpit glass */}
      <mesh position={[0, 0.018, 0.47]} scale={[0.072, 0.02, 0.03]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#14151d" metalness={0.8} roughness={0.15} /></mesh>
      <mesh geometry={geo.wing} position={[0.05, -0.035, 0.04]} rotation={[0, 0, 0.06]} castShadow>{metal}</mesh>
      <mesh geometry={geo.wing} position={[-0.05, -0.035, 0.04]} rotation={[0, Math.PI, -0.06]} scale={[1, 1, -1]} castShadow>{metal}</mesh>
      <mesh geometry={geo.tail} position={[0.02, 0.03, -0.41]} castShadow>{metal}</mesh>
      <mesh geometry={geo.tail} position={[-0.02, 0.03, -0.41]} rotation={[0, Math.PI, 0]} scale={[1, 1, -1]} castShadow>{metal}</mesh>
      <mesh geometry={geo.fin} position={[0, 0.035, -0.4]} castShadow>
        <meshPhysicalMaterial color="#8f78ff" metalness={0.3} roughness={0.35} clearcoat={0.7} />
      </mesh>
      {engines.map((x) => (
        <group key={x} position={[x, -0.07, 0.11]}>
          <mesh geometry={geo.nacelle} castShadow><meshPhysicalMaterial color={paint} metalness={0.3} roughness={0.3} clearcoat={0.8} side={THREE.DoubleSide} /></mesh>
          <mesh geometry={nozzle} position-z={-0.062}><meshStandardMaterial color="#c9ccd6" metalness={1} roughness={0.3} side={THREE.DoubleSide} /></mesh>
          <mesh geometry={geo.cone}><meshStandardMaterial color="#8a7f75" metalness={0.9} roughness={0.4} /></mesh>
          {/* exhaust glow */}
          <mesh position-z={-0.13} rotation-x={Math.PI / 2}>
            <coneGeometry args={[0.03, 0.14, 16, 1, true]} />
            <meshBasicMaterial color="#ff9a5a" transparent opacity={0.25 * exhaust} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.04, 0.02]}><boxGeometry args={[0.01, 0.05, 0.08]} />{metal}</mesh>
        </group>
      ))}
      {lights && <>
        <mesh position={[-0.55, -0.005, -0.12]}><sphereGeometry args={[0.008, 8, 8]} /><meshBasicMaterial color={[4, 0.3, 0.3]} toneMapped={false} /></mesh>
        <mesh position={[0.55, -0.005, -0.12]}><sphereGeometry args={[0.008, 8, 8]} /><meshBasicMaterial color={[0.3, 4, 0.6]} toneMapped={false} /></mesh>
        <mesh position={[0, 0.0, -0.52]}><sphereGeometry args={[0.009, 8, 8]} /><meshBasicMaterial ref={strobe} color={[6, 6, 6]} transparent toneMapped={false} /></mesh>
        <mesh position={[0, 0.066, -0.05]}><sphereGeometry args={[0.007, 8, 8]} /><meshBasicMaterial ref={beacon} color={[5, 0.4, 0.3]} transparent toneMapped={false} /></mesh>
        <mesh position={[0, -0.05, 0.42]}><sphereGeometry args={[0.009, 8, 8]} /><meshBasicMaterial color={[5, 5, 4.4]} toneMapped={false} /></mesh>
      </>}
    </group>
  );
}
