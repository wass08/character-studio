import EditAssetPanel from "./EditAssetPanel";

export const dynamic = "force-dynamic";

export default async function EditAssetPage({ params }) {
  const { id } = await params;
  return <EditAssetPanel id={id} />;
}
