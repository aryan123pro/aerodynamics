"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/* Smoke streaks in a wind tunnel. Air flows towards -z past a body that the flow sees as an ellipsoid
   (centre c, semi-axes r). Upstream each streak sits at a fixed offset; downstream it follows the exact
   streamline of ideal flow round a sphere (Stokes stream function ψ = ½ U ρ² (1 − a³/r³), solved for
   ρ on the GPU), stretched to the ellipsoid. Colour is the local speed: amber where the air slows and
   presses on the body, cyan where it speeds up and pressure drops. Behind the body a turbulent wake
   grows with `wake` (the base drag), and `sep` adds a separation bubble at sharp front corners.        */

export default function TunnelSmoke({ center = [0, 0.85, 0], radii = [0.95, 0.75, 2.2], wake = 0.3, sep = 0, speed = 1, span = [1.7, 2.3], lanes = [9, 9], length = 14, count = 22000, yaw = 0 }: {
  center?: [number, number, number]; radii?: [number, number, number]; wake?: number; sep?: number; speed?: number;
  span?: [number, number]; lanes?: [number, number]; length?: number; count?: number; yaw?: number;
}) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3(1, 1, 1) }, uWake: { value: 0 }, uSep: { value: 0 }, uLen: { value: 14 }, uPx: { value: 500 }, uYaw: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aR; // seed, lateral offset, height offset (world, relative to centre)
      uniform float uT, uWake, uSep, uLen, uPx, uYaw; uniform vec3 uC, uR;
      varying float vA; varying vec3 vCol;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float seed = aR.x;
        float age = fract(uT * 0.09 + seed);
        float zw = uLen * 0.5 - age * uLen;                    // world z relative to centre
        // the body is turned by uYaw: work in its frame
        float cy = cos(uYaw), sy = sin(uYaw);
        vec2 lat = vec2(aR.y, zw);
        vec2 bf = vec2(cy * lat.x - sy * lat.y, sy * lat.x + cy * lat.y);
        float X0 = bf.x / uR.x, Y0 = aR.z / uR.y, Z = bf.y / uR.z;
        float r0 = length(vec2(X0, Y0)) + 1e-4;
        float phi = atan(Y0, X0);
        // solve rho^2 (1 - 1/(rho^2+Z^2)^1.5) = r0^2
        float rho = sqrt(r0 * r0 + max(0.0, 1.0 - Z * Z)) + 0.01;
        for (int i = 0; i < 7; i++) {
          float q = rho * rho + Z * Z, q15 = pow(q, 1.5), q25 = pow(q, 2.5);
          float f = rho * rho * (1.0 - 1.0 / q15) - r0 * r0;
          float df = 2.0 * rho - 2.0 * rho / q15 + 3.0 * rho * rho * rho / q25;
          rho = max(sqrt(max(0.0, 1.0 - Z * Z)) + 0.003, rho - f / max(df, 1e-3));
        }
        float r = sqrt(rho * rho + Z * Z), ct = Z / r, st = rho / r, r3 = r * r * r;
        float ur = ct * (1.0 - 1.0 / r3), ut = -st * (1.0 + 0.5 / r3);
        float spd = sqrt(ur * ur + ut * ut);
        vec3 p = vec3(rho * cos(phi) * uR.x, rho * sin(phi) * uR.y, Z * uR.z);
        // the wake: behind the body the streaks break up and swirl
        float behind = smoothstep(-0.7, -1.3, Z);
        float close = exp(-max(0.0, rho - 0.6) * 1.6);
        float w = uWake * behind * close * (0.25 + 0.75 * smoothstep(-1.0, -2.2, Z));
        float ph = Z * 4.0 * uR.z + uT * 9.0 + seed * 9.0;
        p.x += w * 0.55 * sin(ph) * uR.x;
        p.y += w * 0.5 * cos(ph * 1.3 + 1.0) * uR.y;
        p.xy *= 1.0 - 0.25 * uWake * behind * close;          // streaks pulled into the low-pressure wake
        // separation at sharp front corners
        float corner = uSep * smoothstep(0.2, 0.7, Z) * (1.0 - smoothstep(0.7, 1.4, Z)) * exp(-max(0.0, rho - 1.0) * 5.0);
        p.xy += corner * 0.25 * vec2(sin(ph * 2.0), cos(ph * 1.7)) * vec2(uR.x, uR.y);
        // back to the world frame
        vec2 wp = vec2(cy * p.x + sy * p.z, -sy * p.x + cy * p.z);
        vec3 pos = uC + vec3(wp.x, p.y, wp.y);
        pos.y = max(pos.y, 0.02);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.045 * uPx / max(0.3, -mv.z), 1.5, 10.0);
        vA = smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(0.85, 1.0, age));
        vec3 slow = vec3(1.0, 0.55, 0.25), fast = vec3(0.35, 0.9, 1.0), calm = vec3(0.85, 0.86, 0.95);
        vec3 c = spd < 1.0 ? mix(slow, calm, smoothstep(0.35, 1.0, spd)) : mix(calm, fast, smoothstep(1.0, 1.45, spd));
        vCol = mix(c, vec3(1.0, 0.42, 0.29), clamp(w * 1.6 + corner * 2.0, 0.0, 1.0));
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying vec3 vCol;
      void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 9.0) * vA * 0.7; if (a < 0.01) discard; gl_FragColor = vec4(vCol * a, a); }`,
  }), []);
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3), a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const lx = Math.floor(Math.random() * lanes[0]), ly = Math.floor(Math.random() * lanes[1]);
      a.set([Math.random(), (lx / (lanes[0] - 1) - 0.5) * 2 * span[0], -0.75 + (ly / (lanes[1] - 1)) * span[1]], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(a, 3));
    return g;
  }, [count, lanes, span]);
  useEffect(() => () => { geo.dispose(); }, [geo]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((st, dt) => {
    const u = mat.uniforms;
    u.uT.value += dt * speed;
    u.uC.value.set(...center); u.uR.value.set(...radii);
    const k = Math.min(1, dt * 3);
    u.uWake.value += (wake - u.uWake.value) * k;
    u.uSep.value += (sep - u.uSep.value) * k;
    u.uYaw.value += (yaw - u.uYaw.value) * k;
    u.uLen.value = length;
    u.uPx.value = st.size.height;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
