import Link from "next/link";
import Hero3D from "@/components/Hero3D";
import StartStory from "@/components/StartStory";
import "./home.css";

export default function Home() {
  return (
    <main>
      <div className="cover">
        <div className="plate"><Hero3D /></div>
        <p className="cover-stamp">Biomimicry for noise reduction &amp; enhanced aerodynamic design · Krish Dhume C155 · Yashil Doshi C158 · Lakshya Kamat C170</p>
        <div className="cover-text">
          <h1>Nature already<br />solved <em>noise.</em></h1>
          <p className="lede">An owl that hunts in silence. A boxfish that slips through water. A shark whose skin calms the flow. Each one taught engineers to tame turbulence, and each lesson is now flying, driving or diving. Every model here is 3D, runs real physics, and most of them you can <b>hear</b>.</p>
          <div className="cta">
            <StartStory />
            <Link className="btn" href="/owl">Chapter I &rarr;</Link>
            <Link className="btn" href="/nozzle-lab">Open a lab</Link>
          </div>
        </div>
      </div>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">The problem statement</p><h2>Three machines that fight the <em>air</em></h2></div>
          <p className="lede">Turbulence costs fuel and makes noise. These are the three problems the deck sets out, and the animal that answers each one.</p>
        </div>
        <div className="ledger">
          <div><span className="k">01 · Aircraft</span><b>Roar</b><span>Engine exhaust mixing hot core gas with cold air makes violent, loud currents that break airport noise rules and disturb nearby towns.</span><small>answered by the owl</small></div>
          <div><span className="k">02 · Cars</span><b>Drag</b><span>Car shapes trade cabin space against slipperiness. Streamlined cars cut drag but squeeze the cabin and weaken the structure.</span><small>answered by the boxfish</small></div>
          <div><span className="k">03 · Submarines</span><b>Friction</b><span>Smooth hulls suffer turbulent drag and noise from the boundary layer, limiting fuel economy, top speed and stealth.</span><small>answered by the shark</small></div>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">Chapters · three test cells and a verdict</p><h2>Walk the <em>facility</em></h2></div>
          <p className="lede">Each chapter is a run of 3D models built for presenting. Arrow keys step through them; press S to walk the whole story full screen, M for sound, P for speaker notes.</p>
        </div>
        <div className="cells">
          <Link className="cellcard owl" href="/owl"><span className="k">Cell I</span><h3>The silent owl</h3><p>A night take-off over a town, an owl wing in a smoke tunnel, a jet engine cut open, and the chevron teeth that make it quieter. Hear the difference.</p><div className="tags"><span className="chip"><i />jet noise</span><span className="chip"><i />Lighthill U⁸</span><span className="chip"><i />chevrons</span></div></Link>
          <Link className="cellcard fish" href="/boxfish"><span className="k">Cell II</span><h3>The box that swims</h3><p>A boxfish on a reef, five models in a wind tunnel, a fish morphing into the Mercedes-Benz Bionic Car, and the 2015 twist in the story.</p><div className="tags"><span className="chip"><i />drag coefficient</span><span className="chip"><i />SKO</span><span className="chip"><i />yaw stability</span></div></Link>
          <Link className="cellcard shark" href="/shark"><span className="k">Cell III</span><h3>Skin like teeth</h3><p>Dive into shark skin, watch riblets lift vortices off a wall, hear why submarines are loud, and listen through a towed sonar array.</p><div className="tags"><span className="chip"><i />riblets</span><span className="chip"><i />cavitation</span><span className="chip"><i />sonar</span></div></Link>
          <Link className="cellcard sum" href="/summary"><span className="k">Verdict</span><h3>No free lunch</h3><p>All three, in one trade-off space: quieter, slipperier, cheaper. Nobody gets all three. Then what comes next.</p><div className="tags"><span className="chip"><i />trade-offs</span><span className="chip"><i />future</span></div></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">Labs · open any time</p><h2>Run your own <em>tests</em></h2></div>
          <p className="lede">Three playgrounds running the same physics as the chapters. Nothing is a video: every particle, number and sound is calculated as you watch.</p>
        </div>
        <div className="drawer">
          <Link href="/nozzle-lab"><span className="k">L1 · jet noise</span><h3>Nozzle Lab</h3><p>Cut chevrons of any count, depth and shape. Walk a microphone around the engine and listen. Plot your designs on the noise-versus-thrust trade-off.</p><span className="go">design a quieter engine →</span></Link>
          <Link href="/wind-tunnel"><span className="k">L2 · drag</span><h3>Wind Tunnel</h3><p>Sculpt a car body with six sliders, watch the smoke and the wake, see where the drag comes from, then drive it 100 km on diesel or a battery.</p><span className="go">beat Cd 0.19 →</span></Link>
          <Link href="/towing-tank"><span className="k">L3 · skin friction</span><h3>Towing Tank</h3><p>Pick a riblet shape and size, set a hull speed, and find the spacing that cuts drag the most. Then wear it down and see what is left.</p><span className="go">tune the riblets →</span></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 10 }}><p className="eyebrow">One idea, three animals</p><h2>Manage the <em>eddies</em></h2></div>
          <p className="lede">Noise and drag both come from turbulence. Each animal handles it differently, and the machines copy the principle, not the exact shape.</p>
        </div>
        <div className="chain">
          <div><b>Break them up</b><p>Owl serrations and chevrons split big, loud eddies into small, weak ones that mix quickly and quietly.</p></div>
          <div><b>Don&apos;t make them</b><p>The boxfish keeps air attached around its body, so its wake (and its drag) stays small.</p></div>
          <div><b>Keep them off the wall</b><p>Shark riblets hold near-wall vortices up, so less fast fluid scrubs the skin.</p></div>
          <div><b>Pay the price</b><p>Every fix costs something: thrust, practicality, durability. Biomimicry shifts a balance; it rarely gives a free win.</p></div>
        </div>
      </section>
    </main>
  );
}
