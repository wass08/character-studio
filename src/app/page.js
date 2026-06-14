import HeroStage from "@/components/home/HeroStage";
import {
  HomeCapabilities,
  HomeCreationFlow,
  HomeEngineExport,
  HomeFinalCta,
  HomeOpenSource,
} from "@/components/home/HomeMarketingSections";
import FeaturedRow from "@/components/hub/FeaturedRow";
import LivingWall from "@/components/hub/LivingWall";
import HubHeader from "@/components/shell/HubHeader";

export const metadata = {
  title: "Character Studio",
  description:
    "Create, customize, pose, speak, export GLB characters, and share them with a live community of creators.",
};

export default function Home() {
  return (
    <div className="min-h-screen hub-bg text-white">
      <HubHeader />
      <main>
        <HeroStage />
        <FeaturedRow />
        <HomeCapabilities />
        <HomeCreationFlow />
        <HomeEngineExport />
        <HomeOpenSource />
        <LivingWall />
        <HomeFinalCta />
      </main>
    </div>
  );
}
