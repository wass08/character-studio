import HeroStage from "@/components/home/HeroStage";
import FeaturedRow from "@/components/hub/FeaturedRow";
import LivingWall from "@/components/hub/LivingWall";
import HubHeader from "@/components/shell/HubHeader";

export const metadata = {
  title: "Character Studio",
  description:
    "Create your character. Pose them, make them speak, take them somewhere.",
};

export default function Home() {
  return (
    <div className="min-h-screen hub-bg text-white">
      <HubHeader />
      <main>
        <HeroStage />
        <FeaturedRow />
        <LivingWall />
      </main>
    </div>
  );
}
