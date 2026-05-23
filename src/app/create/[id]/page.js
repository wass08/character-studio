import EditorView from "@/components/editor/EditorView";

export const metadata = { title: "Edit — Character Studio" };

export default async function EditPage({ params }) {
  const { id } = await params;
  return <EditorView characterId={id} />;
}
