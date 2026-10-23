"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { store } from "@/lib/site";

const TABS = [["sources", "Sources"], ["slides", "Presentation"], ["team", "Team"]] as const;
type Tab = (typeof TABS)[number][0];
const N_SLIDES = 38;

type Src = { cite: string; used: string; url: string };
const SOURCES: { group: string; items: Src[] }[] = [
  { group: "I · Owls, jets and chevrons", items: [
    { cite: "Lighthill, M. J. (1952). On sound generated aerodynamically. I. General theory. Proc. R. Soc. A 211, 564–587.", used: "Jet sound power grows with the 8th power of jet speed (Inside the jet)", url: "https://doi.org/10.1098/rspa.1952.0060" },
    { cite: "SAE ARP 876 / Tanna (1977). Prediction of jet noise: OASPL = 141 + 10 log(A/R²) + 10 log[M^7.5/(1+0.01 M^4.5)].", used: "Overall jet-noise level used in every jet model", url: "https://www.google.com/search?q=SAE+ARP876+gas+turbine+jet+exhaust+noise+prediction" },
    { cite: "Tam, Golebiowski & Seiner (1996). On the two components of turbulent mixing noise from supersonic jets. AIAA 96-1716.", used: "Two-hump jet spectrum: large-scale and fine-scale turbulence", url: "https://doi.org/10.2514/6.1996-1716" },
    { cite: "Saiyed, Mikkelsen & Bridges (2000). Acoustics and thrust of separate-flow exhaust nozzles with mixing devices for high-bypass-ratio engines. NASA/TM-2000-209948.", used: "Best nozzle: 2.7 EPNdB quieter for 0.06% cruise thrust", url: "https://www.semanticscholar.org/paper/Acoustics-and-Thrust-of-Quiet-Separate-Flow-Nozzles-Saiyed-Mikkelsen/35cd2c1f964b6f5e987760a714b3653adeecc08d" },
    { cite: "Bridges & Brown (2004). Parametric testing of chevrons on single flow hot jets. AIAA 2004-2824.", used: "Chevron trends: low-frequency cut, high-frequency rise, penetration and count", url: "https://ntrs.nasa.gov/search?q=Parametric%20testing%20of%20chevrons%20on%20single%20flow%20hot%20jets" },
    { cite: "ISO 9613-1 (1993). Attenuation of sound during propagation outdoors. Part 1: absorption by the atmosphere.", used: "Air absorption per octave band (Take-off footprint)", url: "https://www.iso.org/standard/17426.html" },
    { cite: "Jaworski & Peake (2013). Aerodynamic noise from a poroelastic edge with implications for the silent flight of owls. J. Fluid Mech. 723, 456–479.", used: "Porous elastic edge: U⁶ instead of U⁵ scaling; noise cut above ~1.6 kHz", url: "https://doi.org/10.1017/jfm.2013.139" },
    { cite: "Neuhaus, Bretting & Schweizer (1973); Geyer, Sarradj & Fritzsche (2014). Measuring owl flight noise. Inter-Noise 2014.", used: "Owl flight noise versus other birds", url: "https://acoustics.asn.au/conference_proceedings/INTERNOISE2014/papers/p26.pdf" },
    { cite: "NASA Glenn: NASA's chevron technology quiets the skies.", used: "Chevron history and use on airliners (deck slides 6, 9, 10)", url: "https://www.nasa.gov/centers-and-facilities/glenn/nasas-chevron-technology-quiets-the-skies/" },
    { cite: "AIP Publishing: Owl wing design reduces aircraft, wind turbine noise pollution.", used: "Owl-inspired serrations (deck slide 6)", url: "https://publishing.aip.org/publications/latest-content/owl-wing-design-reduces-aircraft-wind-turbine-noise-pollution/" },
    { cite: "Audubon: The silent flight of owls, explained. AskNature: Wing feathers enable near-silent flight.", used: "Comb, velvet and fringe (deck slide 3)", url: "https://www.audubon.org/magazine/silent-flight-owls-explained" },
    { cite: "NASA NTRS 20060020696; KAIST 10203/314320; InsideFlyer: Boeing jets trade fuel efficiency for quieter takeoffs.", used: "Statistics for normal, chevron and owl-serrated nozzles (deck slides 12–13)", url: "https://ntrs.nasa.gov/citations/20060020696" },
  ] },
  { group: "II · The boxfish and the Bionic Car", items: [
    { cite: "Mercedes-Benz / DaimlerChrysler (2005). Mercedes-Benz bionic car: inspired by the boxfish.", used: "Cd 0.06 (fish model), 0.095 (1:4), 0.19 (car); 4.24 m; SKO: −30% weight, +40% stiffness", url: "https://en.wikipedia.org/wiki/Mercedes-Benz_Bionic" },
    { cite: "Mongabay (2005). Design of new Mercedes-Benz bionic car inspired by fish body shape.", used: "Unveiling, June 2005; wind-tunnel tests", url: "https://news.mongabay.com/2005/07/design-of-new-mercedes-benz-bionic-car-inspired-by-fish-body-shape/" },
    { cite: "Van Wassenbergh, van Manen, Marcroft, Alfaro & Stamhuis (2015). Boxfish swimming paradox resolved: forces by the flow of water around the body promote manoeuvrability. J. R. Soc. Interface 12, 20141146.", used: "The twist: destabilising yaw moments", url: "https://doi.org/10.1098/rsif.2014.1146" },
    { cite: "Mercedes-Benz Group: bionic components; after Mattheck, C. (1998), Design in Nature: Learning from Trees.", used: "SKO (Soft Kill Option) and CAO: growing structures like bone", url: "https://group.mercedes-benz.com/sustainability/resources-circularity/materials/bionic-components.html" },
    { cite: "Deck slides 18–25 (team research).", used: "Boxfish facts, applications, timeline, statistical table: 4.3 vs 5.4 L/100 km, 20% better, NOx up to 80% lower", url: "#slides" },
  ] },
  { group: "III · Shark skin, riblets and sonar", items: [
    { cite: "Bechert, Bruse, Hage, van der Hoeven & Hoppe (1997). Experiments on drag-reducing surfaces and their optimization with an adjustable geometry. J. Fluid Mech. 338, 59–87.", used: "Riblet drag curves: blades 9.9%, scalloped 6.5%, sawtooth ~5%; optimum s⁺ ≈ 15–17", url: "https://doi.org/10.1017/S0022112096004673" },
    { cite: "García-Mayoral & Jiménez (2011). Drag reduction by riblets. Phil. Trans. R. Soc. A 369, 1412–1427.", used: "Why riblets stop working past s⁺ ≈ 25–30", url: "https://doi.org/10.1098/rsta.2010.0359" },
    { cite: "Dean & Bhushan (2010). Shark-skin surfaces for fluid-drag reduction in turbulent flow: a review. Phil. Trans. R. Soc. A 368, 4775–4806.", used: "Denticle sizes, riblet shapes, applications", url: "https://doi.org/10.1098/rsta.2010.0201" },
    { cite: "Wei et al. (2025). Bioinspiration & Biomimetics 20, 066002 (riblets on a towed sonar array; simulation).", used: "Designs 17, 27, 40, 41, 61: noise, drag, 250 and 750 Hz peaks (deck slides 31, 34)", url: "https://iopscience.iop.org/journal/1748-3190" },
    { cite: "Urick, R. J. (1983). Principles of Underwater Sound, 3rd ed. McGraw-Hill.", used: "Passive sonar equation; ship noise sources; cavitation", url: "https://www.google.com/search?q=Urick+Principles+of+Underwater+Sound+passive+sonar+equation" },
    { cite: "Ross, D. (1976). Mechanics of Underwater Noise. Pergamon.", used: "Propeller, machinery and flow noise; cavitation inception with depth", url: "https://www.google.com/search?q=Ross+Mechanics+of+Underwater+Noise+1976" },
    { cite: "Schlichting & Gersten. Boundary-Layer Theory.", used: "Flat-plate friction law Cf = 0.0592 Re⁻⁰·² and wall units", url: "https://doi.org/10.1007/978-3-662-52919-5" },
  ] },
  { group: "Sound", items: [
    { cite: "IEC 61672-1. Electroacoustics: sound level meters (A-weighting).", used: "Every dBA figure on the site", url: "https://www.google.com/search?q=IEC+61672-1+sound+level+meters+A-weighting" },
    { cite: "Web Audio API (W3C).", used: "The live sound: octave-band shaped noise plus tones", url: "https://www.w3.org/TR/webaudio/" },
  ] },
];

