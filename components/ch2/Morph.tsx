"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFishSkin, Wheel } from "@/components/three/Bodies";
import Floor from "@/components/three/Floor";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Range, Readouts, Seg } from "@/components/ui";
import { bionic, boxfish, CAR_LEN, morph } from "@/lib/scene/bodies";
import { loftGeometry } from "@/lib/scene/loft";
import { fmt, YELLOW } from "@/lib/plot";

/* Fish into car. One slider morphs the boxfish's body, section by section, into the Bionic Car:
   the fins fold away, wheels appear, the skin turns to paint. "Skeleton" shows the body structure,
   first as a uniform space frame, then after SKO (Soft Kill Option, the bone-growth method of Claus
   Mattheck): material removed where it carries little load and added along the load paths, as bone
   does. Mercedes-Benz: about 30% lighter, up to 40% stiffer. Cd is only known at the three models
   that were actually built and tested. */

const MEASURED: [number, number, string][] = [[0, 0.06, "boxfish model"], [0.55, 0.095, "1:4 clay car"], [1, 0.19, "Bionic Car"]];

/** Members of a space frame on the body's surface: rings and rails, plus braces; SKO thickness by a load field. */
function frameMembers(k: number, sko: boolean) {
  const f = morph(boxfish, bionic, k);
  const pt = (t: number, phi: number): THREE.Vector3 => {
    const s = f(t), c = Math.cos(phi), sn = Math.sin(phi), mid = (s.top + s.bot) / 2, up = sn >= 0, n = up ? s.nTop : s.nBot, ex = 2 / n;
    const sy = Math.pow(Math.abs(sn), ex), narrow = up ? 1 - s.tumble * sy : 1;
    return new THREE.Vector3((s.w / 2) * Math.sign(c) * Math.pow(Math.abs(c), ex) * narrow * 0.96, (up ? mid + (s.top - mid) * sy : mid - (mid - s.bot) * sy) * 0.98 + 0.01, CAR_LEN / 2 - t * CAR_LEN);
  };
  const T = Array.from({ length: 11 }, (_, i) => 0.06 + i * 0.088), P = Array.from({ length: 12 }, (_, j) => -Math.PI / 2 + (j / 12) * Math.PI * 2);
  const out: { a: THREE.Vector3; b: THREE.Vector3; w: number }[] = [];
  // a load field: high along the sills, roof rails, pillars and the crash structures at both ends
  const load = (t: number, phi: number) => {
    const rail = Math.pow(Math.abs(Math.cos(phi)), 6) + 0.8 * Math.pow(Math.max(0, Math.sin(phi)), 12) * (t > 0.3 && t < 0.8 ? 1 : 0.3);
    const ends = Math.exp(-Math.pow((t - 0.06) / 0.08, 2)) + Math.exp(-Math.pow((t - 0.94) / 0.08, 2));
    const pillars = [0.28, 0.5, 0.78].reduce((s, p) => s + Math.exp(-Math.pow((t - p) / 0.04, 2)), 0) * (Math.sin(phi) > -0.2 ? 1 : 0.2);
    return Math.min(1, rail + ends * 0.7 + pillars * 0.8);
  };
  T.forEach((t, i) => P.forEach((phi, j) => {
    const p0 = pt(t, phi), p1 = pt(t, P[(j + 1) % 12] + (j === 11 ? Math.PI * 2 : 0));
    const l0 = load(t, phi);
    if (!sko || l0 > 0.18) out.push({ a: p0, b: p1, w: sko ? 0.012 + 0.03 * l0 : 0.02 });
    if (i < T.length - 1) {
      const q = pt(T[i + 1], phi), l1 = load((t + T[i + 1]) / 2, phi);
      if (!sko || l1 > 0.15) out.push({ a: p0, b: q, w: sko ? 0.012 + 0.032 * l1 : 0.02 });
      // hexagon-style braces, as in the fish's plates
      if ((i + j) % 2 === 0) { const d = pt(T[i + 1], P[(j + 1) % 12] + (j === 11 ? Math.PI * 2 : 0)); const ld = load(t, phi); if (!sko || ld > 0.45) out.push({ a: p0, b: d, w: sko ? 0.01 + 0.02 * ld : 0.016 }); }
    }
  }));
  return out;
}

function Frame({ k, sko }: { k: number; sko: boolean }) {
  const members = useMemo(() => frameMembers(k, sko), [k, sko]);
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    members.forEach((mb, i) => {
      const d = mb.b.clone().sub(mb.a), len = d.length();
      q.setFromUnitVectors(up, d.normalize());
      m.compose(mb.a.clone().add(mb.b).multiplyScalar(0.5), q, new THREE.Vector3(mb.w / 0.02, len, mb.w / 0.02));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.count = members.length;
    ref.current.instanceMatrix.needsUpdate = true;
  }, [members]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 700]} castShadow>
      <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
      <meshStandardMaterial color={sko ? "#5eead0" : "#c9cbe0"} metalness={0.6} roughness={0.3} emissive={sko ? "#1b6f62" : "#000"} emissiveIntensity={0.6} />
    </instancedMesh>
  );
}

