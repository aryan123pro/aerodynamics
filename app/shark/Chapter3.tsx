"use client";
import LoudShip from "@/components/ch3/LoudShip";
import Riblets from "@/components/ch3/Riblets";
import SharkNumbers from "@/components/ch3/SharkNumbers";
import SkinDive from "@/components/ch3/SkinDive";
import TowedArray from "@/components/ch3/TowedArray";
import { Connects, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter3() {
  return (
    <Steps id="ch3" next={{ href: "/summary", label: "Chapter IV: No free lunch" }}>
      <Step title="Zoom into shark skin">
        <StepHead eyebrow="Step 1 · the biology" title={<>A coat of tiny <em>teeth</em></>}>From the whole shark down to one scale, a fifth of a millimetre long.</StepHead>
        <SkinDive />
      </Step>
      <Step title="Riblets tame the wall">
        <StepHead eyebrow="Step 2 · how it works" title={<>Keep the vortices <em>off</em> the wall</>}>The ridges hold the near-wall swirls up, so less fast fluid scrubs the surface.</StepHead>
        <Riblets />
        <Connects items={[{ href: "/towing-tank", t: "Towing Tank", s: "Design riblets for a real hull and tune them to its speed" }]} />
      </Step>
      <Step title="Why ships are loud">
        <StepHead eyebrow="Step 3 · the problem" title={<>Three ways a ship <em>shouts</em></>}>Propeller, machinery and the flow along the hull, and who can hear them.</StepHead>
        <LoudShip />
      </Step>
      <Step title="A quieter sonar">
        <StepHead eyebrow="Step 4 · the application" title={<>Teach the ear to <em>whisper</em></>}>Riblets on a towed sonar array, from a 2025 simulation study.</StepHead>
        <TowedArray />
      </Step>
      <Step title="Shark numbers">
        <StepHead eyebrow="Step 5 · statistics, pros & cons" title={<>Small gains, <em>real</em> gains</>}>What the data says, and what holds riblets back.</StepHead>
        <SharkNumbers />
      </Step>
    </Steps>
  );
}
