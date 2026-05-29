import CharacterScopedPlay from "@/components/play/CharacterScopedPlay";
import PhotoBoothView from "@/components/play/PhotoBoothView";

export const metadata = { title: "Photo Booth — Character Studio" };

export default async function PhotoBoothPage({ params }) {
  const { id } = await params;
  return (
    <CharacterScopedPlay characterId={id}>
      <PhotoBoothView />
    </CharacterScopedPlay>
  );
}
