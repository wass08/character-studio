import { Suspense } from "react";
import EmbedView from "@/components/embed/EmbedView";

export const metadata = {
  title: "Character Studio",
  robots: { index: false, follow: false },
};

// Embeddable creator: iframe-able from any site, guest identity, no login UI.
// Contract and host guide: docs/integration/embed.md.
export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedView />
    </Suspense>
  );
}
