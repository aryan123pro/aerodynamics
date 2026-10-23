"use client";
import { useState } from "react";
import { Notes, Plot, ProsCons, Range, Readouts, Timeline } from "@/components/ui";
import { evRangeKm, fuelL100, vehicle } from "@/lib/car";
import { fmt, range, VIOLET } from "@/lib/plot";

/* Road test and the deck's numbers (slides 21–25). The fuel model is fitted to the deck's two figures,
   so it reproduces 4.3 and 5.4 L/100 km at its reference speed and shows how the gap grows with speed
   (drag grows with v², rolling resistance doesn't). */

export default function CarNumbers() {
  const [kmh, setKmh] = useState(80);
  const v = kmh / 3.6;
  const b = vehicle("bionic"), n = vehicle("normal");
  const fb = fuelL100(b.cd, b.area, b.mass, v), fnm = fuelL100(n.cd, n.area, n.mass, v);
  const eb = evRangeKm(b.cd, b.area, b.mass, v), en = evRangeKm(n.cd, n.area, n.mass, v);
  const sp = range(30, 160, 40);
  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="split">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h4>Road test · the same trip in both cars</h4>
          <Range label="Cruising speed" value={kmh} min={30} max={160} step={5} onChange={setKmh} fmt={(x) => x + " km/h"} />
          <Plot label="Fuel use against speed for the Bionic Car and a normal car" height={230} opts={{
            x: [30, 160], y: [0, 12], xticks: [40, 60, 80, 100, 120, 140, 160], yticks: [0, 2, 4, 6, 8, 10, 12], xlabel: "speed, km/h", ylabel: "L / 100 km",
            series: [
              { xs: sp, data: sp.map((s) => fuelL100(n.cd, n.area, n.mass, s / 3.6)), color: "#9aa0b4", width: 2 },
              { xs: sp, data: sp.map((s) => fuelL100(b.cd, b.area, b.mass, s / 3.6)), color: b.color, width: 2.6 },
            ],
            markers: [{ x: kmh, color: VIOLET, label: `${fmt(kmh)} km/h` }],
          }} />
          <div className="legend"><span><i style={{ background: b.color }} />Bionic Car · Cd 0.19</span><span><i style={{ background: "#9aa0b4" }} />Normal car · Cd 0.30</span></div>
          <Readouts items={[
            ["Bionic diesel", fmt(fb, 1), "L/100 km", "cool"],
            ["Normal diesel", fmt(fnm, 1), "L/100 km"],
            ["Saved", fmt((1 - fb / fnm) * 100), "%", "acc"],
            ["EV range gain", "+" + fmt(eb - en), "km", "cool"],
          ]} />
          <p className="faint" style={{ fontSize: 12.5 }}>Model: drag ½ρv²CdA plus rolling resistance, an engine efficiency and a fixed overhead fitted to the deck&apos;s 4.3 and 5.4 L/100 km. EV: a 60 kWh battery ({fmt(eb)} km vs {fmt(en)} km at this speed). Faster driving makes shape matter more, because drag grows with speed squared.</p>
        </div>
        <div className="stack">
          <div className="tablewrap">
            <table className="data">
              <thead><tr><th>Parameter</th><th>Bionic Car</th><th>Normal car</th></tr></thead>
              <tbody>
                <tr><td>Drag coefficient</td><td className="n good">0.19</td><td className="n">0.25 – 0.35</td></tr>
                <tr><td>Fuel (L/100 km)</td><td className="n good">4.3</td><td className="n">5.4</td></tr>
                <tr><td>Fuel efficiency</td><td className="n good">20% better</td><td className="n">baseline</td></tr>
                <tr><td>NOx emissions</td><td className="n good">up to 80% lower*</td><td className="n">baseline</td></tr>
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ fontSize: 12.5 }}>*The NOx cut came from the car&apos;s SCR exhaust treatment (urea injection), not from its shape. Source: deck slide 25; Mercedes-Benz (2005).</p>
          <div className="card" style={{ display: "grid", gap: 8 }}>
            <h4>Where else the idea helps (deck slides 21–22)</h4>
            <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Electric cars:</b> lower drag means a longer range from the same battery, the most valuable gain of all for an EV.</p>
            <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Commercial vehicles:</b> vans and lorries are boxes by nature; shaping their edges like the fish&apos;s cuts drag where it is largest.</p>
            <p className="muted" style={{ fontSize: 14 }}><b style={{ color: "var(--ink)" }}>Light, stiff bodies:</b> bone-style structural design (SKO) is now used for car parts, not just concepts.</p>
          </div>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 14 }}>Research timeline · from reef to museum</p>
        <Timeline items={[
          { y: "Before 2005", t: "Boxfish research", d: "Mercedes-Benz Technology Centre and DaimlerChrysler Research study the fish's shape, strength and movement." },
          { y: "2005", t: "Wind-tunnel tests", d: "Boxfish model: Cd 0.06. A 1:4 clay car model: 0.095.", key: true },
          { y: "2005", t: "Vehicle development", d: "A functional compact concept, 4.24 m long, final Cd 0.19, lightweight structure." },
          { y: "7 June 2005", t: "World premiere", d: "Unveiled at the DaimlerChrysler Innovation Symposium in Washington, D.C.", key: true },
          { y: "Dec 2005", t: "On a real track", d: "An official lap at the Mercedes-Benz World circuit, Brooklands, UK." },
          { y: "2008", t: "Museum of Modern Art", d: "Shown in New York in Design and the Elastic Mind." },
          { y: "2015", t: "The twist", d: "Flow-tank tests show the boxfish is built to turn, not to stay straight." },
        ]} />
      </div>

      <ProsCons
        pros={[["Improved aerodynamics", "The boxfish-inspired shape reduces air resistance"], ["Better fuel efficiency", "Lower drag means less fuel per kilometre"], ["Lightweight design", "Bone-style structure: lighter and stiffer"], ["Innovative biomimicry", "Ideas from nature move car engineering forward"]]}
        cons={[["High development cost", "Research, testing and advanced design are expensive"], ["Complex manufacturing", "Unusual shapes and structures are harder to produce"], ["Limited practicality", "A concept doesn't meet every everyday need"], ["Maintenance", "Specialised components can make repairs harder"]]}
      />
      <Notes say="20 percent less fuel from shape alone is huge. But it stayed a concept: it still had to meet safety, styling and manufacturing rules, as the deck's summary says." ask="Which matters more for an electric car's range: weight or drag? Try the speed slider." />
    </div>
  );
}
