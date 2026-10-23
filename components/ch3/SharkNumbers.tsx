"use client";
import { useState } from "react";
import { Notes, Plot, ProsCons, Seg } from "@/components/ui";
import { ARRAY_DESIGNS } from "@/lib/riblet";


/* The numbers (deck slides 29–34): the Wei et al. 2025 table as charts, how riblets cut noise, and
   the pros and cons. */

type M = "noise" | "drag" | "p250" | "p750";
const LABEL: Record<M, string> = { noise: "Overall noise vs smooth (dB)", drag: "Drag vs smooth (%)", p250: "250 Hz noise peak (%)", p750: "750 Hz noise peak (%)" };

export default function SharkNumbers() {
  const [m, setM] = useState<M>("noise");
  const rows = ARRAY_DESIGNS.slice(1);
  const vals = rows.map((d) => d[m]);
  const lo = Math.min(0, ...vals.map((v) => v ?? 0)), hi = Math.max(0, ...vals.map((v) => v ?? 0));
  const pad = (hi - lo) * 0.15 || 1;
  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="split">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h4>Riblets on a towed sonar array · Wei et al. 2025 (simulation)</h4>
          <Seg options={[["noise", "Overall noise"], ["drag", "Drag"], ["p250", "250 Hz peak"], ["p750", "750 Hz peak"]]} value={m} onChange={setM} label="Metric" />
          <Plot label={LABEL[m]} height={250} opts={{
            x: [-0.6, rows.length - 0.4], y: [lo - pad, hi + pad], padL: 46,
            yticks: Array.from({ length: 5 }, (_, i) => +(lo - pad + ((hi - lo + 2 * pad) * i) / 4).toFixed(1)),
            bars: rows.map((d, i) => ({ x: i, v: d[m] ?? 0, w: 0.55, color: d[m] == null ? "rgba(124,121,143,.25)" : d.color, label: d.name.replace("Design ", "D") + (d[m] == null ? " n/r" : "") })),
            hlines: [{ y: 0, label: "smooth surface", color: "#7c798f" }],
          }} />
          <p className="faint" style={{ fontSize: 12.5 }}>{LABEL[m]}. Lower is better. Grey: not reported in the paper&apos;s text. Shape tendencies are the paper&apos;s hypothesis (deck slide 34).</p>
        </div>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <h4>How riblets reduce noise (deck slide 29)</h4>
          <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Flow-induced noise:</b> weaker near-wall turbulence means smaller wall-pressure fluctuations; the hull is shaken less and radiates less. Gains are modest and depend on frequency, and a badly sized riblet can <i>add</i> high-frequency noise.</p>
          <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Hull vibration:</b> riblets reduce the flow-driven part of the hull&apos;s shaking. Machinery vibration is untouched.</p>
          <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Propeller and cavitation:</b> riblets don&apos;t change cavitation at the blades, but a smoother wake slightly reduces blade-rate tones, and lower drag means less thrust is needed.</p>
          <div className="formula">Riblets lift vortices → weaker near-wall turbulence → <b>lower wall-pressure fluctuations</b> → less hull excitation → less sound radiated</div>
        </div>
      </div>
      <ProsCons
        pros={[
          ["Lower skin-friction drag", "Tiny grooved ridges cut turbulent drag by up to ~5–8% in lab tests"],
          ["Fuel savings, fewer emissions", "Even a small drag cut adds up over many trips"],
          ["Passive, no moving parts", "No power or control system needed"],
          ["Anti-fouling bonus", "The texture discourages algae and barnacles and may reduce bacteria"],
          ["Can be retrofitted", "Applied as a film or coating on existing hulls and aircraft"],
        ]}
        cons={[
          ["Modest in practice", "Real-world fuel savings on aircraft are small, around 1–2%"],
          ["Costly to make", "Microscale ridges are hard to produce evenly over large areas"],
          ["Durability", "Erosion, UV, dirt and cleaning wear down the fine ridges"],
          ["Needs precise design", "Riblet size must match flow speed; off-design performance drops"],
          ["Maintenance", "Damaged areas need repair; the film adds weight"],
        ]}
      />
      <div className="row"><a className="btn sm" href="https://www.youtube.com/watch?v=tfb0EFNBlgo" target="_blank" rel="noreferrer">▶ Watch: shark skin and riblets (deck slide 32)</a></div>
      <Notes say="Riblets give small but real gains. The towed-array study is a simulation, not a sea trial, so treat the big percentages carefully." ask="Why might a riblet that works at 15 knots be useless, or harmful, at 30?" />
    </div>
  );
}
