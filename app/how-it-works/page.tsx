import type { Metadata } from "next";

import { HowItWorksSections } from "@/components/how-it-works/how-it-works-sections";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "From creating a campaign to claiming your Arizona tuition tax credit — learn how Arizona Christian Tuition connects donors and families.",
};

export default function HowItWorksPage() {
  return <HowItWorksSections />;
}
