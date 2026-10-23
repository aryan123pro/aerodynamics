"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import Label3D from "@/components/three/Label3D";
import { NearWallFlow, ribHeight, RibSurface, WALL_UNITS } from "@/components/three/RibletWall";
import Stage3D from "@/components/three/Stage3D";
import { CellTag, Notes, Plate, Plot, Range, Readouts, Seg, SoundCue, useVoice } from "@/components/ui";
import { BANDS } from "@/lib/audio";
import { hump } from "@/lib/jet";
import { dragReduction, flowNoiseDelta, KNOT, RIBS, viscousUm, type RibShape } from "@/lib/riblet";
import { CYAN, HUSH, ROAR, ROSE, VIOLET, YELLOW, fmt, range } from "@/lib/plot";

/* Riblets tame the wall. A slice of turbulent boundary layer drawn in wall units (the natural ruler
   of near-wall turbulence: ν/uτ, a few micrometres on a fast hull). The vortices are ~30 wall units
   across. Riblets of spacing s⁺ ≈ 15 are smaller than the vortices, so the vortices ride on the tips;
   at s⁺ ≳ 30 the grooves are big enough to swallow them and drag rises. */

type Surf = RibShape | "smooth";
const COLORS: Record<RibShape, string> = { blade: CYAN, scalloped: HUSH, sawtooth: YELLOW, rect: VIOLET, denticle: ROSE };

export default function Riblets() {
  const [shape, setShape] = useState<Surf>("blade");
  const [sp, setSp] = useState(16);
  const [kn, setKn] = useState(15);
  const smooth = shape === "smooth";
  const S = sp / WALL_UNITS;
  const H = ribHeight(shape, S);
  const dr = smooth ? 0 : dragReduction(sp, shape);
  const sink = smooth ? 0 : Math.min(1, Math.max(0, (sp - 22) / 14));
  const lp = viscousUm(kn * KNOT, 20);
  const xs = range(0.5, 45, 90);

  // the wall-pressure hiss under the boundary layer: level follows the wall shear stress
  const { voice, on } = useVoice({ ref: 70, unit: "dB" });
  const bands = useMemo(() => BANDS.map((f) => 64 + flowNoiseDelta(dr) + hump(f, 900, 1.1, 1.3)), [dr]);
  useEffect(() => { voice?.setSpectrum(bands, 64 + flowNoiseDelta(dr)); }, [voice, on, bands, dr]);

  return (
    <div className="split">
      <Plate n="III·2" title="A slice of the flow right next to a hull, in wall units" note="drag to turn · scroll to zoom">
        <Stage3D label="Streamwise vortices above a smooth wall and above riblets" camera={{ position: [3.2, 2.0, 8.4], fov: 34 }} background="radial-gradient(ellipse 80% 70% at 50% 30%, #0e2a3d, #03101a 80%)" look={{ bloom: 0.6 }}
          overlay={<>
            <CellTag>Cell III · boundary-layer slice · s⁺ = {smooth ? "—" : fmt(sp)}</CellTag>
            <div className="hud tag hud-tr"><span className="k">skin friction</span><span className="big" style={{ color: dr > 0.5 ? HUSH : dr < -0.5 ? ROAR : undefined }}>{fmt(100 - dr, 1)}<small>%</small></span><span className="k">of a smooth wall</span></div>
            <div className="hud tag hud-bl" style={{ display: "grid", gap: 4 }}>
              <span className="k">smoke colour</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: ROAR, marginRight: 8 }} />fast fluid hitting the wall</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: HUSH, marginRight: 8 }} />calm fluid in the grooves</span>
            </div>
            <div className="strip" style={{ left: "auto", width: "min(380px, calc(100% - 24px))" }}>
              <Range label="Riblet spacing s⁺ (wall units)" value={sp} min={2} max={45} step={1} onChange={setSp} />
            </div>
          </>}>
          <RibSurface shape={shape} S={S} />
          <NearWallFlow S={S} H={H} smooth={smooth} sink={sink} />
          <Label3D position={[-3.6, 2.2, 0]} color="#c9cbe0" size={0.26}>STREAMWISE VORTICES · ~30 wall units</Label3D>
          {!smooth && <Label3D position={[3.2, H + 0.5, 4.2]} to={[2.2, H, 4.2]} color={HUSH} size={0.24}>{sink > 0.3 ? "GROOVES TOO WIDE · vortices fall in" : "VORTICES RIDE ON THE TIPS"}</Label3D>}
          <OrbitControls makeDefault target={[0, 0.6, 0]} enablePan={false} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI * 0.48} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Seg options={[["smooth", "Smooth"], ...(Object.keys(RIBS) as RibShape[]).map((k) => [k, RIBS[k].name] as [Surf, string])]} value={shape} onChange={setShape} label="Surface" />
        {!smooth && <p className="faint" style={{ fontSize: 13, marginTop: -4 }}>{RIBS[shape as RibShape].note}</p>}
        <div className="prose">
          <p><strong>How it works.</strong> In turbulent flow, small swirling vortices form near the surface and keep dragging fast fluid down onto it. The riblet tips hold these vortices slightly above the surface, so less momentum reaches the wall: <b>lower wall shear stress</b>, less skin-friction drag.</p>
        </div>
        <Plot label="Drag reduction against riblet spacing for each riblet shape" height={210} opts={{
          x: [0, 45], y: [-8, 12], xticks: [0, 10, 15, 20, 30, 40], yticks: [-5, 0, 5, 10], xlabel: "riblet spacing s⁺ (wall units)", ylabel: "drag cut %",
          series: (Object.keys(RIBS) as RibShape[]).map((k) => ({ xs, data: xs.map((x) => dragReduction(x, k)), color: COLORS[k], width: k === shape ? 3 : 1.2, dash: k === shape ? [] : [4, 4] })),
          hlines: [{ y: 0, color: "#7c798f" }],
          markers: [{ x: sp, color: ROSE, label: smooth ? "smooth wall" : `${fmt(dr, 1)}%` }],
          bands: [{ x0: 12, x1: 20, color: "rgba(94,234,208,.07)", label: "sweet spot" }],
        }} />
        <Readouts items={[
          ["Drag cut", (dr >= 0 ? "" : "+") + fmt(Math.abs(dr), 1), dr >= 0 ? "% less" : "% more", dr > 0.5 ? "cool" : dr < -0.5 ? "hot" : undefined],
          ["Flow-noise forcing", fmt(flowNoiseDelta(dr), 1), "dB", "acc"],
          ["Spacing on a hull", fmt(sp * lp), "µm"],
        ]} />
        <Range label="Hull speed (sets the size of a wall unit)" value={kn} min={3} max={35} step={1} onChange={setKn} fmt={(v) => `${v} kn · 1 unit = ${fmt(lp, 1)} µm`} />
        <SoundCue label="Hear the hiss under the flow" />
        <p className="faint" style={{ fontSize: 13 }}>Peak cuts from Bechert et al. (1997): thin blades 9.9% at h/s ≈ 0.5, scalloped 6.5%, sawtooth ~5%. The noise change is modest: wall-pressure fluctuations scale with wall shear, so 10% less friction is under 1 dB, exactly as the deck warns.</p>
      </div>
      <Notes say="Riblets don't make the flow laminar. They keep the vortices from touching the wall. Too wide, and the vortices fall into the grooves: worse than smooth." show="Smooth, then Thin blades at 16, then slide to 40." ask="Why must the riblet size change with the ship's speed? (The wall unit shrinks as speed rises.)" />
    </div>
  );
}
