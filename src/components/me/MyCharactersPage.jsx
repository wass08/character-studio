"use client";

import { Copy, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import CharacterCard from "@/components/hub/CharacterCard";
import HubHeader from "@/components/shell/HubHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/primitives/Toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * /me — personal grid of the user's characters with quick actions.
 * Unauthed users see a soft prompt to sign in.
 */
const MyCharactersPage = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const setMainCharacter = useConfiguratorStore((s) => s.setMainCharacter);
  const charactersChangedAt = useConfiguratorStore(
    (s) => s.charactersChangedAt,
  );

  const [chars, setChars] = useState([]);
  const [loading, setLoading] = useState(true);
  const mainId = user?.mainCharacter;

  useEffect(() => {
    void charactersChangedAt;
    if (!isLoggedIn) {
      setChars([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    pb.collection("CharacterStudioCharacters")
      .getFullList({
        sort: "-updated",
        filter: `user = "${userId}"`,
      })
      .then((l) => !cancelled && setChars(l))
      .catch((e) => !cancelled && toast.error(e?.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userId, charactersChangedAt]);

  const onDelete = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await pb.collection("CharacterStudioCharacters").delete(c.id);
      setChars((l) => l.filter((x) => x.id !== c.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const onDuplicate = async (c) => {
    try {
      const fd = new FormData();
      fd.append("user", userId);
      fd.append("name", `${c.name} copy`);
      fd.append("gender", c.gender);
      fd.append("height", String(c.height ?? 1));
      fd.append("pose", c.pose || "");
      fd.append("customization", JSON.stringify(c.customization || {}));
      fd.append("morphValues", JSON.stringify(c.morphValues || {}));
      if (c.thumbnail) {
        // Re-fetch the thumbnail so we can include it in the new record.
        const url = pb.files.getURL(c, c.thumbnail);
        const blob = await fetch(url).then((r) => r.blob());
        fd.append("thumbnail", blob, c.thumbnail);
      }
      const rec = await pb.collection("CharacterStudioCharacters").create(fd);
      setChars((l) => [rec, ...l]);
      toast.success("Duplicated");
    } catch (e) {
      toast.error(e?.message || "Failed to duplicate");
    }
  };

  const onToggleMain = async (c) => {
    try {
      const next = mainId === c.id ? null : c.id;
      await setMainCharacter(next);
      toast.success(next ? `${c.name} is now main` : "Cleared main");
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  return (
    <div className="min-h-screen hub-bg text-white">
      <HubHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              My characters
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Your roster. Pick one to edit, or start fresh.
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold tracking-tight text-zinc-950 transition-colors hover:bg-white/90"
          >
            <Plus className="h-3.5 w-3.5" /> New character
          </Link>
        </div>

        {!isLoggedIn ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-sm text-white/55">
              Sign in to see and manage your characters.
            </p>
            <Button
              type="button"
              variant="default"
              onClick={() => setLoginDialogOpen(true)}
              className="h-auto gap-1.5 rounded-lg bg-white px-5 py-2 text-xs font-semibold tracking-tight text-zinc-950 hover:bg-white/90"
            >
              Sign in
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => `owned-${index}`).map(
              (key) => (
                <div
                  key={key}
                  className="aspect-square animate-pulse rounded-lg bg-white/[0.05]"
                />
              ),
            )}
          </div>
        ) : chars.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/55">
            No characters yet. Hit{" "}
            <span className="font-semibold text-white">Create</span> to make
            one.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {chars.map((c) => {
              const isMain = mainId === c.id;
              return (
                <CharacterCard
                  key={c.id}
                  character={c}
                  size="owned"
                  overlay={
                    <>
                      <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDuplicate(c)}
                          title="Duplicate"
                          aria-label={`Duplicate ${c.name}`}
                          className="h-8 w-8 rounded-md bg-black/60 text-white/75 backdrop-blur hover:bg-black/80 hover:text-white"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => onDelete(c)}
                          title="Delete"
                          aria-label={`Delete ${c.name}`}
                          className="h-8 w-8 rounded-md bg-black/60 text-white/75 backdrop-blur hover:bg-rose-500/80 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleMain(c)}
                        title={isMain ? "Unset main" : "Set as main"}
                        aria-label={
                          isMain
                            ? `Unset ${c.name} as main character`
                            : `Set ${c.name} as main character`
                        }
                        className={cn(
                          "absolute top-2 left-2 z-20 h-8 w-8 rounded-md transition-all",
                          isMain
                            ? "bg-amber-400/85 text-amber-950"
                            : "bg-black/60 text-white/70 opacity-0 backdrop-blur group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-amber-400/75 hover:text-amber-950",
                        )}
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            isMain && "fill-current",
                          )}
                        />
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyCharactersPage;
