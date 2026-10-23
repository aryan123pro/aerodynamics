"use client";
import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Boxfish } from "@/components/three/Bodies";
import Label3D from "@/components/three/Label3D";
import { Corals, GodRays, Plankton, Sand } from "@/components/three/Reef";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Seg, Toggles } from "@/components/ui";
import { boxfish, CAR_LEN, shark } from "@/lib/scene/bodies";
import type { Section } from "@/lib/scene/loft";
import { CYAN, YELLOW } from "@/lib/plot";

/* Meet the boxfish (Ostracion cubicus). A 3D fish swims over a reef: a rigid box of bony hexagonal
   plates (the carapace) with only its fins free to move. "Armour" lights up the plate seams;
   "Cross-section" slices it in half next to an ordinary, streamlined fish of the same length. */

const S = 0.3; // the fish is modelled 4.24 units long; this makes it about 1.3 units (a 40 cm fish at 1 unit = 30 cm)

function outline(f: (t: number) => Section, t: number, len: number, scale = 1) {
  const s = f(t), mid = (s.top + s.bot) / 2, pts: [number, number, number][] = [];
  for (let j = 0; j <= 64; j++) {
    const phi = (j / 64) * Math.PI * 2, c = Math.cos(phi), sn = Math.sin(phi), up = sn >= 0, n = up ? s.nTop : s.nBot, ex = 2 / n;
    const sy = Math.pow(Math.abs(sn), ex), narrow = up ? 1 - s.tumble * sy : 1;
    pts.push([(s.w / 2) * Math.sign(c) * Math.pow(Math.abs(c), ex) * narrow * scale, (up ? mid + (s.top - mid) * sy : mid - (mid - s.bot) * sy) * scale, len]);
  }
  return pts;
}

function Swimmer({ plates, slice }: { plates: number; slice: boolean }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (slice) { g.current.position.set(0, 1.0, -1.8); g.current.rotation.set(0, -0.6, 0); return; }
    const t = clock.elapsedTime * 0.25;
    // a slow, wobbly loop: boxfish are not fast, but they can turn on the spot
    g.current.position.set(Math.sin(t) * 0.9, 1.0 + Math.sin(t * 2.3) * 0.12, Math.cos(t) * 0.55 - 0.4);
    g.current.rotation.set(Math.sin(t * 3) * 0.05, t + Math.PI / 2 + Math.sin(t * 4) * 0.12, Math.sin(t * 2) * 0.06);
  });
  return (
    <group ref={g}>
      <group scale={S} position-y={-0.95 * S}>
        <Boxfish plates={plates} />
      </group>
    </group>
  );
}

export default function MeetBoxfish() {
  const [view, setView] = useState<"swim" | "slice">("swim");
  const [show, setShow] = useState({ armour: false, labels: true });
  const slice = view === "slice";
  // cross-sections at mid-body: the boxfish and a streamlined fish of the same length and depth
  const box = useMemo(() => outline(boxfish, 0.42, 0, S), []);
  const sleek = useMemo(() => outline((t) => { const s = shark(t); return { ...s, w: s.w * CAR_LEN * 0.7, top: s.top * CAR_LEN * 1.1 + 0.95, bot: s.bot * CAR_LEN * 1.1 + 0.95 }; }, 0.42, 0, S), []);

  return (
    <div className="split">
      <Plate n="II·1" title="A yellow boxfish over an Indo-Pacific reef" note="drag to turn · scroll to zoom">
        <Stage3D label="A 3D yellow boxfish swimming over a coral reef" camera={{ position: [2.3, 1.6, 3.1], fov: 38 }} background="radial-gradient(ellipse 90% 80% at 50% 0%, #0f5a7a, #031823 75%)" look={{ bloom: 0.5 }}
          overlay={<>
            <CellTag>Cell II · reef tank · Ostracion cubicus</CellTag>
            <div className="strip">
              <Seg options={[["swim", "Swimming"], ["slice", "Cross-section"]]} value={view} onChange={setView} label="View" />
              <Toggles items={[["armour", "Show the armour"], ["labels", "Labels"]]} value={show} onChange={setShow} label="Overlays" />
            </div>
          </>}>
          <fog attach="fog" args={["#05324a", 5, 20]} />
          <Sand />
          <Corals />
          <GodRays />
          <Plankton />
          <Swimmer plates={show.armour ? 1 : 0} slice={slice} />
          {slice && (
            <group position={[0, 0, -0.1]}>
              <group position={[-0.85, 0.05, 0.6]}>
                <Line points={box} color={YELLOW} lineWidth={2.5} />
                <Label3D position={[0, 1.55, 0]} color={YELLOW} size={0.2}>BOXFISH · almost square</Label3D>
              </group>
              <group position={[0.85, 0.05, 0.6]}>
                <Line points={sleek} color={CYAN} lineWidth={2.5} />
                <Label3D position={[0, 1.55, 0]} color={CYAN} size={0.2}>TYPICAL FISH · thin oval</Label3D>
              </group>
            </group>
          )}
          {show.labels && !slice && (
            <>
              <Label3D position={[-1.6, 2.0, -1.2]} color={YELLOW} size={0.16}>CARAPACE · fused hexagonal bony plates</Label3D>
              <Label3D position={[1.7, 1.8, -1.6]} color="#ffe680" size={0.16}>FINS · the only parts that move</Label3D>
            </>
          )}
          <OrbitControls makeDefault target={[0, 0.95, -0.5]} enablePan={false} minDistance={2} maxDistance={10} maxPolarAngle={Math.PI * 0.5} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <div className="prose">
          <p><strong>A box that swims.</strong> Most fish are thin and flexible. The yellow boxfish is a rigid box: its body is sealed in a carapace of fused, hexagonal bony plates. Only its fins move.</p>
          <p>That box does three jobs at once, and each one caught an engineer&apos;s eye:</p>
        </div>
        <div className="readouts" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {[["Habitat", "Indo-Pacific reefs"], ["Toxin", "Ostracitoxin"], ["Strength", "Said to kill 50 adults"], ["Swimming", "Slow, but hard to eat"]].map(([k, v]) => (
            <div className="readout" key={k}><span className="k">{k}</span><span style={{ fontSize: 15 }}>{v}</span></div>
          ))}
        </div>
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Feature</th><th>In the fish</th><th>In a car</th></tr></thead>
            <tbody>
              <tr><td>Rigid armour</td><td>Hexagonal plates: a light skeleton that takes heavy pressure</td><td>A strong, light body shell</td></tr>
              <tr><td>Box shape</td><td>A near-rectangular cross-section</td><td>Room for people and luggage</td></tr>
              <tr><td>Low resistance</td><td>Moves with surprisingly little drag for a box</td><td>Less fuel to push through the air</td></tr>
            </tbody>
          </table>
        </div>
        <div className="callout">Switch to <b>Cross-section</b>: a car needs a boxy cabin, a fast fish is a thin oval. The boxfish is the rare animal that is both boxy <i>and</i> slippery. That is why Mercedes-Benz chose it in 2005.</div>
      </div>
      <Notes say="Look how little of it moves: just the fins. The body is a box of bony plates, like armour. Yet it slips through water easily." show="Turn on 'Show the armour', then 'Cross-section'." ask="Why would a car designer care that this fish is square in cross-section?" />
    </div>
  );
}
