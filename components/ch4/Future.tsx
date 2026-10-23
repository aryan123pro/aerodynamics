"use client";
import Hero3D from "@/components/Hero3D";
import { Notes, Plate } from "@/components/ui";

/* What comes next: the deck's future-possibilities table (slide 37), beside the three specimens. */
const ROWS = [
  ["Nature inspiration", "Owl feather edges", "Streamlined animal bodies", "Shark skin microstructures"],
  ["Main objective", "Reduce jet and exhaust noise", "Reduce wind and buffeting noise", "Control surface flow and drag"],
  ["Transportation", "Drones, aircraft, exhaust systems", "Cars, buses, high-speed trains", "Aircraft and vehicle exteriors"],
  ["Industrial use", "Fans, ventilation, air nozzles", "Vehicle cooling and airflow systems", "Pipes, ducts, fluid-flow surfaces"],
];
export default function Future() {
  return (
    <div className="stack" style={{ gap: 22 }}>
      <Plate n="IV·2" title="Nature, then machine: switch the podiums" note="click a podium to revisit its chapter">
        <Hero3D className="stage" />
      </Plate>
      <div className="tablewrap">
        <table className="data">
          <thead><tr><th>Comparison</th><th style={{ color: "var(--owl)" }}>Owl-inspired nozzles</th><th style={{ color: "var(--fish)" }}>Bionic cars</th><th style={{ color: "var(--shark)" }}>Shark-skin denticles</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="grid3">
        <div className="card"><h4 style={{ color: "var(--owl)" }}>Quiet drones and fans</h4><p className="muted" style={{ fontSize: 14 }}>Serrated and fringed edges on propellers, wind turbines and computer fans: owl-inspired blades have cut wind-turbine noise by about 10 dB in tests.</p></div>
        <div className="card"><h4 style={{ color: "var(--fish)" }}>Longer EV range</h4><p className="muted" style={{ fontSize: 14 }}>For electric cars, buses and trains, every bit of drag cut is range gained; light, bone-style structures help twice.</p></div>
        <div className="card"><h4 style={{ color: "var(--shark)" }}>Self-cleaning, quieter hulls</h4><p className="muted" style={{ fontSize: 14 }}>Riblet films that also resist fouling, on ships, pipelines and sonar domes, if they can be made tough and cheap enough.</p></div>
      </div>
      <Notes say="Each idea is spreading beyond where it started: owl edges to fans and drones, the boxfish to EVs and trains, shark skin to pipes and ducts." ask="Pick an everyday machine that is too loud. Which animal would you study to fix it?" />
    </div>
  );
}
