import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import TunnelLab from "./TunnelLab";

export const metadata: Metadata = { title: "Wind Tunnel" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L2" eyebrow={<>Lab <b>two</b> · drag</>} title={<>Wind <em>Tunnel</em></>}>
        Sculpt a car body, read its drag in the smoke, then drive it 100 km. Can you beat the Bionic Car&apos;s 0.19?
      </PageHead>
      <main className="wrap"><TunnelLab /></main>
    </>
  );
}
