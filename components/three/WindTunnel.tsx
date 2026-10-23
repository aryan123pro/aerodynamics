"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* A closed test section: a floor with a turntable, glass side walls in steel frames, strip lights in the
   ceiling, a honeycomb flow straightener upstream (+z), a rake of smoke nozzles, and the drive fan
   downstream (-z). Air flows towards -z. */
export default function WindTunnel({ length = 16, width = 6, height = 3.6, fan = 1, turntable = 0 }: { length?: number; width?: number; height?: number; fan?: number; turntable?: number }) {
  const fanRef = useRef<THREE.Group>(null!);
  const tt = useRef<THREE.Mesh>(null!);
  useFrame((_s, dt) => { if (fanRef.current) fanRef.current.rotation.z += dt * 4 * fan; if (tt.current) tt.current.rotation.y = turntable; });
  const honey = useMemo(() => {
    // hexagon outlines across the inlet
    const pts: number[] = [];
    const r = 0.22, dx = r * Math.sqrt(3), dy = r * 1.5;
    for (let row = 0; row * dy < height; row++) for (let col = 0; col * dx < width + dx; col++) {
      const cx = -width / 2 + col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
      for (let k = 0; k < 6; k++) {
        const a0 = Math.PI / 6 + (k * Math.PI) / 3, a1 = a0 + Math.PI / 3;
        pts.push(cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0, cx + r * Math.cos(a1), cy + r * Math.sin(a1), 0);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); return g;
  }, [width, height]);
  const frames = [];
  for (let z = -length / 2; z <= length / 2 + 0.01; z += 2) frames.push(z);
  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[width, length]} /><meshStandardMaterial color="#14161f" roughness={0.6} metalness={0.3} /></mesh>
      <mesh ref={tt} rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <ringGeometry args={[2.2, 2.32, 96]} />
        <meshBasicMaterial color="#ffd84a" transparent opacity={0.55} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow><circleGeometry args={[2.2, 96]} /><meshStandardMaterial color="#1b1e2b" roughness={0.5} metalness={0.5} /></mesh>
      {/* glass walls and frames */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * width / 2, height / 2, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[length, height]} />
          <meshPhysicalMaterial color="#9fb6ff" transparent opacity={0.06} roughness={0.05} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {frames.map((z) => (
        <group key={z} position-z={z}>
          {[-1, 1].map((s) => <mesh key={s} position={[s * width / 2, height / 2, 0]}><boxGeometry args={[0.08, height, 0.08]} /><meshStandardMaterial color="#2b2f40" metalness={0.8} roughness={0.4} /></mesh>)}
          <mesh position={[0, height, 0]}><boxGeometry args={[width, 0.08, 0.08]} /><meshStandardMaterial color="#2b2f40" metalness={0.8} roughness={0.4} /></mesh>
        </group>
      ))}
      {/* ceiling light strips */}
      {[-1.4, 0, 1.4].map((x) => (
        <mesh key={x} position={[x, height - 0.02, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[0.12, length * 0.9]} /><meshBasicMaterial color={[2.2, 2.2, 2.6]} toneMapped={false} /></mesh>
      ))}
      {/* honeycomb straightener and smoke rake upstream */}
      <lineSegments geometry={honey} position={[0, 0, length / 2]}><lineBasicMaterial color="#6a6f8f" transparent opacity={0.6} /></lineSegments>
      <group position={[0, 0, length / 2 - 0.8]}>
        <mesh position={[0, height * 0.45, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, width * 0.85, 8]} /><meshStandardMaterial color="#9a9fb3" metalness={0.9} roughness={0.3} /></mesh>
        <mesh position={[0, height * 0.45, 0]}><boxGeometry args={[0.03, height * 0.85, 0.03]} /><meshStandardMaterial color="#9a9fb3" metalness={0.9} roughness={0.3} /></mesh>
      </group>
      {/* the drive fan downstream */}
      <group position={[0, height / 2, -length / 2 - 0.2]}>
        <mesh><torusGeometry args={[height * 0.5, 0.08, 12, 64]} /><meshStandardMaterial color="#2b2f40" metalness={0.8} roughness={0.4} /></mesh>
        <group ref={fanRef}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} rotation-z={(i / 7) * Math.PI * 2} position={[0, 0, 0]}>
              <boxGeometry args={[0.5, height * 0.95, 0.04]} />
              <meshStandardMaterial color="#3a3f55" metalness={0.8} roughness={0.35} />
            </mesh>
          ))}
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, 0.3, 24]} /><meshStandardMaterial color="#1a1c26" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      </group>
    </group>
  );
}
