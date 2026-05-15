"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/stores/useConfiguratorStore";
import { uploadToR2 } from "@/lib/r2Upload";
import { toast } from "@/components/ui/primitives/Toast";
import { Spinner } from "@/components/ui/primitives/Spinner";
import AssetPreview from "./AssetPreview";

const FIELD =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:border-white/35 focus:outline-none";
const LABEL = "text-xs text-white/55";

const blank = {
  name: "",
  group: "",
  gender: "",
  modelFile: null,
};

const AssetForm = ({ asset = null }) => {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [groups, setGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [localModelUrl, setLocalModelUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const previewRef = useRef(null);

  // Hydrate form from asset (edit mode).
  useEffect(() => {
    if (!asset) return;
    setForm({
      name: asset.name || "",
      group: asset.group || "",
      gender: asset.gender || "",
      modelFile: null,
    });
    setThumbnailUrl(
      asset.r2ThumbnailUrl ||
        (asset.thumbnail ? pb.files.getURL(asset, asset.thumbnail) : null),
    );
  }, [asset]);

  // Load groups + genders.
  useEffect(() => {
    Promise.all([
      pb.collection("CharacterStudioGroups").getFullList({ sort: "+position" }),
      pb
        .collection("CharacterStudioAssets")
        .getList(1, 200, { sort: "-created", expand: "gender", skipTotal: true }),
    ])
      .then(([g, a]) => {
        setGroups(g);
        const uniq = new Map();
        a.items.forEach((rec) => {
          const gen = rec.expand?.gender;
          if (gen && !uniq.has(gen.id)) uniq.set(gen.id, gen);
        });
        setGenders([...uniq.values()]);
      })
      .catch((err) => {
        if (err?.isAbort) return;
        toast.error(err?.message || "Failed to load form data");
      });
  }, []);

  // Manage local object URL for previewing an unsaved model file.
  useEffect(() => {
    if (!form.modelFile) {
      if (localModelUrl) {
        URL.revokeObjectURL(localModelUrl);
        setLocalModelUrl(null);
      }
      return;
    }
    const url = URL.createObjectURL(form.modelFile);
    setLocalModelUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.modelFile]);

  const modelUrl = useMemo(() => {
    if (localModelUrl) return localModelUrl;
    if (asset?.r2Url) return asset.r2Url;
    if (asset?.url) return pb.files.getURL(asset, asset.url);
    return null;
  }, [localModelUrl, asset]);

  const snapshot = async () => {
    if (!previewRef.current) return;
    setCapturing(true);
    try {
      const blob = await previewRef.current.capture(512);
      const previewUrl = URL.createObjectURL(blob);
      // Clean up previous local preview URL.
      if (thumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(thumbnailUrl);
      setThumbnailUrl(previewUrl);
      // Attach blob to form so save() picks it up.
      const file = new File([blob], `thumb-${Date.now()}.png`, {
        type: "image/png",
      });
      setForm((f) => ({ ...f, _thumbnailFile: file }));
      toast.success("Snapshot captured");
    } catch (err) {
      toast.error(
        err?.message?.includes("tainted")
          ? "Snapshot blocked by CORS. Configure the CDN to allow this origin."
          : err?.message || "Snapshot failed",
      );
    } finally {
      setCapturing(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.group) {
      toast.error("Name and group are required");
      return;
    }
    if (!asset && !form.modelFile) {
      toast.error("Pick a model file");
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("group", form.group);
      if (form.gender) payload.append("gender", form.gender);
      else if (asset) payload.append("gender", "");

      if (form.modelFile) {
        const r2Url = await uploadToR2(form.modelFile, "assets/models");
        payload.append("r2Url", r2Url);
      }
      if (form._thumbnailFile) {
        const r2ThumbnailUrl = await uploadToR2(
          form._thumbnailFile,
          "assets/thumbnails",
        );
        payload.append("r2ThumbnailUrl", r2ThumbnailUrl);
      }

      const record = asset
        ? await pb
            .collection("CharacterStudioAssets")
            .update(asset.id, payload)
        : await pb.collection("CharacterStudioAssets").create(payload);

      toast.success(asset ? "Asset updated" : "Asset created");
      router.push(`/admin/${record.id}`);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[2fr_3fr]"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          {asset ? "Asset details" : "New asset"}
        </h2>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Name</span>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Group</span>
          <select
            required
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            className={FIELD}
          >
            <option value="">Select group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Gender</span>
          <select
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            className={FIELD}
          >
            <option value="">Any</option>
            {genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>
            Model file (.glb){!asset && " · required"}
          </span>
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                modelFile: e.target.files?.[0] || null,
              }))
            }
            className="text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
          />
          {asset && !form.modelFile && (
            <span className="text-[11px] text-white/40">
              Leave empty to keep the current file.
            </span>
          )}
        </label>

        <div className="mt-2 flex flex-col gap-1">
          <span className={LABEL}>Thumbnail</span>
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="thumbnail"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35">
                  none
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={snapshot}
              disabled={!modelUrl || capturing}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 transition-colors hover:bg-white/15 disabled:opacity-60"
            >
              {capturing && <Spinner className="h-3.5 w-3.5" />}
              <span>Take snapshot</span>
            </button>
          </div>
          <span className="text-[11px] text-white/40">
            Frame the model in the preview, then snapshot to set the thumbnail.
          </span>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
        >
          {busy && <Spinner />}
          <span>{asset ? "Save changes" : "Create asset"}</span>
        </button>

        {asset && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Delete "${asset.name}"?`)) return;
              try {
                await pb.collection("CharacterStudioAssets").delete(asset.id);
                toast.success("Asset deleted");
                router.push("/admin");
              } catch (err) {
                toast.error(err?.message || "Delete failed");
              }
            }}
            className="text-xs text-rose-400/70 hover:text-rose-300"
          >
            Delete asset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Preview</h2>
        <AssetPreview ref={previewRef} url={modelUrl} height={480} />
        <p className="text-[11px] text-white/40">
          Drag to rotate, scroll to zoom. The snapshot uses the current
          camera angle.
        </p>
      </div>
    </form>
  );
};

export default AssetForm;
