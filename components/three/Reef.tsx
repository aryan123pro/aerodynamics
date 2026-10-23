"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* An Indo-Pacific reef, kept simple: rippled sand lit by moving caustics, coral heads, sea fans,
   shafts of sunlight and drifting plankton, all under blue water fog. */

export function Sand({ size = 30 }: { size?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec2 vP; varying float vH; void main(){ vec3 p = position; float h = 0.06 * sin(p.x * 2.1 + sin(p.y * 0.7) * 2.0) + 0.03 * sin(p.y * 3.3 + p.x); p.z += h; vH = h; vP = p.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT; varying vec2 vP; varying float vH;
      float c(vec2 p){ vec2 i = p; float s = 0.0; for (int k = 0; k < 4; k++){ i = p + vec2(cos(uT * 0.6 + i.y + float(k)), sin(uT * 0.5 + i.x - float(k))); s += 1.0 / length(vec2(p.x / (sin(i.x + uT) + 1.3), p.y / (cos(i.y + uT) + 1.3))); } return s / 4.0; }
      void main(){
        float caust = pow(clamp(c(vP * 1.4) * 0.11, 0.0, 1.0), 3.0) * 1.8;
        vec3 sand = vec3(0.55, 0.5, 0.38) * (0.8 + vH * 2.0);
        float far = smoothstep(4.0, 14.0, length(vP));
        vec3 col = sand * 0.35 + vec3(0.55, 0.85, 1.0) * caust * (1.0 - far);
        col = mix(col, vec3(0.02, 0.12, 0.2), far);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_s, dt) => { mat.uniforms.uT.value += dt; });
  return <mesh rotation-x={-Math.PI / 2} material={mat} receiveShadow><planeGeometry args={[size, size, 160, 160]} /></mesh>;
}

function seeded(n: number) { let s = n; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export function Corals({ spread = 9, n = 26, seed = 3 }: { spread?: number; n?: number; seed?: number }) {
  const items = useMemo(() => {
    const r = seeded(seed);
    const cols = ["#ff7a8a", "#ff9f5a", "#c58bff", "#ff6fb4", "#ffd06b", "#6fe0c9", "#e06a4a"];
    return Array.from({ length: n }, () => {
      // a ring of coral behind and beside the stage, none between it and the camera
      const a = Math.PI * (0.92 + r() * 1.16), d = 2.6 + r() * spread;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d * 0.8 - 1.5, kind: Math.floor(r() * 3), s: 0.25 + r() * 0.55, c: cols[Math.floor(r() * cols.length)], rot: r() * 6 };
    });
  }, [n, spread, seed]);
  const brain = useMemo(() => {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, 5));
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const k = 1 + 0.06 * Math.sin(v.x * 18 + Math.sin(v.y * 12) * 2) * Math.cos(v.z * 15);
      v.multiplyScalar(k); v.y = Math.max(v.y, -0.2) * 0.75;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, it.z]} rotation-y={it.rot} scale={it.s}>
          {it.kind === 0 && <mesh geometry={brain} position-y={0.3} castShadow><meshStandardMaterial color={it.c} roughness={0.9} /></mesh>}
          {it.kind === 1 && Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} position={[Math.sin(k * 2.4) * 0.25, 0.5 + (k % 3) * 0.12, Math.cos(k * 2.4) * 0.25]} rotation={[Math.sin(k) * 0.4, 0, Math.cos(k * 1.3) * 0.4]} castShadow>
              <cylinderGeometry args={[0.03, 0.07, 1 + (k % 3) * 0.3, 7]} /><meshStandardMaterial color={it.c} roughness={0.8} emissive={it.c} emissiveIntensity={0.15} />
            </mesh>
          ))}
          {it.kind === 2 && (
            <mesh position-y={0.8} castShadow>
              <circleGeometry args={[0.8, 24]} />
              <meshStandardMaterial color={it.c} roughness={0.9} side={THREE.DoubleSide} transparent opacity={0.85} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export function GodRays({ n = 6 }: { n?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { g.current.children.forEach((m, i) => { ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.035 * Math.sin(clock.elapsedTime * 0.7 + i * 1.7); }); });
  return (
    <group ref={g}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-4 + i * 1.8, 5, -3 + (i % 3) * 1.5]} rotation={[0.15, 0, 0.25 - i * 0.03]}>
          <cylinderGeometry args={[0.15, 1.1, 11, 16, 1, true]} />
          <meshBasicMaterial color="#9fe6ff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function Plankton({ n = 900, box = [14, 6, 14] }: { n?: number; box?: [number, number, number] }) {
  const ref = useRef<THREE.Points>(null!);
  const pos = useMemo(() => { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * box[0], Math.random() * box[1], (Math.random() - 0.5) * box[2]], i * 3); return p; }, [n, box]);
  useFrame((_s, dt) => {
    const a = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) { let y = a.getY(i) + dt * 0.06; if (y > box[1]) y = 0; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 3 + i) * dt * 0.02); }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial color="#cfefff" size={0.035} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}
