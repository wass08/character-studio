import HubHeader from "@/components/shell/HubHeader";
import HubHero from "@/components/hub/HubHero";
import FeaturedRow from "@/components/hub/FeaturedRow";
import ExperiencesGrid from "@/components/hub/ExperiencesGrid";
import LivingWall from "@/components/hub/LivingWall";

export const metadata = {
  title: "Character Studio",
  description: "Build, play with, and share characters.",
};

export default function Home() {
  return (
    <div className="min-h-screen hub-bg text-white">
      <HubHeader />
      <main>
        <HubHero />
        <FeaturedRow />
        <ExperiencesGrid />
        <LivingWall />
      </main>
    </div>
  );
}
