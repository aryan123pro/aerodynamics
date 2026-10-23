"use client";
import MeetBoxfish from "@/components/ch2/MeetBoxfish";
import CarNumbers from "@/components/ch2/CarNumbers";
import Morph from "@/components/ch2/Morph";
import Tunnel from "@/components/ch2/Tunnel";
import Yaw from "@/components/ch2/Yaw";
import { Connects, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter2() {
  return (
    <Steps id="ch2" next={{ href: "/shark", label: "Chapter III: Skin like teeth" }}>
      <Step title="Meet the boxfish">
        <StepHead eyebrow="Step 1 · the biology" title={<>A box with <em>fins</em></>}>Armour of bony hexagons, a square cross-section, and surprisingly little drag.</StepHead>
        <MeetBoxfish />
      </Step>
      <Step title="Into the wind tunnel">
        <StepHead eyebrow="Step 2 · measuring drag" title={<>Smoke tells the <em>truth</em></>}>Put a fish, a clay model, a car and a brick in the same wind and read the drag.</StepHead>
        <Tunnel />
        <Connects items={[{ href: "/wind-tunnel", t: "Wind Tunnel", s: "Sculpt your own car body in smoke and drive it 100 km" }]} />
      </Step>
      <Step title="Fish into car">
        <StepHead eyebrow="Step 3 · the transformation" title={<>From fins to <em>wheels</em></>}>The shape, and the way the fish builds its armour, carried into a real car.</StepHead>
        <Morph />
      </Step>
      <Step title="The twist">
        <StepHead eyebrow="Step 4 · what the fish is really for" title={<>Built to <em>turn</em></>}>A 2015 flow-tank study turned the boxfish story around.</StepHead>
        <Yaw />
      </Step>
      <Step title="Car numbers">
        <StepHead eyebrow="Step 5 · statistics, applications, timeline" title={<>Twenty per cent, from <em>shape</em></>}>Fuel, range, and what it took to get there.</StepHead>
        <CarNumbers />
      </Step>
    </Steps>
  );
}