const TEAM = [
  { roll: "C155", name: "Krish Dhume" },
  { roll: "C158", name: "Yashil Doshi" },
  { roll: "C170", name: "Lakshya Kamat" },
];
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("");

export default function References() {
  const [tab, setTab] = useState<Tab>("sources");
  const [lb, setLb] = useState<number | null>(null);
  useEffect(() => {
    const read = () => { const h = location.hash.replace("#", "") as Tab; if (TABS.some(([k]) => k === h)) setTab(h); };
    read();
    if (!location.hash && store<boolean>("story")) setTab("team");
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (lb === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      if (e.key === "ArrowRight") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.min(N_SLIDES, i + 1))); }
      if (e.key === "ArrowLeft") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.max(1, i - 1))); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [lb]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <main className="wrap" style={{ paddingBottom: 40 }}>
      <nav className="reftabs" aria-label="Reference sections">
        {TABS.map(([k, l]) => <a key={k} href={"#" + k} aria-current={tab === k} onClick={() => setTab(k)}>{l}</a>)}
      </nav>
      {tab === "sources" && (
        <div className="srcs">
          <p className="lede">Every number on this site traces back to one of these, or to the team&apos;s own deck. Where a model makes a choice that is not from a paper (a calibration, a teaching simplification), the page says so next to it.</p>
          {SOURCES.map((g) => (
            <section key={g.group}>
              <h3>{g.group}</h3>
              {g.items.map((s) => (
                <div className="src" key={s.url + s.cite}>
                  <cite>{s.cite}</cite>
                  <span>{s.used}</span>
                  <a href={s.url} target={s.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer" onClick={s.url === "#slides" ? () => setTab("slides") : undefined}>{s.url.startsWith("#") ? "see the Presentation tab" : s.url}</a>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {tab === "slides" && (
        <>
          <p className="lede" style={{ marginBottom: 18 }}>The original deck, <i>Biomimicry for noise reduction / enhanced aerodynamic design</i>, 38 slides. Click any slide to read it full size; arrow keys page through.</p>
          <div className="slides">
            {Array.from({ length: N_SLIDES }, (_, i) => (
              <button key={i} onClick={() => setLb(i + 1)}><img src={`/slides/slide-${pad(i + 1)}.jpg`} alt={`Slide ${i + 1}`} loading="lazy" /><span>slide {i + 1}</span></button>
            ))}
          </div>
        </>
      )}
      {tab === "team" && (
        <>
          <p className="lede" style={{ marginBottom: 24 }}>B.Tech CE, Division C. Three people, three animals, one question: can nature make machines quieter?</p>
          <div className="team">
            {TEAM.map((m, i) => (
              <figure key={m.roll} className="member" style={{ ["--c" as string]: ["var(--owl)", "var(--fish)", "var(--shark)"][i] }}>
                <div className="mono-badge"><span>{initials(m.name)}</span></div>
                <figcaption><span className="tm-roll">{m.roll}</span><b>{m.name}</b></figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      {lb !== null && (
        <div className="lightbox" role="dialog" aria-label={`Slide ${lb}`} onClick={(e) => { if (e.target === e.currentTarget) setLb(null); }}>
          <img src={`/slides/slide-${pad(lb)}.jpg`} alt={`Slide ${lb}`} />
          <div className="row">
            <button className="btn sm" disabled={lb <= 1} onClick={() => setLb(lb - 1)}><ChevronLeft size={14} /> Prev</button>
            <span className="mono" style={{ color: "var(--ink)" }}>{lb} / {N_SLIDES}</span>
            <button className="btn sm" disabled={lb >= N_SLIDES} onClick={() => setLb(lb + 1)}>Next <ChevronRight size={14} /></button>
            <button className="btn sm" onClick={() => setLb(null)}><X size={14} /> Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
