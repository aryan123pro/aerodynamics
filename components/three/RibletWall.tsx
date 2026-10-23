"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { RibShape } from "@/lib/riblet";

/* A wall in wall units (1 scene unit = 20 ν/uτ), flow towards -z, span along x.
   The surface is smooth or ribbed with riblets of spacing S and height H. Above it, pairs of
   counter-rotating streamwise vortices (the "engines" of near-wall turbulence) roll along the flow.
   Over a smooth wall they sweep fast fluid right down onto it (red flashes: high friction). Over
   well-sized riblets they ride on the tips and the grooves fill with slow, calm fluid (cyan). If the
   riblets are too wide, the vortices sink into the grooves and drag goes up again.                  */

export const WALL_UNITS = 20;
export const ribHeight = (shape: RibShape | "smooth", S: number) => (shape === "smooth" ? 0 : S * (shape === "scalloped" ? 0.7 : shape === "blade" ? 0.5 : shape === "rect" ? 0.6 : 0.55));

function profile(shape: RibShape | "smooth", S: number, H: number, x: number) {
  if (shape === "smooth") return 0;
  const u = ((x / S) % 1 + 1) % 1;
  if (shape === "sawtooth" || shape === "denticle") return H * (1 - Math.abs(2 * u - 1));
  if (shape === "scalloped") { const q = 2 * u - 1; return H * (1 - Math.sqrt(Math.max(0, 1 - q * q))); }
  if (shape === "blade") return Math.min(u, 1 - u) < 0.025 ? H : 0;
  return Math.min(u, 1 - u) < 0.15 ? H : 0; // rectangular
}

export function RibSurface({ shape, S, width = 7, length = 9, color = "#4d5b78" }: { shape: RibShape | "smooth"; S: number; width?: number; length?: number; color?: string }) {
  const geo = useMemo(() => {
    const H = ribHeight(shape, S);
    const per = shape === "blade" || shape === "rect" ? 80 : 24;
    const nx = Math.min(4000, Math.max(2, Math.round((width / Math.max(S, 0.02)) * per)));
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const x = -width / 2 + (i / nx) * width, y = profile(shape, S, H, x + width * 10);
      pos.push(x, y, length / 2, x, y, -length / 2);
    }
    for (let i = 0; i < nx; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [shape, S, width, length]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshPhysicalMaterial color={color} metalness={0.2} roughness={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function NearWallFlow({ S, H, smooth, sink, speed = 1, width = 7, length = 9 }: { S: number; H: number; smooth: boolean; sink: number; speed?: number; width?: number; length?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uS: { value: 1 }, uH: { value: 0 }, uSmooth: { value: 1 }, uSink: { value: 0 }, uLen: { value: length }, uPx: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute vec4 aR; // seed, vortex index (or -1 for groove fluid), radius, phase
      uniform float uT, uS, uH, uSmooth, uSink, uLen, uPx; varying float vA; varying vec3 vC;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float seed = aR.x, vi = aR.y, rr = aR.z, ph = aR.w;
        vec3 p; vec3 col;
        if (vi < 0.0) {
          // calm fluid in the grooves: slow, straight, cyan
          float age = fract(uT * 0.05 + seed);
          float xg = (floor(h(seed * 7.0) * 20.0) - 10.0 + 0.5) * uS;
          float yg = uH * (0.15 + 0.6 * h(seed * 13.0));
          p = vec3(xg + (h(seed * 3.0) - 0.5) * uS * 0.3, mix(0.08, yg, 1.0 - uSmooth), uLen * 0.5 - age * uLen);
          col = mix(vec3(1.0, 0.45, 0.3), vec3(0.37, 0.92, 0.82), 1.0 - uSmooth);
          vA = (1.0 - uSmooth * 0.6) * 0.5 * smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.85, 1.0, age));
        } else {
          float age = fract(uT * 0.11 + seed);
          float dir = mod(vi, 2.0) < 0.5 ? 1.0 : -1.0;
          float xc = -2.25 + vi * 1.5;
          // vortex height: lifted onto the riblet tips, or sinking into wide grooves
          float yc = 0.75 + uH * (1.0 - uSink);
          float th = ph + dir * (uT * 1.6 + age * 14.0);
          float r = 0.1 + rr * 0.5;
          p = vec3(xc + r * cos(th), yc + r * sin(th) * 0.9, uLen * 0.5 - age * uLen);
          float floorY = mix(0.03, uH * (1.0 - uSink) * 0.95, 1.0 - uSmooth);
          float hit = smoothstep(0.22, 0.0, p.y - floorY) * step(sin(th), 0.0);
          p.y = max(p.y, floorY + 0.02);
          col = mix(vec3(0.75, 0.78, 0.95), vec3(1.0, 0.35, 0.22), hit * (0.35 + 0.65 * max(uSmooth, uSink)));
          vA = smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(0.85, 1.0, age)) * 0.85;
        }
        vC = col;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.05 * uPx / max(0.3, -mv.z), 1.5, 10.0);
      }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c)*10.0) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC * a, a); }`,
  }), [length]);
  const geo = useMemo(() => {
    const n = 14000, a = new Float32Array(n * 4);
    // vortex particles sit on a few helices per vortex (3 radii × 5 phases) so each vortex reads as a corkscrew
    for (let i = 0; i < n; i++) a.set([Math.random(), i % 5 === 0 ? -1 : (i % 4), (1 + Math.floor(Math.random() * 3)) / 3, Math.floor(Math.random() * 5) * 1.2566], i * 4);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("aR", new THREE.BufferAttribute(a, 4)); return g;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((st, dt) => {
    const u = mat.uniforms, k = Math.min(1, dt * 3);
    u.uT.value += dt * speed; u.uS.value = S;
    u.uH.value += (H - u.uH.value) * k;
    u.uSmooth.value += ((smooth ? 1 : 0) - u.uSmooth.value) * k;
    u.uSink.value += (sink - u.uSink.value) * k;
    u.uPx.value = st.size.height;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
