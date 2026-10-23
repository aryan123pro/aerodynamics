import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter3 from "./Chapter3";

export const metadata: Metadata = { title: "Skin like teeth" };

export default function Page() {
  return (
    <>
      <PageHead numeral="III" eyebrow={<>Cell <b>III</b> · shark denticles → quiet hulls &amp; sonar</>} title={<>Skin like <em>teeth</em></>}
        coords={["Isurus oxyrinchus · shortfin mako", "Riblets · 3M film, ship hulls", "Towed sonar arrays"]}
        stats={[["100–500 µm", "size of one denticle"], ["~10%", "best drag cut, blade riblets (Bechert 1997)"], ["−8.8 dB", "quietest riblet array in simulation"], ["s⁺ ≈ 15", "the spacing that works best"]]}>
        A shark is covered in microscopic teeth. Their ridges calm the turbulence right next to its skin. On a submarine, that means less drag, a quieter hull and a sonar that can hear further.
      </PageHead>
      <Chapter3 />
    </>
  );
}
