"use client";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import Submarine, { SoundRings } from "@/components/three/Submarine";
import { CellTag, Notes, Plate, Plot, Range, Readouts, SoundCue, Toggles, useRaf, useVoice } from "@/components/ui";
import { cavitationKn, detectionKm, overall, subSources, sumBands, type SubState } from "@/lib/riblet";
import { AMBER, CYAN, ROAR, fmt, monoFamily, setupCanvas } from "@/lib/plot";

/* Why ships are loud. Three noise sources on a submarine, each from lib/riblet.ts:
     propeller – the biggest; when the blade tips' pressure drops low enough, vapour bubbles form and
                 collapse violently (cavitation). Deeper water squeezes them shut, so subs dive to hide.
     machinery – engines, pumps and gearboxes shake the hull through their mounts; rubber mounts help.
     flow      – turbulence in the boundary layer along the hull; riblets trim this one, a little.
   The sonar scope shows how far away an enemy could hear you (passive sonar equation). */

const ENEMY_KM = 6;

function Scope({ km }: { km: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useRaf((t) => {
    const cv = ref.current; if (!cv) return;
    const { ctx, w, h } = setupCanvas(cv);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8, max = 12;
    const sc = (k: number) => (Math.min(k, max) / max) * R;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(4,20,16,.92)"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(94,234,208,.18)"; ctx.lineWidth = 1;
    for (let k = 3; k <= max; k += 3) { ctx.beginPath(); ctx.arc(cx, cy, sc(k), 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    // detection circle: anyone inside it can hear you
    const heard = km >= ENEMY_KM;
    ctx.fillStyle = heard ? "rgba(255,107,74,.16)" : "rgba(94,234,208,.12)"; ctx.strokeStyle = heard ? "#ff6b4a" : "#5eead0"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, sc(km), 0, 7); ctx.fill(); ctx.stroke();
    // the sweep
    const a = (t * 1.4) % (Math.PI * 2);
    const g = ctx.createConicGradient(a - 0.6, cx, cy);
    g.addColorStop(0, "rgba(94,234,208,0)"); g.addColorStop(0.095, "rgba(94,234,208,.35)"); g.addColorStop(0.1, "rgba(94,234,208,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - 0.6, a); ctx.closePath(); ctx.fill();
    // you, and an enemy frigate listening 6 km away
    ctx.fillStyle = "#ecebf4"; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    const ex = cx + sc(ENEMY_KM) * Math.cos(-0.7), ey = cy + sc(ENEMY_KM) * Math.sin(-0.7);
    const blink = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.fillStyle = heard ? `rgba(255,107,74,${0.5 + blink * 0.5})` : "#5eead0";
    ctx.beginPath(); ctx.moveTo(ex, ey - 6); ctx.lineTo(ex + 6, ey + 5); ctx.lineTo(ex - 6, ey + 5); ctx.closePath(); ctx.fill();
    ctx.font = "10px " + monoFamily(); ctx.textAlign = "left";
    ctx.fillStyle = heard ? "#ff6b4a" : "#5eead0"; ctx.textAlign = "center"; ctx.fillText(heard ? "FRIGATE HEARS YOU" : "FRIGATE HEARS NOTHING", cx, cy + R - 14);
    ctx.fillStyle = "rgba(236,235,244,.5)"; ctx.fillText(`${max} km`, cx + R - 30, cy - 4);
  });
  return <canvas ref={ref} style={{ width: 210, height: 210, display: "block" }} aria-label="Sonar scope showing detection range" role="img" />;
}

export default function LoudShip() {
  const [kn, setKn] = useState(12);
  const [depth, setDepth] = useState(60);
  const [fix, setFix] = useState({ mounts: false, riblets: false, skewProp: false });
  const s: SubState = { speedKn: kn, depth, ...fix };
  const src = useMemo(() => subSources(s), [kn, depth, fix.mounts, fix.riblets, fix.skewProp]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => sumBands(src.machinery, src.flow, src.prop), [src]);
  const SL = overall(total);
  const km = detectionKm(SL);
  const L = { prop: overall(src.prop), mach: overall(src.machinery), flow: overall(src.flow) };
  const rel = (l: number) => Math.max(0.15, Math.min(1.4, (l - 95) / 30));
  const cavKn = cavitationKn(depth, fix.skewProp);

  const { voice, on } = useVoice({ ref: 140, unit: "dB re 1µPa", lowpass: 3800 });
  useEffect(() => {
    if (!voice) return;
    voice.setSpectrum(total, SL);
    const bpf = (7 * 9 * kn) / 60; // seven blades, shaft rpm ≈ 9 × knots
    voice.setFlutter(bpf, src.cavitating ? 0.45 : 0.22);
    voice.setTone("hum60", 60, L.mach + (fix.mounts ? -6 : 2), "triangle");
    voice.setTone("hum120", 120, L.mach - 4 + (fix.mounts ? -8 : 0));
  }, [voice, on, total, SL, kn, src.cavitating, L.mach, fix.mounts]);

  return (
    <div className="split">
      <Plate n="III·3" title="A submarine and its three noise sources" note="drag to turn · scroll to zoom">
        <Stage3D label="A submarine with sound radiating from its propeller, machinery and hull flow" camera={{ position: [6.4, 2.2, 5.4], fov: 34 }} background="radial-gradient(ellipse 90% 80% at 50% 0%, #0a3a56, #010a12 75%)" look={{ bloom: 0.7 }}
          overlay={<>
            <CellTag>Cell III · acoustic range · {fmt(depth)} m deep</CellTag>
            <div className="hud" style={{ top: 44, right: 16 }}><Scope km={km} /></div>
            <div className="strip">
              <Range label="Speed" value={kn} min={2} max={28} onChange={setKn} fmt={(v) => v + " kn"} />
              <Range label="Depth" value={depth} min={10} max={400} step={10} onChange={setDepth} fmt={(v) => v + " m"} />
            </div>
          </>}>
          <fog attach="fog" args={["#02131f", 6, 22]} />
          <group scale={8} position={[0, 0.2, 0]}>
            <Submarine prop={kn / 10} riblets={fix.riblets} skew={fix.skewProp} cavitation={src.cavitating ? Math.min(1, (kn - cavKn) / 6 + 0.3) : 0} />
          </group>
          <SoundRings position={[0, 0.2, -4]} color={ROAR} level={rel(L.prop)} rate={0.9} max={1.5} />
          <SoundRings position={[0, 0.2, -0.6]} color={AMBER} level={rel(L.mach)} rate={0.5} max={1.3} />
          <SoundRings position={[0, 0.2, 2.2]} color={CYAN} level={rel(L.flow)} rate={0.7} max={1.1} />
          <Label3D position={[0, 1.9, -4.4]} color={ROAR} size={0.3}>{src.cavitating ? "PROPELLER · CAVITATING" : "PROPELLER"}</Label3D>
          <Label3D position={[0, 2.2, -0.6]} color={AMBER} size={0.3}>MACHINERY</Label3D>
          <Label3D position={[0, 1.6, 2.6]} color={CYAN} size={0.3}>HULL FLOW</Label3D>
          <OrbitControls makeDefault target={[0, 0.3, -0.6]} enablePan={false} minDistance={3} maxDistance={16} />
        </Stage3D>
      </Plate>

      <div className="stack">
        <Toggles items={[["mounts", "Rubber machinery mounts"], ["skewProp", "Skewed propeller"], ["riblets", "Riblet skin"]]} value={fix} onChange={setFix} label="Quieting" />
        <Readouts items={[
          ["Total noise", fmt(SL), "dB re 1µPa", "acc"],
          ["Heard out to", fmt(km, 1), "km", km >= ENEMY_KM ? "hot" : "cool"],
          ["Cavitation from", fmt(cavKn, 1), "kn", src.cavitating ? "hot" : undefined],
        ]} />
        <Plot label="Source level of propeller, machinery and hull flow" height={170} opts={{
          x: [-0.6, 2.6], y: [80, 150], yticks: [80, 100, 120, 140], padL: 40,
          bars: [
            { x: 0, v: L.prop, w: 0.55, color: ROAR, label: "propeller", base: 80 },
            { x: 1, v: L.mach, w: 0.55, color: AMBER, label: "machinery", base: 80 },
            { x: 2, v: L.flow, w: 0.55, color: CYAN, label: "hull flow", base: 80 },
          ],
        }} />
        <div className="prose">
          <p><strong>Propeller noise</strong> is usually the biggest source. Low pressure at the blade tips forms vapour bubbles that collapse violently (<b>cavitation</b>). <strong>Machinery</strong> vibration passes through mounts into the hull, which radiates it. <strong>Hull vibration</strong> collects all of it; flexible plating radiates best.</p>
        </div>
        <SoundCue label="Listen through a hydrophone" />
        <p className="faint" style={{ fontSize: 13 }}>Model: textbook-style source spectra; cavitation starts at a tip speed that rises with depth. Range: passive sonar equation with ambient noise {64} dB, array gain 15 dB, detection threshold 6 dB, spherical spreading plus absorption. Riblets only touch the flow term: they help, but they don&apos;t fix a cavitating propeller.</p>
      </div>
      <Notes say="Speed up past the cavitation line and listen: the propeller starts to crackle and the frigate on the scope hears you. Dive deeper and it stops, because pressure squashes the bubbles." show="Speed 20 kn at 60 m, then depth 300 m. Then turn on all three quieting measures." ask="Riblets reduce only one of these three. Which one, and why is that still worth it?" />
    </div>
  );
}
