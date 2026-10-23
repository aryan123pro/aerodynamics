"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { revolve } from "./Turbofan";

/* A stylised barn owl (Tyto alba), about 1 unit tall: an egg-shaped body in golden-buff with grey
   speckle, the white heart-shaped facial disc that funnels sound to its ears, dark eyes, and wings
   that slowly open into a glide. `glide` 0..1 opens the wings. */

function featherMat(base: string, speck: string) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? speck : "rgba(255,255,255,.25)";
    const x = Math.random() * 256, y = Math.random() * 256;
    g.beginPath(); g.ellipse(x, y, 2.2, 1.2, Math.random(), 0, 7); g.fill();
  }
  for (let y = 0; y < 256; y += 14) { g.strokeStyle = "rgba(80,55,30,.18)"; g.beginPath(); for (let x = 0; x <= 256; x += 16) g.arc(x, y, 8, 0, Math.PI); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#fff3d8"), sheenRoughness: 0.5 });
}

function wingGeo() {
  // a broad, rounded owl wing with a soft, fringed trailing edge
  const s = new THREE.Shape();
  s.moveTo(0, 0.06);
  s.bezierCurveTo(0.35, 0.16, 0.75, 0.14, 0.98, 0.0);
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const u = 1 - i / n, x = 0.98 * u, y = -0.05 - 0.3 * Math.sin(Math.PI * (1 - u) * 0.9) * (0.4 + 0.6 * u) - (i % 2 ? 0.015 : 0);
    s.lineTo(x, y);
  }
  s.lineTo(0, -0.12); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2 }).translate(0, 0, -0.01);
}

export default function Owl({ glide = 0.6 }: { glide?: number }) {
  const body = useMemo(() => revolve([[0.0001, 0], [0.14, 0.03], [0.24, 0.16], [0.27, 0.34], [0.24, 0.52], [0.2, 0.62], [0.0001, 0.66]], 48).rotateX(-Math.PI / 2), []);
  const head = useMemo(() => new THREE.SphereGeometry(0.2, 40, 30), []);
  const disc = useMemo(() => {
    // the heart-shaped facial disc
    const s = new THREE.Shape();
    s.moveTo(0, -0.2);
    s.bezierCurveTo(0.22, -0.12, 0.23, 0.12, 0.08, 0.16);
    s.bezierCurveTo(0.03, 0.17, 0.0, 0.12, 0, 0.1);
    s.bezierCurveTo(0, 0.12, -0.03, 0.17, -0.08, 0.16);
    s.bezierCurveTo(-0.23, 0.12, -0.22, -0.12, 0, -0.2);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4 });
  }, []);
  const wing = useMemo(wingGeo, []);
  const buff = useMemo(() => featherMat("#d6a764", "rgba(95,95,105,.45)"), []);
  const wingMat = useMemo(() => { const m = featherMat("#d9ae6c", "rgba(90,90,100,.5)"); m.side = THREE.DoubleSide; return m; }, []);
  useEffect(() => () => { body.dispose(); head.dispose(); disc.dispose(); wing.dispose(); buff.dispose(); wingMat.dispose(); }, [body, head, disc, wing, buff, wingMat]);
  const L = useRef<THREE.Group>(null!), R = useRef<THREE.Group>(null!), H = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const open = glide * (0.85 + 0.15 * Math.sin(t * 1.3));
    if (L.current) L.current.rotation.set(0.1, 0, -0.2 + (1 - open) * 1.25);
    if (R.current) R.current.rotation.set(0.1, Math.PI, -0.2 + (1 - open) * 1.25);
    if (H.current) H.current.rotation.y = Math.sin(t * 0.5) * 0.5;
  });
  return (
    <group>
      <mesh geometry={body} material={buff} castShadow />
      {/* white chest */}
      <mesh position={[0, 0.3, 0.12]} scale={[0.19, 0.24, 0.12]}><sphereGeometry args={[1, 24, 18]} /><meshPhysicalMaterial color="#f6efe2" roughness={0.95} sheen={1} sheenColor="#ffffff" /></mesh>
      <group ref={H} position={[0, 0.74, 0]}>
        <mesh geometry={head} material={buff} castShadow />
        <mesh geometry={disc} position={[0, -0.01, 0.13]} castShadow><meshPhysicalMaterial color="#f8f1e6" roughness={0.9} sheen={1} sheenColor="#ffffff" /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.065, 0.02, 0.19]}><sphereGeometry args={[0.032, 16, 16]} /><meshPhysicalMaterial color="#0b0b0e" roughness={0.05} clearcoat={1} /></mesh>
        ))}
        <mesh position={[0, -0.05, 0.19]} rotation-x={0.4}><coneGeometry args={[0.018, 0.06, 8]} /><meshStandardMaterial color="#e0c9a8" /></mesh>
      </group>
      <group ref={L} position={[0.2, 0.5, -0.02]}><mesh geometry={wing} material={wingMat} castShadow /></group>
      <group ref={R} position={[-0.2, 0.5, -0.02]}><mesh geometry={wing} material={wingMat} castShadow /></group>
      {/* feet */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, 0.0, 0.05]}><capsuleGeometry args={[0.02, 0.06, 4, 8]} /><meshStandardMaterial color="#b9a58a" /></mesh>)}
    </group>
  );
}
