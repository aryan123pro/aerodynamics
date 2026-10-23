"use client";
import Chevron from "@/components/ch1/Chevron";
import Engine from "@/components/ch1/Engine";
import Footprint from "@/components/ch1/Footprint";
import OwlNumbers from "@/components/ch1/OwlNumbers";
import OwlWing from "@/components/ch1/OwlWing";
import { Connects, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter1() {
  return (
    <Steps id="ch1" next={{ href: "/boxfish", label: "Chapter II: The box that swims" }}>
      <Step title="The takeoff roar">
        <StepHead eyebrow="Step 1 · the problem statement" title={<>Every take-off wakes a <em>town</em></>}>Jet exhaust mixing with cold air makes a roar that breaks airport noise rules and reaches homes kilometres away.</StepHead>
        <Footprint />
      </Step>
      <Step title="The silent wing">
        <StepHead eyebrow="Step 2 · the biology" title={<>Three tricks of a <em>silent</em> wing</>}>A comb on the leading edge, velvet on top, a fringe at the back. Switch them off and watch the air.</StepHead>
        <OwlWing />
      </Step>
      <Step title="Inside the jet">
        <StepHead eyebrow="Step 3 · where the roar comes from" title={<>Speed is <em>sound</em></>}>A jet engine&apos;s noise is made outside it, where its exhaust meets the air.</StepHead>
        <Engine />
      </Step>
      <Step title="Teeth on the nozzle">
        <StepHead eyebrow="Step 4 · the biomimetic fix" title={<>An owl&apos;s edge, cut in <em>metal</em></>}>Chevrons: the sawtooth rim on the Boeing 787 and 737 MAX.</StepHead>
        <Chevron />
        <Connects items={[{ href: "/nozzle-lab", t: "Nozzle Lab", s: "Design your own chevrons and listen from anywhere around the engine" }]} />
      </Step>
      <Step title="Owl numbers">
        <StepHead eyebrow="Step 5 · statistics, timeline, pros & cons" title={<>Quieter, at a <em>price</em></>}>What the measurements say, and what it costs.</StepHead>
        <OwlNumbers />
      </Step>
    </Steps>
  );
}
