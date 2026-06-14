import CommunityPage from "@/components/community/CommunityPage";
import HubHeader from "@/components/shell/HubHeader";

export const metadata = {
  title: "Community — Character Studio",
  description:
    "Browse public Character Studio characters from the creator community.",
};

export default function Community() {
  return (
    <div className="min-h-screen hub-bg text-white">
      <HubHeader />
      <CommunityPage />
    </div>
  );
}
