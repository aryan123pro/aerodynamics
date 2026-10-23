"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { loftGeometry } from "@/lib/scene/loft";
import { shark } from "@/lib/scene/bodies";

/* A shortfin-mako-like shark, 1 unit long, nose at +z. The body is a loft; a travelling wave bends it
   side to side in the vertex shader (more towards the tail), and the fins ride along with the bend.
   Countershaded: blue-grey above, white below. A faint grain hints at the denticles. */

const AMP = 0.07, K = 7, W = 7;
/** Lateral bend of the body at axial position z (nose 0.5 → tail -0.5) and time t. */
export const sharkBend = (z: number, t: number, swim = 1) => { const u = 0.5 - z; return swim * AMP * u * u * Math.sin(K * u - W * t); };

function finGeo(pts: [number, number][], thick = 0.006) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.5, bevelSize: thick * 0.8, bevelSegments: 2 }).translate(0, 0, -thick / 2);
}

export default function Shark({ swim = 1, grain = 1 }: { swim?: number; grain?: number }) {
  const body = useMemo(() => loftGeometry(shark, 1, 120, 48), []);
  const uni = useMemo(() => ({ uT: { value: 0 }, uSwim: { value: swim }, uGrain: { value: grain } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.7 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
        uniform float uT, uSwim; varying vec3 vObj;`).replace("#include <begin_vertex>", `#include <begin_vertex>
        vObj = position;
        float u = 0.5 - position.z;
        transformed.x += uSwim * ${AMP.toFixed(3)} * u * u * sin(${K.toFixed(1)} * u - ${W.toFixed(1)} * uT);`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        varying vec3 vObj; uniform float uGrain;
        float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`).replace("#include <color_fragment>", `#include <color_fragment>
        float up = smoothstep(-0.02, 0.03, vObj.y + 0.01 * sin(vObj.z * 40.0));
        vec3 back = vec3(0.06, 0.11, 0.19), belly = vec3(0.82, 0.84, 0.87);
        vec3 col = mix(belly, back, up);
        // denticle grain: tiny scales all pointing tailwards
        float g = hh(floor(vec2(vObj.x * 900.0, vObj.z * 700.0)));
        col *= 1.0 - uGrain * 0.08 * g;
        // gill slits
        float gill = 0.0;
        for (int i = 0; i < 5; i++) { float z0 = 0.33 - float(i) * 0.022; gill += (1.0 - smoothstep(0.0012, 0.003, abs(vObj.z - z0))) * step(0.02, abs(vObj.x)) * step(-0.05, vObj.y) * step(vObj.y, 0.05); }
        col = mix(col, vec3(0.05, 0.06, 0.09), clamp(gill, 0.0, 1.0) * 0.8);
        diffuseColor.rgb = col;`);
    };
    return m;
  }, [uni]);
  const fins = useMemo(() => ({
    dorsal: finGeo([[0.06, 0], [-0.03, 0.13], [-0.06, 0.12], [-0.05, 0.0]]),
    pect: finGeo([[0.04, 0], [-0.1, -0.16], [-0.13, -0.15], [-0.05, 0]], 0.008),
    caudalUp: finGeo([[0.02, 0], [-0.12, 0.17], [-0.15, 0.16], [-0.06, 0.0]]),
    caudalLo: finGeo([[0.02, 0], [-0.08, -0.11], [-0.11, -0.1], [-0.05, 0.0]]),
    small: finGeo([[0.02, 0], [-0.02, 0.035], [-0.035, 0.03], [-0.03, 0]], 0.004),
  }), []);
  const finMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2b3a4f", roughness: 0.5, clearcoat: 0.2 }), []);
  const dorsal = useRef<THREE.Group>(null!), tail = useRef<THREE.Group>(null!), sec = useRef<THREE.Group>(null!), pl = useRef<THREE.Group>(null!), pr = useRef<THREE.Group>(null!);
  useEffect(() => () => { body.dispose(); mat.dispose(); finMat.dispose(); Object.values(fins).forEach((g) => g.dispose()); }, [body, mat, finMat, fins]);
  useFrame((_s, dt) => {
    uni.uT.value += dt; uni.uSwim.value = swim; uni.uGrain.value = grain;
    const t = uni.uT.value;
    const at = (g: THREE.Group, z: number) => { if (!g) return; g.position.x = sharkBend(z, t, swim); g.rotation.y = -Math.atan((sharkBend(z + 0.01, t, swim) - sharkBend(z - 0.01, t, swim)) / 0.02) ; };
    at(dorsal.current, 0.02); at(sec.current, -0.3); at(tail.current, -0.49); at(pl.current, 0.2); at(pr.current, 0.2);
  });
  return (
    <group>
      <mesh geometry={body} material={mat} castShadow receiveShadow />
      <group ref={dorsal} position={[0, 0.1, 0.02]}><mesh geometry={fins.dorsal} material={finMat} rotation-y={-Math.PI / 2} /></group>
      <group ref={sec} position={[0, 0.045, -0.3]}><mesh geometry={fins.small} material={finMat} rotation-y={-Math.PI / 2} /></group>
      <group ref={tail} position={[0, 0.0, -0.49]}>
        <mesh geometry={fins.caudalUp} material={finMat} rotation-y={-Math.PI / 2} />
        <mesh geometry={fins.caudalLo} material={finMat} rotation-y={-Math.PI / 2} />
      </group>
      {/* pectoral fins: the span swung out sideways and a little down */}
      <group ref={pl} position={[0.05, -0.05, 0.2]}><group rotation-z={1.2}><mesh geometry={fins.pect} material={finMat} rotation-y={-Math.PI / 2} /></group></group>
      <group ref={pr} position={[-0.05, -0.05, 0.2]}><group rotation-z={-1.2}><mesh geometry={fins.pect} material={finMat} rotation-y={-Math.PI / 2} /></group></group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.034, 0.02, 0.4]}><sphereGeometry args={[0.008, 12, 12]} /><meshPhysicalMaterial color="#050608" roughness={0.05} clearcoat={1} /></mesh>)}
    </group>
  );
}
