import CharacterScopedPlay from "@/components/play/CharacterScopedPlay";
import PlaygroundView from "@/components/play/PlaygroundView";

export const metadata = { title: "Try in Playground — Character Studio" };

export default async function TryPlaygroundPage({ params }) {
  const { id } = await params;
  return (
    <CharacterScopedPlay characterId={id}>
      <PlaygroundView />
    </CharacterScopedPlay>
  );
}
