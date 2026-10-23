import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import NozzleLab from "./NozzleLab";

export const metadata: Metadata = { title: "Nozzle Lab" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L1" eyebrow={<>Lab <b>one</b> · jet noise</>} title={<>Nozzle <em>Lab</em></>}>
        Cut your own chevrons, run the engine, and walk a microphone around it. Every level comes from the same jet-noise model as Chapter I.
      </PageHead>
      <main className="wrap"><NozzleLab /></main>
    </>
  );
}
