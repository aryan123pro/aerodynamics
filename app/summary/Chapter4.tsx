"use client";
import Future from "@/components/ch4/Future";
import TradeSpace from "@/components/ch4/TradeSpace";
import { Step, StepHead, Steps } from "@/components/ui";

export default function Chapter4() {
  return (
    <Steps id="ch4" next={{ href: "/nozzle-lab", label: "Into the labs" }}>
      <Step title="The trade-off space">
        <StepHead eyebrow="Summary" title={<>Quieter, slipperier, cheaper: <em>pick two</em></>}>All six designs from the talk, on one 3D chart.</StepHead>
        <TradeSpace />
      </Step>
      <Step title="What comes next">
        <StepHead eyebrow="Future possibilities" title={<>Where the ideas go <em>next</em></>}>From jets, cars and submarines to fans, trains and pipes.</StepHead>
        <Future />
      </Step>
    </Steps>
  );
}
