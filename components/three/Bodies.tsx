"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { loftGeometry, type Section } from "@/lib/scene/loft";
import { bionic, boxfish, brick, CAR_LEN, compact, morph } from "@/lib/scene/bodies";

/* Bodies for chapter II, all lofted along z with the nose at +z and the wheels on y = 0.
   The boxfish skin is a shader: yellow, with black spots, drawn over a honeycomb of bony plates
   (the carapace) whose seams can be lit up to show the armour. */

export type BodyKind = "fish" | "clay" | "bionic" | "normal" | "brick";
export const shapeOf = (k: BodyKind): ((t: number) => Section) =>
  k === "fish" ? boxfish : k === "clay" ? morph(boxfish, bionic, 0.55) : k === "bionic" ? bionic : k === "normal" ? compact : brick;

/** The boxfish skin, patched into a physical material. `plates` 0..1 lights the plate seams. */
export function useFishSkin(plates = 0, base = "#ffd23a", paint = 0, paintColor = "#c9dc4f") {
  const uni = useMemo(() => ({ uPlates: { value: plates }, uBase: { value: new THREE.Color(base) }, uPaint: { value: paint }, uPaintC: { value: new THREE.Color(paintColor) } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new THREE.Color("#fff3b0") });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uPlates = uni.uPlates; sh.uniforms.uBase = uni.uBase; sh.uniforms.uPaint = uni.uPaint; sh.uniforms.uPaintC = uni.uPaintC;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aSurf; varying vec2 vSurf;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvSurf = aSurf;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
        varying vec2 vSurf; uniform float uPlates; uniform vec3 uBase; uniform float uPaint; uniform vec3 uPaintC;
        // distance to the nearest hexagon edge, and the hexagon's id
        vec4 hexel(vec2 p){
          vec2 s = vec2(1.0, 1.7320508); vec2 h = s * 0.5;
          vec2 a = mod(p, s) - h, b = mod(p - h, s) - h;
          vec2 g = dot(a, a) < dot(b, b) ? a : b;
          vec2 id = p - g;
          vec2 q = abs(g);
          float edge = 0.5 - max(dot(q, normalize(vec2(1.0, 1.7320508))), q.x);
          return vec4(g, edge, fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453));
        }`).replace("#include <color_fragment>", `#include <color_fragment>
        vec4 hx = hexel(vSurf * 5.2);
        float seam = 1.0 - smoothstep(0.0, 0.06, hx.z);
        vec3 col = uBase * (0.9 + 0.1 * hx.w);
        // a black spot in the middle of most plates (Ostracion cubicus juvenile pattern)
        float spot = step(0.3, hx.w) * (1.0 - smoothstep(0.1, 0.16, length(hx.xy)));
        col = mix(col, vec3(0.03, 0.03, 0.04), spot);
        col = mix(col, col * 0.62, seam * 0.7);
        col = mix(col, uPaintC, uPaint);
        col = mix(col, vec3(0.35, 0.95, 1.0) * 1.6, seam * uPlates);
        diffuseColor.rgb = col;`);
    };
    return m;
  }, [uni]);
  useEffect(() => {
    uni.uPlates.value = plates; uni.uBase.value.set(base); uni.uPaint.value = paint; uni.uPaintC.value.set(paintColor);
    mat.metalness = 0.75 * paint; mat.roughness = 0.42 - 0.2 * paint;
  }, [plates, base, paint, paintColor, uni, mat]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/** A fin: a fan of rays, translucent. */
function finGeometry(w: number, h: number, kind: "fan" | "paddle") {
  const s = new THREE.Shape();
  if (kind === "fan") { s.moveTo(0, -h * 0.15); s.quadraticCurveTo(-w * 0.6, -h * 0.9, -w, -h * 0.55); s.quadraticCurveTo(-w * 1.08, 0, -w, h * 0.55); s.quadraticCurveTo(-w * 0.6, h * 0.9, 0, h * 0.15); s.closePath(); }
  else { s.moveTo(0, 0); s.quadraticCurveTo(-w * 0.3, h * 0.7, -w, h * 0.5); s.quadraticCurveTo(-w * 1.1, 0, -w, -h * 0.3); s.quadraticCurveTo(-w * 0.4, -h * 0.4, 0, 0); }
  const g = new THREE.ShapeGeometry(s, 16);
  return g;
}
const finMat = () => new THREE.MeshPhysicalMaterial({ color: "#ffe680", transparent: true, opacity: 0.62, roughness: 0.4, side: THREE.DoubleSide, transmission: 0.3, thickness: 0.05 });

/** The yellow boxfish, at car length 4.24 (scale it in the scene). Fins beat; `swim` 0..1. */
export function Boxfish({ swim = 1, plates = 0, fins = 1, t0 = 0 }: { swim?: number; plates?: number; fins?: number; t0?: number }) {
  const geo = useMemo(() => loftGeometry(boxfish, CAR_LEN, 110, 64), []);
  const skin = useFishSkin(plates);
  const tail = useRef<THREE.Group>(null!), pl = useRef<THREE.Group>(null!), pr = useRef<THREE.Group>(null!), dor = useRef<THREE.Group>(null!), ana = useRef<THREE.Group>(null!);
  const fg = useMemo(() => ({ caudal: finGeometry(1.25, 1.3, "fan"), pect: finGeometry(0.62, 0.42, "paddle"), small: finGeometry(0.55, 0.32, "paddle") }), []);
  const fm = useMemo(finMat, []);
  useEffect(() => () => { geo.dispose(); Object.values(fg).forEach((g) => g.dispose()); fm.dispose(); }, [geo, fg, fm]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + t0;
    // ostraciiform swimming: the rigid box hardly bends; the tail fin oars and the pectorals scull
    if (tail.current) tail.current.rotation.y = Math.sin(t * 5) * 0.35 * swim;
    if (pl.current) pl.current.rotation.x = Math.sin(t * 7) * 0.6 * swim;
    if (pr.current) pr.current.rotation.x = -Math.sin(t * 7 + 0.6) * 0.6 * swim;
    if (dor.current) dor.current.rotation.y = Math.sin(t * 6 + 1) * 0.4 * swim;
    if (ana.current) ana.current.rotation.y = Math.sin(t * 6 + 2) * 0.4 * swim;
  });
  const zTail = -CAR_LEN / 2;
  return (
    <group>
      <mesh geometry={geo} material={skin} castShadow receiveShadow />
      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.5, 1.32, 1.42]}>
          <mesh><sphereGeometry args={[0.14, 20, 16]} /><meshPhysicalMaterial color="#111" roughness={0.05} clearcoat={1} /></mesh>
          <mesh position={[s * 0.05, 0.04, 0.08]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
        </group>
      ))}
      {/* the small, pouting mouth */}
      <mesh position={[0, 0.66, 2.1]} rotation-x={Math.PI / 2}><torusGeometry args={[0.09, 0.04, 8, 20]} /><meshStandardMaterial color="#d98c3a" roughness={0.5} /></mesh>
      <group visible={fins > 0.01}>
        <group ref={tail} position={[0, 0.95, zTail + 0.08]}>
          <mesh geometry={fg.caudal} material={fm} rotation={[0, -Math.PI / 2, 0]} />
        </group>
        <group ref={pl} position={[0.62, 0.78, 0.95]} rotation={[0, -0.9, 0]}>
          <mesh geometry={fg.pect} material={fm} rotation={[0, -Math.PI / 2, 0]} />
        </group>
        <group ref={pr} position={[-0.62, 0.78, 0.95]} rotation={[0, 0.9, 0]}>
          <mesh geometry={fg.pect} material={fm} rotation={[0, -Math.PI / 2, 0]} />
        </group>
        <group ref={dor} position={[0, 1.42, -1.25]}>
          <mesh geometry={fg.small} material={fm} rotation={[0, -Math.PI / 2, -0.7]} />
        </group>
        <group ref={ana} position={[0, 0.25, -1.25]}>
          <mesh geometry={fg.small} material={fm} rotation={[0, -Math.PI / 2, 0.7]} />
        </group>
      </group>
    </group>
  );
}

/** A wheel with a tyre and a disc hub. `cover` 0..1 hides it behind a spat. */
export function Wheel({ position, cover = 0, spin = 0 }: { position: [number, number, number]; cover?: number; spin?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_s, dt) => { if (g.current) g.current.rotation.x -= dt * spin; });
  return (
    <group position={position}>
      <group ref={g}>
        <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, 0.22, 32]} /><meshStandardMaterial color="#121318" roughness={0.85} /></mesh>
        <mesh rotation-z={Math.PI / 2} position-x={Math.sign(position[0]) * 0.115}><cylinderGeometry args={[0.22, 0.22, 0.02, 24]} /><meshStandardMaterial color="#b9bcc8" metalness={1} roughness={0.25} /></mesh>
        <mesh position-x={Math.sign(position[0]) * 0.12}><boxGeometry args={[0.02, 0.4, 0.05]} /><meshStandardMaterial color="#5c5f6c" metalness={1} roughness={0.3} /></mesh>
      </group>
      {cover > 0.01 && (
        <mesh position-x={Math.sign(position[0]) * 0.07} scale={[1, cover, 1]}>
          <boxGeometry args={[0.06, 0.66, 0.74]} />
          <meshPhysicalMaterial color="#d6e86a" metalness={0.6} roughness={0.25} clearcoat={1} />
        </mesh>
      )}
    </group>
  );
}

const PAINT: Record<BodyKind, { color: string; metal: number; rough: number }> = {
  fish: { color: "#ffd23a", metal: 0, rough: 0.4 },
  clay: { color: "#c98f5a", metal: 0, rough: 0.85 },
  bionic: { color: "#c9dc4f", metal: 0.75, rough: 0.22 },
  normal: { color: "#9aa0b4", metal: 0.6, rough: 0.3 },
  brick: { color: "#b8513a", metal: 0, rough: 0.9 },
};

/** A tunnel model: the body plus wheels where a car has them. */
export function TunnelBody({ kind, spin = 0, glass = true }: { kind: BodyKind; spin?: number; glass?: boolean }) {
  const geo = useMemo(() => loftGeometry(shapeOf(kind), CAR_LEN, 110, 64), [kind]);
  useEffect(() => () => geo.dispose(), [geo]);
  const p = PAINT[kind];
  const wheels = kind === "bionic" || kind === "normal";
  const wx = kind === "bionic" ? 0.78 : 0.76;
  return (
    <group>
      {kind === "fish" ? <Boxfish swim={0.25} /> : (
        <mesh geometry={geo} castShadow receiveShadow>
          <meshPhysicalMaterial color={p.color} metalness={p.metal} roughness={p.rough} clearcoat={p.metal > 0.3 ? 1 : 0} clearcoatRoughness={0.15} />
        </mesh>
      )}
      {glass && (kind === "bionic" || kind === "normal") && <Glasshouse kind={kind} />}
      {wheels && <>
        <Wheel position={[wx, 0.32, 1.25]} spin={spin} />
        <Wheel position={[-wx, 0.32, 1.25]} spin={spin} />
        <Wheel position={[wx, 0.32, -1.3]} spin={spin} cover={kind === "bionic" ? 0.75 : 0} />
        <Wheel position={[-wx, 0.32, -1.3]} spin={spin} cover={kind === "bionic" ? 0.75 : 0} />
      </>}
    </group>
  );
}

/** Dark glass over the cabin: the same loft, slightly inflated, clipped to the window band. */
function Glasshouse({ kind }: { kind: BodyKind }) {
  const geo = useMemo(() => {
    const f = shapeOf(kind);
    return loftGeometry((t) => { const s = f(t); return { ...s, w: s.w * 1.006, top: s.top + 0.006 }; }, CAR_LEN, 90, 48);
  }, [kind]);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: "#0d0f18", metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvP = position;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vP;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
        float band = smoothstep(0.98, 1.02, vP.y) * (1.0 - smoothstep(1.4, 1.43, vP.y)) * smoothstep(-1.6, -1.4, vP.z) * (1.0 - smoothstep(1.0, 1.2, vP.z));
        if (band < 0.5) discard;`);
    };
    return m;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <mesh geometry={geo} material={mat} />;
}
