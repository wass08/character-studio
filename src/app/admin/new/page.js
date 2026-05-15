import AdminShell from "@/components/admin/AdminShell";
import AssetForm from "@/components/admin/AssetForm";

export const dynamic = "force-dynamic";

export default function NewAssetPage() {
  return (
    <AdminShell title="New asset" subtitle="Upload a .glb, then snapshot its thumbnail">
      <AssetForm />
    </AdminShell>
  );
}
