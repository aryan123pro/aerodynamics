import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter2 from "./Chapter2";

export const metadata: Metadata = { title: "The box that swims" };

export default function Page() {
  return (
    <>
      <PageHead numeral="II" eyebrow={<>Cell <b>II</b> · boxfish → Mercedes-Benz Bionic Car</>} title={<>The box that <em>swims</em></>}
        coords={["Ostracion cubicus · yellow boxfish", "Mercedes-Benz Bionic · 2005", "DaimlerChrysler Research, Stuttgart"]}
        stats={[["0.06", "drag coefficient of the boxfish model"], ["0.19", "the Bionic Car (normal cars 0.25–0.35)"], ["4.3 L", "per 100 km, 20% less than a comparable car"], ["−30%", "body weight from bone-style design (SKO)"]]}>
        A slow reef fish shaped like a box turned out to be one of the most slippery shapes ever put in a wind tunnel. In 2005 Mercedes-Benz built a car around it, then discovered what the fish was really for.
      </PageHead>
      <Chapter2 />
    </>
  );
}
