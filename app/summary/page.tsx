import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter4 from "./Chapter4";

export const metadata: Metadata = { title: "No free lunch" };

export default function Page() {
  return (
    <>
      <PageHead numeral="IV" eyebrow={<>The <b>verdict</b> · summary &amp; future possibilities</>} title={<>No free <em>lunch</em></>}>
        Biomimicry works best when the principle is borrowed, not the exact shape, and when the design is adapted to engineering limits.
      </PageHead>
      <Chapter4 />
    </>
  );
}
