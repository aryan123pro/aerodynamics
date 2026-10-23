"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* Dermal denticles (placoid scales): tooth-like crowns, each with three ridges (riblets) running
   along the flow, laid in overlapping rows like roof tiles and tilted tail-up. One crown is about
   0.2 mm long on a mako; here a crown is 1 unit long (flow along -z). */

export function denticleGeometry(ridges = 3) {
  const nx = 26, nz = 34, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx * 2 - 1, v = j / nz;               // u across, v from the front (0) to the back tip (1)
    // a shield: broad at the front, tapering to three points at the back
    const half = 0.42 * Math.sin(Math.PI * Math.min(1, v * 1.25 + 0.05)) * (1 - 0.25 * v) + 0.02;
    const x = u * half;
    const prongs = 1 - 0.35 * v * Math.pow(Math.abs(Math.sin(u * Math.PI * ridges / 2 + Math.PI / 2 * (ridges % 2))), 2);
    const z = 0.5 - v * prongs;
    const dome = 0.08 * Math.sqrt(Math.max(0, 1 - u * u)) * Math.sin(Math.PI * Math.min(1, v * 1.1)) + 0.12 * v;
    // ridges along the flow: one down the middle and one each side, fading towards the front
    const centres = ridges === 3 ? [-0.56, 0, 0.56] : Array.from({ length: ridges }, (_, k) => -0.7 + (1.4 * k) / (ridges - 1));
    const ridge = 0.075 * centres.reduce((a, c) => a + Math.exp(-Math.pow((u - c) / 0.11, 2)), 0) * Math.min(1, v * 2.2) * (1 - 0.3 * v);
    pos.push(x, dome + ridge, z);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + nx + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // a short stalk (the base plate under the crown)
  return g;
}

/** A patch of overlapping denticles, rows staggered. */
export default function DenticlePatch({ rows = 12, cols = 14, spacing = 0.78, color = "#8fa5c0", tilt = 0.28, scale = 1, wear = 0 }: {
  rows?: number; cols?: number; spacing?: number; color?: string; tilt?: number; scale?: number; wear?: number;
}) {
  const geo = useMemo(() => denticleGeometry(3), []);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = rows * cols;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    let k = 0;
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      const x = (cc - cols / 2 + (r % 2) * 0.5) * spacing * 0.92, z = (rows / 2 - r) * spacing * 0.7;
      const j = Math.sin(r * 12.9 + cc * 78.2) * 0.5;
      e.set(-tilt + j * 0.05, j * 0.12, j * 0.06); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x * scale, 0.02 * scale, z * scale), q, new THREE.Vector3(scale * (0.95 + j * 0.1), scale * (1 - wear * 0.6), scale * (0.95 + j * 0.1)));
      ref.current.setMatrixAt(k, m);
      ref.current.setColorAt(k, c.set(color).offsetHSL(0, 0, j * 0.08));
      k++;
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [rows, cols, spacing, color, tilt, scale, wear]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} castShadow receiveShadow>
      <meshPhysicalMaterial roughness={0.35} clearcoat={0.7} clearcoatRoughness={0.2} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
