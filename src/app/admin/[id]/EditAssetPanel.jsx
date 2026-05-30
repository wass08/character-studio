"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import AdminShell from "@/components/admin/AdminShell";
import AssetForm from "@/components/admin/AssetForm";
import { toast } from "@/components/ui/primitives/Toast";

const EditAssetPanel = ({ id }) => {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    pb.collection("CharacterStudioAssets")
      .getOne(id, { expand: "group,gender" })
      .then(setAsset)
      .catch((err) => {
        if (err?.isAbort) return;
        if (err?.status === 404) setNotFound(true);
        else toast.error(err?.message || "Failed to load asset");
      })
      .finally(() => setLoading(false));
  }, [id, isAdmin]);

  return (
    <AdminShell
      title={asset?.name || (loading ? "Loading…" : "Asset")}
      subtitle={
        asset
          ? `${asset.expand?.group?.name || "—"}${asset.expand?.gender?.name ? ` · ${asset.expand.gender.name}` : ""}`
          : null
      }
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-white/55">
          Loading…
        </div>
      ) : notFound ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-white/60">Asset not found.</p>
          <Link
            href="/admin"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 hover:bg-white/15"
          >
            Back to list
          </Link>
        </div>
      ) : asset ? (
        <AssetForm asset={asset} />
      ) : null}
    </AdminShell>
  );
};

export default EditAssetPanel;
