import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import TankLab from "./TankLab";

export const metadata: Metadata = { title: "Towing Tank" };

export default function Page() {
  return (
    <>
      <PageHead numeral="L3" eyebrow={<>Lab <b>three</b> · skin friction</>} title={<>Towing <em>Tank</em></>}>
        Design riblets for a 100 m ship: pick a shape, size it in micrometres, and see what it saves at sea, and what wear takes away.
      </PageHead>
      <main className="wrap"><TankLab /></main>
    </>
  );
}
