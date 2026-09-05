import { Suspense } from "react";
import ClaimView from "@/components/embed/ClaimView";

export const metadata = {
  title: "Save your character — Character Studio",
  robots: { index: false, follow: false },
};

// First-party landing for the embed claim funnel: /claim?code=…
export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimView />
    </Suspense>
  );
}
