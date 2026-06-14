"use client";

import { Camera, Star, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/primitives/Spinner";
import { toast } from "@/components/ui/primitives/Toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadToR2 } from "@/lib/r2Upload";
import { cn } from "@/lib/utils";
import { buildDefaultCustomization, pb } from "@/stores/useConfiguratorStore";
import BlendshapeSection from "./BlendshapeSection";
import { THUMBNAIL_BG_COLORS } from "./thumbnailBackgrounds";

// Client-only: AssetPreview mounts an EngineCanvas (three/webgpu). Lazy so
// the admin form shell renders without the engine in its first-load JS.
const AssetPreview = dynamic(() => import("./AssetPreview"), { ssr: false });

const ANY_GENDER = "__any__";

const blank = {
  name: "",
  group: "",
  gender: "",
  modelFile: null,
  thumbnailBg: "",
};

const startingAssetField = (genderName) => {
  if (genderName === "man") return "startingAssetMan";
  if (genderName === "woman") return "startingAssetWoman";
  return null;
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
  const [isDefault, setIsDefault] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [detectedMorphs, setDetectedMorphs] = useState([]);
  const [baseModelUrls, setBaseModelUrls] = useState([]);
  const previewRef = useRef(null);

  useEffect(() => {
    Promise.all([
      pb.collection("CharacterStudioGroups").getFullList({ sort: "+position" }),
      pb.collection("CharacterStudioAssets").getList(1, 200, {
        sort: "-created",
        expand: "gender",
        skipTotal: true,
      }),
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
      })
      .finally(() => setLookupsLoaded(true));
  }, []);

  // Radix Select latches onto its initial `value`. If it mounts with "" and
  // we later push a real id, the trigger keeps showing the placeholder. Hold
  // back the whole form until lookups + asset data are merged, so the Selects
  // mount with their final values in one shot.
  useEffect(() => {
    if (!lookupsLoaded) return;
    if (asset) {
      setForm({
        name: asset.name || "",
        group: asset.group || "",
        gender: asset.gender || "",
        modelFile: null,
        thumbnailBg: asset.thumbnailBg || "",
      });
      setThumbnailUrl(
        asset.r2ThumbnailUrl ||
          (asset.thumbnail ? pb.files.getURL(asset, asset.thumbnail) : null),
      );
    }
    setHydrated(true);
  }, [asset, lookupsLoaded]);

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
  }, [form.modelFile, localModelUrl]);

  const modelUrl = useMemo(() => {
    if (localModelUrl) return localModelUrl;
    if (asset?.r2Url) return asset.r2Url;
    if (asset?.url) return pb.files.getURL(asset, asset.url);
    return null;
  }, [localModelUrl, asset]);

  // A texture-only asset (e.g. makeup) carries an image, not a GLB. Detect it
  // from the freshly-picked file's type, or the saved asset's extension.
  const isTexture = useMemo(() => {
    if (form.modelFile) {
      return (
        form.modelFile.type?.startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(form.modelFile.name)
      );
    }
    const u = asset?.r2Url || asset?.url;
    return u ? /\.(png|jpe?g|webp)$/i.test(u) : false;
  }, [form.modelFile, asset]);

  // Reset detected morphs when the model source changes — the Model effect
  // in AssetPreview will repopulate from the newly-loaded scene.
  useEffect(() => {
    void modelUrl;
    setDetectedMorphs([]);
  }, [modelUrl]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === form.group) || null,
    [groups, form.group],
  );
  const selectedGenderName = useMemo(() => {
    if (asset?.expand?.gender?.name) return asset.expand.gender.name;
    return genders.find((g) => g.id === form.gender)?.name || null;
  }, [asset, form.gender, genders]);
  const defaultField = startingAssetField(selectedGenderName);
  const canBeDefault = Boolean(selectedGroup && defaultField);

  useEffect(() => {
    if (!asset || !selectedGroup || !defaultField) {
      setIsDefault(false);
      return;
    }
    setIsDefault(selectedGroup[defaultField] === asset.id);
  }, [asset, selectedGroup, defaultField]);

  // Texture assets (makeup) paint onto the skin material, so the preview needs
  // a base character to composite against. Resolve the gender's full default
  // outfit — each group's default asset (or the first asset for non-optional
  // groups) — mirroring how the live configurator assembles the avatar in
  // fetchCategories, so the texture is shown on the whole default character.
  useEffect(() => {
    if (!isTexture || !form.gender || !defaultField || groups.length === 0) {
      setBaseModelUrls([]);
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      const all = await pb
        .collection("CharacterStudioAssets")
        .getFullList({
          filter: `gender = "${form.gender}"`,
          sort: "-created",
        })
        .catch(() => null);
      if (cancelled || !all) {
        if (!cancelled) setBaseModelUrls([]);
        return;
      }
      const urls = [];
      const groupsWithAssets = groups.map((group) => ({
        ...group,
        assets: all.filter((a) => a.group === group.id),
      }));
      const defaultCustomization = buildDefaultCustomization(
        groupsWithAssets,
        selectedGenderName,
      );
      for (const entry of Object.values(defaultCustomization)) {
        const pick = entry?.asset;
        if (!pick) continue;
        const url =
          pick.r2Url || (pick.url ? pb.files.getURL(pick, pick.url) : null);
        // Skip texture assets (e.g. other Face items) — only meshes render.
        if (url && !/\.(png|jpe?g|webp)$/i.test(url)) urls.push(url);
      }
      if (!cancelled) setBaseModelUrls(urls);
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [isTexture, form.gender, groups, defaultField, selectedGenderName]);

  const snapshot = async () => {
    if (!previewRef.current) return;
    setCapturing(true);
    try {
      const blob = await previewRef.current.capture(512);
      const previewUrl = URL.createObjectURL(blob);
      if (thumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(thumbnailUrl);
      setThumbnailUrl(previewUrl);
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
      payload.append("thumbnailBg", form.thumbnailBg || "");

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
        ? await pb.collection("CharacterStudioAssets").update(asset.id, payload)
        : await pb.collection("CharacterStudioAssets").create(payload);

      if (canBeDefault && selectedGroup && defaultField) {
        const wasDefault = selectedGroup[defaultField] === record.id;
        if (isDefault && !wasDefault) {
          await pb
            .collection("CharacterStudioGroups")
            .update(selectedGroup.id, { [defaultField]: record.id });
        } else if (!isDefault && wasDefault) {
          await pb
            .collection("CharacterStudioGroups")
            .update(selectedGroup.id, { [defaultField]: "" });
        }
      }

      toast.success(asset ? "Asset updated" : "Asset created");
      router.push(`/admin/${record.id}`);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[2fr_3fr]"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {asset ? "Asset details" : "New asset"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input
              id="asset-name"
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Group</Label>
            <Select
              value={form.group}
              onValueChange={(v) => setForm((f) => ({ ...f, group: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group…">
                  {groups.find((g) => g.id === form.group)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gender</Label>
            <Select
              value={form.gender || ANY_GENDER}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, gender: v === ANY_GENDER ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {form.gender
                    ? genders.find((g) => g.id === form.gender)?.name
                    : "Any"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_GENDER}>Any</SelectItem>
                {genders.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-file">
              Model (.glb) or texture (.png){!asset && " · required"}
            </Label>
            <Input
              id="asset-file"
              type="file"
              accept=".glb,.gltf,model/gltf-binary,.png,.jpg,.jpeg,.webp,image/*"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  modelFile: e.target.files?.[0] || null,
                }))
              }
            />
            {asset && !form.modelFile && (
              <span className="text-[11px] text-muted-foreground">
                Leave empty to keep the current file.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Thumbnail</Label>
            <div className="flex items-center gap-3">
              <div
                className="h-20 w-20 overflow-hidden rounded-lg border border-border"
                style={{
                  backgroundColor: form.thumbnailBg || "rgba(0,0,0,0.3)",
                }}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="thumbnail"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    none
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={snapshot}
                disabled={!modelUrl || capturing}
              >
                {capturing ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Take snapshot
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Frame the model in the preview, then snapshot to set the
              thumbnail.
            </span>

            <div className="mt-1 flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Background
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setForm((f) => ({ ...f, thumbnailBg: "" }))}
                  title="No background"
                  aria-label="No background"
                  className={cn(
                    "relative h-7 w-7 overflow-hidden rounded-md bg-transparent p-0 ring-1 transition hover:bg-transparent",
                    form.thumbnailBg === ""
                      ? "ring-2 ring-foreground"
                      : "ring-border hover:ring-foreground/40",
                  )}
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%), linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 4px 4px",
                    backgroundColor: "#1a1a22",
                  }}
                />
                {THUMBNAIL_BG_COLORS.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setForm((f) => ({ ...f, thumbnailBg: color }))
                    }
                    title={color}
                    aria-label={`Background ${color}`}
                    className={cn(
                      "h-7 w-7 rounded-md p-0 ring-1 transition hover:bg-transparent",
                      form.thumbnailBg === color
                        ? "ring-2 ring-foreground"
                        : "ring-border hover:ring-foreground/40",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {canBeDefault && (
            <Label
              htmlFor="asset-default-toggle"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <Checkbox
                id="asset-default-toggle"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(Boolean(v))}
              />
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Default for {selectedGenderName} ·{" "}
                <span className="text-muted-foreground">
                  {selectedGroup?.name}
                </span>
              </span>
            </Label>
          )}

          <Button type="submit" disabled={busy} className="mt-2">
            {busy && <Spinner />}
            <span>{asset ? "Save changes" : "Create asset"}</span>
          </Button>

          {asset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
              className="self-start text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete asset
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Preview</h2>
        <AssetPreview
          ref={previewRef}
          url={isTexture ? baseModelUrls : modelUrl}
          textureUrl={isTexture ? modelUrl : null}
          height={480}
          backgroundColor={form.thumbnailBg || null}
          onMorphsDetected={isTexture ? undefined : setDetectedMorphs}
        />
        <p className="text-[11px] text-muted-foreground">
          Drag to rotate, scroll to zoom. The snapshot uses the current camera
          angle.
        </p>
        {modelUrl && !isTexture && (
          <BlendshapeSection morphs={detectedMorphs} />
        )}
      </div>
    </form>
  );
};

export default AssetForm;
