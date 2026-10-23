"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { loftGeometry } from "@/lib/scene/loft";
import { submarine, SUB_RADIUS } from "@/lib/scene/bodies";

/* A modern attack submarine, 1 unit long, nose at +z. The hull wears rubber anechoic tiles (drawn by a
   shader); with `riblets` a fine ribbed sleeve shimmers along it. A 7-blade skewed propeller turns at the
   stern; when it cavitates, a helix of vapour bubbles streams off the blade tips. */

const R = SUB_RADIUS;

function bladeGeo(skew: number) {
  // a scimitar blade: swept back along its span when skewed
  const s = new THREE.Shape();
  const n = 14;
  for (let i = 0; i <= n; i++) { const u = i / n; s[i ? "lineTo" : "moveTo"](u * 0.05 + skew * u * u * 0.03, 0.006 + 0.012 * Math.sin(Math.PI * Math.min(1, u * 1.1))); }
  for (let i = n; i >= 0; i--) { const u = i / n; s.lineTo(u * 0.05 + skew * u * u * 0.03, -0.01 * Math.sin(Math.PI * Math.min(1, u * 1.05))); }
  return new THREE.ExtrudeGeometry(s, { depth: 0.0015, bevelEnabled: false });
}

export default function Submarine({ prop = 1, riblets = false, skew = true, cavitation = 0, tiles = true }: { prop?: number; riblets?: boolean; skew?: boolean; cavitation?: number; tiles?: boolean }) {
  const hull = useMemo(() => loftGeometry(submarine, 1, 120, 48), []);
  const uni = useMemo(() => ({ uRib: { value: 0 }, uTiles: { value: 1 }, uT: { value: 0 } }), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: "#16191f", roughness: 0.75, metalness: 0.1, clearcoat: 0.2, clearcoatRoughness: 0.8 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aSurf; varying vec2 vSurf;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvSurf = aSurf;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vSurf; uniform float uRib, uTiles, uT;").replace("#include <color_fragment>", `#include <color_fragment>
        vec2 g = abs(fract(vSurf * vec2(160.0, 120.0)) - 0.5);
        float tile = smoothstep(0.47, 0.5, max(g.x, g.y));
        diffuseColor.rgb *= 1.0 - 0.35 * tile * uTiles;
        float rib = 0.5 + 0.5 * sin(vSurf.x * 2600.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.45, 0.5) * (0.6 + 0.6 * rib), uRib * 0.55);`);
    };
    return m;
  }, [uni]);
  const parts = useMemo(() => {
    const sail = new THREE.Shape(); sail.moveTo(0.05, 0); sail.quadraticCurveTo(0.05, 0.06, 0.02, 0.065); sail.lineTo(-0.06, 0.06); sail.lineTo(-0.075, 0); sail.closePath();
    const sailGeo = new THREE.ExtrudeGeometry(sail, { depth: 0.022, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3 }).translate(0, 0, -0.011).rotateY(-Math.PI / 2);
    const plane = new THREE.Shape(); plane.moveTo(0, 0.02); plane.lineTo(0.07, 0.008); plane.lineTo(0.07, -0.018); plane.lineTo(0, -0.03); plane.closePath();
    const planeGeo = new THREE.ExtrudeGeometry(plane, { depth: 0.003, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 });
    return { sailGeo, planeGeo, blade: bladeGeo(skew ? 1 : 0) };
  }, [skew]);
  const propRef = useRef<THREE.Group>(null!);
  useEffect(() => () => { hull.dispose(); mat.dispose(); }, [hull, mat]);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  useFrame((_s, dt) => {
    uni.uRib.value += ((riblets ? 1 : 0) - uni.uRib.value) * Math.min(1, dt * 3);
    uni.uTiles.value = tiles ? 1 : 0;
    if (propRef.current) propRef.current.rotation.z += dt * 6 * prop;
  });
  const metal = <meshStandardMaterial color="#1c2028" roughness={0.6} metalness={0.3} />;
  return (
    <group>
      <mesh geometry={hull} material={mat} castShadow receiveShadow />
      <mesh geometry={parts.sailGeo} position={[0, R * 0.85, 0.24]} castShadow>{metal}</mesh>
      {[-1, 1].map((s) => <mesh key={"sp" + s} geometry={parts.planeGeo} position={[s * 0.011, R * 0.85 + 0.042, 0.255]} rotation={[Math.PI / 2, 0, s > 0 ? 0 : Math.PI]} castShadow>{metal}</mesh>)}
      {/* X-form stern planes */}
      {[0, 1, 2, 3].map((i) => (
        <group key={"x" + i} position={[0, 0, -0.43]} rotation-z={Math.PI / 4 + (i * Math.PI) / 2}>
          <mesh geometry={parts.planeGeo} position={[0, R * 0.55, 0]} rotation={[Math.PI / 2, Math.PI / 2, 0]} scale={[0.9, 1.3, 1]} castShadow>{metal}</mesh>
        </group>
      ))}
      {/* the propeller */}
      <group ref={propRef} position={[0, 0, -0.495]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation-z={(i / 7) * Math.PI * 2}>
            <mesh geometry={parts.blade} rotation-x={0.65} castShadow>
              <meshStandardMaterial color="#b28b4d" metalness={1} roughness={0.25} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
        <mesh rotation-x={Math.PI / 2}><coneGeometry args={[0.012, 0.03, 16]} /><meshStandardMaterial color="#b28b4d" metalness={1} roughness={0.3} /></mesh>
      </group>
      <Cavitation amount={cavitation} speed={prop} />
    </group>
  );
}

/** Vapour bubbles shed from the blade tips in a helix, collapsing downstream. */
function Cavitation({ amount, speed }: { amount: number; speed: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uPx: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute vec2 aR; uniform float uT, uAmt, uPx; varying float vA;
      void main(){
        float age = fract(uT * 0.6 + aR.x);
        float blade = floor(aR.y * 7.0);
        float th = blade / 7.0 * 6.2832 + uT * 6.0 - age * 9.0;
        float r = 0.055 * (1.0 - 0.25 * age);
        vec3 p = vec3(r * cos(th), r * sin(th), -0.5 - age * 0.35);
        p += (fract(sin(aR.x * 91.0 + vec3(1.0, 2.0, 3.0)) * 4375.0) - 0.5) * 0.012 * age;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.01 * uPx / max(0.05, -mv.z) * (1.0 - age), 1.0, 8.0);
        vA = uAmt * (1.0 - age) * step(aR.x, uAmt);
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.3, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * a, a); }`,
  }), []);
  const geo = useMemo(() => {
    const n = 3000, a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) a.set([Math.random(), Math.random()], i * 2);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("aR", new THREE.BufferAttribute(a, 2)); return g;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => { const u = mat.uniforms; u.uT.value += dt * speed; u.uAmt.value += (amount - u.uAmt.value) * Math.min(1, dt * 3); u.uPx.value = st.size.height; });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Expanding rings of sound from a source; size and brightness follow its level. */
export function SoundRings({ position, color, level, rate = 0.6, max = 3 }: { position: [number, number, number]; color: string; level: number; rate?: number; max?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    g.current.children.forEach((m, i) => {
      const ph = (clock.elapsedTime * rate + i / 3) % 1;
      m.scale.setScalar(0.05 + ph * max * level);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.28 * Math.min(1, level * 1.4);
    });
  });
  return (
    <group ref={g} position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} wireframe depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}