function MorphBody({ k, ghost }: { k: number; ghost: boolean }) {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  useMemo(() => loftGeometry(morph(boxfish, bionic, k), CAR_LEN, 110, 64, geo), [k, geo]);
  const skin = useFishSkin(0, "#ffd23a", Math.min(1, Math.max(0, (k - 0.25) / 0.6)), "#c9dc4f");
  useEffect(() => { skin.transparent = ghost; skin.opacity = ghost ? 0.18 : 1; skin.depthWrite = !ghost; skin.needsUpdate = true; }, [ghost, skin]);
  useEffect(() => () => geo.dispose(), [geo]);
  const wheel = Math.min(1, Math.max(0, (k - 0.6) / 0.3));
  const fin = 1 - Math.min(1, k / 0.35);
  return (
    <group>
      <mesh geometry={geo} material={skin} castShadow={!ghost} receiveShadow />
      {fin > 0.02 && (
        <mesh position={[0, 0.95, -CAR_LEN / 2 - 0.4 * fin]} scale={[fin, fin, fin]} rotation-y={Math.PI / 2}>
          <circleGeometry args={[0.7, 24, -Math.PI / 2.4, Math.PI / 1.2]} />
          <meshPhysicalMaterial color="#ffe680" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {wheel > 0.02 && (
        <group scale={[1, wheel, wheel]} position-y={0.32 * (1 - wheel)}>
          <Wheel position={[0.78, 0.32, 1.25]} /><Wheel position={[-0.78, 0.32, 1.25]} />
          <Wheel position={[0.78, 0.32, -1.3]} cover={0.75} /><Wheel position={[-0.78, 0.32, -1.3]} cover={0.75} />
        </group>
      )}
    </group>
  );
}

export default function Morph() {
  const [k, setK] = useState(0);
  const [skel, setSkel] = useState<"skin" | "frame" | "sko">("skin");
  const near = MEASURED.reduce((a, b) => (Math.abs(b[0] - k) < Math.abs(a[0] - k) ? b : a));
  const measured = Math.abs(near[0] - k) < 0.04;
  return (
    <div className="split">
      <Plate n="II·3" title="One body, from fish to car" note="drag to turn · scroll to zoom">
        <Stage3D label="A 3D body morphing from a boxfish into the Mercedes-Benz Bionic Car" camera={{ position: [5.4, 2.4, 4.6], fov: 34 }} look={{ bloom: 0.5 }}
          overlay={<>
            <CellTag>Cell II · design studio · {fmt(k * 100)}% car</CellTag>
            <div className="hud tag hud-tr"><span className="k">drag coefficient</span><span className="big" style={{ color: measured ? YELLOW : undefined }}>{measured ? near[1].toFixed(near[1] < 0.1 ? 3 : 2) : "—"}<small>{measured ? near[2] : "not measured here"}</small></span></div>
            <div className="strip">
              <Range label="Boxfish → Bionic Car" value={k} min={0} max={1} step={0.01} onChange={setK} fmt={(x) => (x < 0.15 ? "fish" : x > 0.85 ? "car" : fmt(x * 100) + "%")} />
              <Seg options={[["skin", "Body"], ["frame", "Frame"], ["sko", "Frame after SKO"]]} value={skel} onChange={setSkel} label="Show" />
            </div>
          </>}>
          <group position-y={0}>
            <MorphBody k={k} ghost={skel !== "skin"} />
            {skel !== "skin" && <Frame k={k} sko={skel === "sko"} />}
          </group>
          {skel === "sko" && <Label3D position={[0, 2.35, 0]} color="#5eead0" size={0.24}>THICK WHERE LOAD FLOWS · GONE WHERE IT DOESN&apos;T</Label3D>}
          <Floor color="#ffd84a" />
          <OrbitControls makeDefault target={[0, 0.8, 0]} enablePan={false} minDistance={3} maxDistance={12} maxPolarAngle={Math.PI * 0.49} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>Borrow the shape, then make it work.</strong> Engineers at DaimlerChrysler Research built an accurate boxfish model, tested it in a wind tunnel, then a quarter-scale clay car, and finally a real, drivable concept: 4.24 m long, 1.82 m wide.</p>
          <p>The fish lent the car two ideas, not one: the outer shape, and the way its plates are built. Bones grow thicker where they carry load and thinner where they don&apos;t. The <b>SKO</b> method copies that in a computer.</p>
        </div>
        <Readouts items={skel === "sko" ? [
          ["Body weight", "−30", "%", "cool"], ["Stiffness", "+40", "%", "cool"], ["Method", "SKO", "bone growth", "acc"],
        ] : [
          ["Measured models", "3", "", "acc"], ["Boxfish Cd", "0.06"], ["Bionic Cd", "0.19"],
        ]} />
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Stage</th><th>What was built</th><th className="n">Cd</th></tr></thead>
            <tbody>
              {MEASURED.map(([x, cd, l]) => <tr key={l} className={"clickable" + (Math.abs(x - k) < 0.04 ? " sel" : "")} onClick={() => setK(x)}><td>{l}</td><td>{x === 0 ? "Exact model of the fish" : x < 1 ? "Quarter-scale car-shaped model" : "Drivable concept, 103 kW diesel"}</td><td className="n">{cd}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ fontSize: 13 }}>Weight and stiffness: Mercedes-Benz (2005), calculated with the SKO method. The frame drawn here is a teaching sketch of the idea, not the real car&apos;s structure.</p>
      </div>
      <Notes say="Drag the slider slowly. The fish's box becomes a car's cabin; the fins fold away, wheels appear. Then show the frame: the same idea that grows bones is used to grow the car's skeleton." show="Click each row of the table to jump to the three models that were really built." ask="If the shape alone gives 0.06, why does the car end up at 0.19?" />
    </div>
  );
}
