import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter1 from "./Chapter1";

export const metadata: Metadata = { title: "The silent owl" };

export default function Page() {
  return (
    <>
      <PageHead numeral="I" eyebrow={<>Cell <b>I</b> · owl feathers → chevron nozzles</>} title={<>The silent <em>owl</em></>}
        coords={["Tyto alba · barn owl", "Boeing 787 · GEnx-1B", "NASA Glenn, Ohio"]}
        stats={[["18 dB", "quieter than other birds of its size (deck)"], ["3–8 dB", "less take-off roar from chevrons"], ["2.7 EPNdB", "NASA's best nozzle, for 0.06% cruise thrust"], ["2006", "first airliner with chevrons: Boeing 787"]]}>
        A barn owl can glide to within a metre of a mouse without being heard. Its feathers break the air into small, quiet eddies. Engineers cut the same idea into the back of jet engines.
      </PageHead>
      <Chapter1 />
    </>
  );
}
