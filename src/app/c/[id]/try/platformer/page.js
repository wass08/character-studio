import CharacterScopedPlay from "@/components/play/CharacterScopedPlay";
import PlatformerView from "@/components/play/PlatformerView";

export const metadata = { title: "Try in Platformer — Character Studio" };

export default async function TryPlatformerPage({ params }) {
  const { id } = await params;
  return (
    <CharacterScopedPlay characterId={id}>
      <PlatformerView />
    </CharacterScopedPlay>
  );
}
