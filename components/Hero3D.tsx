"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Boxfish, TunnelBody } from "./three/Bodies";
import Label3D from "./three/Label3D";
import Owl from "./three/Owl";
import Shark from "./three/Shark";
import Stage3D from "./three/Stage3D";
import Submarine from "./three/Submarine";
import Turbofan from "./three/Turbofan";
import { Seg } from "./ui";

/* Three specimens on the glowing podiums of the team's deck. Switch Nature → Machine and each animal
   gives way to the machine it inspired. Click a podium to open its chapter. */

function Podium({ color }: { color: string }) {
  return (
    <group>
      <mesh position-y={-0.16} receiveShadow castShadow>
        <boxGeometry args={[2.1, 0.32, 2.1]} />
        <meshPhysicalMaterial color="#2a2340" roughness={0.25} metalness={0.4} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position-y={-0.005} rotation-x={-Math.PI / 2}><ringGeometry args={[0.95, 1.0, 64]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} /></mesh>
      <pointLight position={[0, 0.4, 1.4]} color={color} intensity={0.7} distance={3} />
    </group>
  );
}

function Swap({ show, children }: { show: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => {
    const k = g.current.scale.x + ((show ? 1 : 0.0001) - g.current.scale.x) * Math.min(1, dt * 5);
    g.current.scale.setScalar(k); g.current.visible = k > 0.01;
  });
  return <group ref={g} scale={show ? 1 : 0.0001}>{children}</group>;
}

function Turntable({ children, speed = 0.25 }: { children: React.ReactNode; speed?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { g.current.rotation.y += dt * speed; });
  return <group ref={g}>{children}</group>;
}

export default function Hero3D({ className = "stage hero-stage" }: { className?: string }) {
  const [mode, setMode] = useState<"nature" | "machine">("nature");
  const router = useRouter();
  const nat = mode === "nature";
  const items = [
    { x: -3, c: "#f4b860", href: "/owl", a: "BARN OWL", m: "CHEVRON NOZZLE" },
    { x: 0, c: "#ffd84a", href: "/boxfish", a: "YELLOW BOXFISH", m: "BIONIC CAR" },
    { x: 3, c: "#55d4ff", href: "/shark", a: "SHORTFIN MAKO", m: "QUIET SUBMARINE" },
  ];
  return (
    <Stage3D className={className} label="Three podiums: a barn owl, a boxfish and a shark, or the chevron nozzle, Bionic Car and submarine they inspired" camera={{ position: [0.6, 2.4, 9.4], fov: 36 }} look={{ bloom: 0.8 }}
      background="radial-gradient(ellipse 70% 60% at 50% 100%, rgba(157,134,255,.35), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(255,122,217,.2), transparent 70%), #07080c"
      overlay={<div className="hero-switch"><Seg options={[["nature", "Nature"], ["machine", "Machine"]]} value={mode} onChange={setMode} label="Show" /></div>}>
      <group position={[3.1, 0, 0]} scale={0.72}>
      {items.map((it, i) => (
        <group key={it.href} position={[it.x, 0, 0]} onClick={(e) => { e.stopPropagation(); router.push(it.href); }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
          <Podium color={it.c} />
          <Turntable speed={0.18 + i * 0.04}>
            {i === 0 && <>
              <Swap show={nat}><group scale={1.8}><Owl glide={0.8} /></group></Swap>
              <Swap show={!nat}><group position-y={0.95} scale={0.55} rotation-y={0.6}><Turbofan fanCount={14} fanPen={0.6} coreCount={12} corePen={0.6} /></group></Swap>
            </>}
            {i === 1 && <>
              <Swap show={nat}><group position-y={0.15} scale={0.33}><Boxfish /></group></Swap>
              <Swap show={!nat}><group scale={0.42}><TunnelBody kind="bionic" /></group></Swap>
            </>}
            {i === 2 && <>
              <Swap show={nat}><group position-y={0.75} scale={1.75}><Shark /></group></Swap>
              <Swap show={!nat}><group position-y={0.7} scale={2.0}><Submarine prop={0.6} riblets /></group></Swap>
            </>}
          </Turntable>
          <Label3D position={[0, -0.85, 1.15]} color={it.c} size={0.3}>{nat ? it.a : it.m}</Label3D>
        </group>
      ))}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.48} target={[0.6, 0.6, 0]} />
    </Stage3D>
  );
}
