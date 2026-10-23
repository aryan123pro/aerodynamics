"use client";
import { useState } from "react";
import { Notes, Plot, ProsCons, Seg, Timeline } from "@/components/ui";
import { AMBER, ROAR, VIOLET } from "@/lib/plot";

/* The numbers from the deck (slides 5, 8, 9, 11–13), drawn rather than tabled, plus the timeline. */

const METRICS = {
  community: { label: "Community noise cut (dB, higher is better)", y: [0, 12] as [number, number], vals: [[0, 0], [3, 4], [7, 10]], unit: "dB" },
  cabin: { label: "Cabin noise cut (dB, higher is better)", y: [0, 16] as [number, number], vals: [[0, 0], [4, 6], [10, 14]], unit: "dB" },
  fuel: { label: "Extra fuel burn (%, lower is better)", y: [0, 1.8] as [number, number], vals: [[0, 0], [0.1, 0.2], [0.5, 1.5]], unit: "%" },
  prop: { label: "Propulsion efficiency lost (%, lower is better)", y: [0, 9] as [number, number], vals: [[0, 0], [0.25, 0.5], [4, 8]], unit: "%" },
};
type Metric = keyof typeof METRICS;
const NAMES = ["Normal nozzle", "Chevron (triangular)", "Owl-wing serrated"];
const COLORS = [VIOLET, AMBER, ROAR];

export default function OwlNumbers() {
  const [k, setK] = useState<Metric>("community");
  const m = METRICS[k];
  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="split">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h4>Deck statistics · three nozzles compared</h4>
          <Seg options={[["community", "Community"], ["cabin", "Cabin"], ["fuel", "Fuel burn"], ["prop", "Efficiency"]]} value={k} onChange={setK} label="Metric" />
          <Plot label={m.label} height={260} opts={{
            x: [-0.6, 2.6], y: m.y, yticks: Array.from({ length: 5 }, (_, i) => +(m.y[1] / 4 * i).toFixed(2)), padL: 40,
            bars: m.vals.flatMap(([lo, hi], i) => [
              { x: i, v: hi, w: 0.5, color: COLORS[i] + "55", label: NAMES[i] },
              { x: i, v: lo, w: 0.5, color: COLORS[i] },
            ]),
          }} />
          <p className="faint" style={{ fontSize: 12.5 }}>{m.label}. Solid bar: the low end of each range; pale bar: the high end. Sources: NASA NTRS 20060020696; KAIST 10203/314320; InsideFlyer (deck slides 12–13).</p>
        </div>
        <div className="stack">
          <div className="tablewrap">
            <table className="data">
              <thead><tr><th>Feature</th><th>Owl wing</th><th>Chevron nozzle</th></tr></thead>
              <tbody>
                <tr><td>Geometry</td><td>Serrated, comb-like tips on leading and trailing feather vanes</td><td>Sawtooth, triangular shapes on the rim of the exhaust nozzle</td></tr>
                <tr><td>Fluid action</td><td>Slices incoming air, preventing large-scale separation</td><td>Induces small, controlled, counter-rotating streams</td></tr>
                <tr><td>Turbulence</td><td>Breaks massive, loud eddies into micro-vortices</td><td>Disrupts the sharp shear layer between hot core and cool bypass</td></tr>
                <tr><td>Result</td><td className="n good">up to 18 dB quieter than other birds</td><td className="n good">3–8 dB quieter near airports</td></tr>
              </tbody>
            </table>
          </div>
          <div className="tablewrap">
            <table className="data">
              <thead><tr><th>Metric</th><th>Baseline nozzle</th><th>Chevron nozzle</th></tr></thead>
              <tbody>
                <tr><td>Edge</td><td>Smooth circular lip</td><td>Sawtooth, triangular or sinusoidal teeth</td></tr>
                <tr><td>Mixing</td><td>Abrupt, large turbulent eddies</td><td>Controlled 3D mixing by streamwise vortices</td></tr>
                <tr><td>Sound</td><td>Loud, low rumble that travels far</td><td>Quieter overall; shifts noise to higher frequencies</td></tr>
                <tr><td>Thrust</td><td>Maximum</td><td className="warn">Slight thrust loss from flow penetration</td></tr>
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ fontSize: 12.5 }}>The higher-frequency hiss chevrons add is absorbed by the air much faster than the low roar they remove (8 kHz loses ~117 dB per km; 125 Hz loses 0.4), so on the ground the trade is better still.</p>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Research timeline · 70 years from an idea to the 787</p>
        <Timeline items={[
          { y: "1952", t: "Nozzle shape idea", d: "UK College of Aeronautics proposes reshaping engine nozzles to cut noise." },
          { y: "1980s–90s", t: "Tabs at the exit", d: "Small protrusions at the nozzle exit improve mixing and noise." },
          { y: "1992", t: "NASA + FAA AST", d: "The Advanced Subsonic Technology programme targets big noise cuts." },
          { y: "1995", t: "GE & Pratt proposals", d: "Tab and sawtooth configurations tested under AST." },
          { y: "2000", t: "NASA nozzle tests", d: "Best design: 2.7 EPNdB quieter, 0.06% cruise thrust loss.", key: true },
          { y: "2003", t: "First flight", d: "First operational chevrons on a GE engine, Bombardier CRJ900." },
          { y: "2006", t: "Boeing 787", d: "Commercial entry: fan-case chevrons on the Dreamliner.", key: true },
          { y: "2010s–now", t: "747-8 and 737 MAX", d: "Chevrons spread across modern airliners." },
        ]} />
      </div>

      <ProsCons
        pros={[
          ["Best community cut", "Owl-type serrations: 7–10 dB, about double the plain chevron's 3–4 dB"],
          ["Quieter cabin", "10–14 dB mitigation inside the cabin"],
          ["Beats the chevron on noise", "Roughly 2–3× the reduction on both community and cabin measures"],
          ["Nature-inspired mixing", "Owl-wing serrations break up jet turbulence far more than a triangle"],
          ["Fits noise-limited airports", "Biggest gains for communities near flight paths"],
        ]}
        cons={[
          ["Higher fuel burn", "0.5–1.5% penalty, versus 0.1–0.2% for the chevron"],
          ["Efficiency loss", "4–8% aerodynamic penalty on overall propulsion efficiency"],
          ["Secondary drag", "The mixing that cuts noise also adds drag"],
          ["Durability", "High degradation and thermal stress over the engine's life"],
          ["Steep trade-off", "About 2–3× the chevron's noise gain for ~16× its aerodynamic penalty"],
        ]}
      />
      <p className="faint" style={{ fontSize: 13, marginTop: -10 }}>Pros and cons as in the deck (slide 11). They compare an owl-wing serrated nozzle, still a research design, with the triangular chevrons flying today.</p>
      <div className="row"><a className="btn sm" href="https://youtu.be/RpoOhK3D3lk" target="_blank" rel="noreferrer">▶ Watch: silent owl flight (deck slide 6)</a></div>
      <Notes say="The chevron is a compromise engineers accepted: 2 to 3 dB quieter for a fraction of a percent of thrust. The owl-like versions are quieter still, but cost far more." ask="Would you accept 1% more fuel for a 7 dB quieter take-off? Who should decide: the airline, the airport or the town?" />
    </div>
  );
}
