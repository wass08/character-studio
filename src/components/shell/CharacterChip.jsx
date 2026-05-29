"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Passive "current character" label in the chrome. Click → /studio (the
 * roster) where switching, creating, and managing actually live. Only
 * rendered on routes that have a character in scope (see HubHeader).
 */
const CharacterChip = () => {
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const currentCharacterName = useConfiguratorStore(
    (s) => s.currentCharacterName,
  );
  const charactersChangedAt = useConfiguratorStore(
    (s) => s.charactersChangedAt,
  );

  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!currentCharacterId) {
      setThumb(null);
      return;
    }
    pb.collection("CharacterStudioCharacters")
      .getOne(currentCharacterId, { requestKey: null })
      .then((rec) => {
        if (cancelled) return;
        setThumb(
          rec.thumbnail
            ? pb.files.getURL(rec, rec.thumbnail, { thumb: "96x96" })
            : null,
        );
      })
      .catch(() => !cancelled && setThumb(null));
    return () => {
      cancelled = true;
    };
  }, [currentCharacterId, charactersChangedAt]);

  return (
    <Link
      href="/studio"
      aria-label="Open My Characters"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-0 pr-3 pl-1 text-xs font-medium tracking-tight text-white/85 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
    >
      <span className="inline-flex h-7 w-7 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
        {thumb ? (
          <img
            src={thumb}
            alt={currentCharacterName || ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="m-auto h-3.5 w-3.5 text-white/70" />
        )}
      </span>
      <span className="max-w-[120px] truncate">
        {currentCharacterName || "Untitled"}
      </span>
    </Link>
  );
};

export default CharacterChip;
