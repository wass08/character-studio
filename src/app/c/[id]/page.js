import CharacterPageView from "@/components/character/CharacterPageView";

export const metadata = { title: "Character — Studio" };

export default async function CharacterPage({ params }) {
  const { id } = await params;
  return <CharacterPageView id={id} />;
}
