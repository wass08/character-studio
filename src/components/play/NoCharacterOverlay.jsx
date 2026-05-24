"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Plus } from "lucide-react";

/**
 * Shown on top of a per-character experiment when no character is loaded.
 * Lets the user pick one of theirs, or jump to /create.
 */
const NoCharacterOverlay = () => {
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCharacterId) return;
    setLoading(true);
    pb.collection("CharacterStudioCharacters")
      .getList(1, 8, { sort: "-created", skipTotal: true, expand: "user" })
      .then((r) => setList(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentCharacterId]);

  if (currentCharacterId) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-md px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/85 p-6 shadow-2xl">
        <h3 className="text-base font-semibold tracking-tight text-white">
          Pick a character
        </h3>
        <p className="mt-1 text-xs text-white/55">
          Pick someone from the wall or jump in and make your own.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-lg bg-white/[0.05]"
                />
              ))
            : list.map((c) => {
                const t = c.thumbnail
                  ? pb.files.getURL(c, c.thumbnail, { thumb: "128x128" })
                  : null;
                return (
                  <Button
                    type="button"
                    key={c.id}
                    variant="ghost"
                    onClick={() => loadCharacter(c)}
                    className="group flex h-auto flex-col items-stretch justify-start gap-1 p-0 text-left font-normal hover:bg-transparent hover:text-inherit"
                  >
                    <span className="block aspect-square overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/30">
                      {t && (
                        <img
                          src={t}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="truncate text-[10px] text-white/65">
                      {c.name}
                    </span>
                  </Button>
                );
              })}
        </div>
        <div className="mt-5 flex gap-2">
          <Link
            href="/editor"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold tracking-tight text-zinc-950 transition-colors hover:bg-white/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New character
          </Link>
          {!isLoggedIn && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoginDialogOpen(true)}
              className="h-auto flex-1 rounded-lg border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium tracking-tight text-white/85 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoCharacterOverlay;
