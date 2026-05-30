"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Play, Trash2, Loader2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pb } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";

/**
 * Voice presets used by /play/lipsync. Admins upload short audio clips, label
 * them, optionally tag a gender, and they show up in the player.
 */
const VoicesAdminPanel = () => {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [gender, setGender] = useState("other");
  const fileRef = useRef(null);
  const playRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    pb.collection("CharacterStudioVoicePresets")
      .getFullList({ sort: "position,created" })
      .then(setPresets)
      .catch((e) => toast.error(e?.message || "Failed to load voices"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const onUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !label.trim()) {
      toast.error("Need a label and an audio file");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("label", label.trim());
      fd.append("gender", gender);
      fd.append("audio", file, file.name);
      const rec = await pb
        .collection("CharacterStudioVoicePresets")
        .create(fd);
      setPresets((p) => [...p, rec]);
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Voice added");
    } catch (e2) {
      toast.error(e2?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (p) => {
    if (!confirm(`Delete "${p.label}"?`)) return;
    try {
      await pb.collection("CharacterStudioVoicePresets").delete(p.id);
      setPresets((l) => l.filter((x) => x.id !== p.id));
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const playPreview = (p) => {
    const url = pb.files.getURL(p, p.audio);
    if (!playRef.current) playRef.current = new Audio();
    playRef.current.pause();
    playRef.current.src = url;
    playRef.current.play().catch(() => {});
  };

  return (
    <AdminShell
      title="Voice presets"
      subtitle={`${presets.length} preset${presets.length === 1 ? "" : "s"}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-6">
        <form
          onSubmit={onUpload}
          className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_160px_220px_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Calm narrator"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="man">Man</SelectItem>
                <SelectItem value="woman">Woman</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audio">Audio file</Label>
            <Input
              id="audio"
              ref={fileRef}
              type="file"
              accept="audio/*"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full md:w-auto">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : presets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
            No voice presets yet — upload your first one above.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {presets.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => playPreview(p)}
                  title="Preview"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.gender || "other"}
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(p)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
};

export default VoicesAdminPanel;
