import CharacterScopedPlay from "@/components/play/CharacterScopedPlay";
import LipsyncView from "@/components/play/LipsyncView";

export const metadata = { title: "Try in Lipsync — Character Studio" };

export default async function TryLipsyncPage({ params }) {
  const { id } = await params;
  return (
    <CharacterScopedPlay characterId={id}>
      <LipsyncView />
    </CharacterScopedPlay>
  );
}
