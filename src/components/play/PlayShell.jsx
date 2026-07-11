"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import AccountIdentity from "@/components/shell/AccountIdentity";
import CharacterChip from "@/components/shell/CharacterChip";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Pinned chrome for the per-character experiment routes
 * (/c/[id]/try/[experiment]). Sits over a fullscreen 3D canvas and
 * keeps the character chip visible so users always see who's "on stage."
 *
 * Back-link routes to the active character's profile page when one is
 * loaded; falls back to /studio (My Characters) otherwise. The label is
 * the character's name when present, "My Characters" otherwise.
 */
const PlayShell = ({ title, children, sidebar, actions }) => {
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const currentCharacterName = useConfiguratorStore(
    (s) => s.currentCharacterName,
  );
  const backHref = currentCharacterId ? `/c/${currentCharacterId}` : "/studio";
  const backLabel = currentCharacterId
    ? currentCharacterName || "Character"
    : "My Characters";

  return (
    <main className="fixed inset-0 flex h-screen w-full flex-col bg-black text-white">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-5 py-3 md:px-8">
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 text-xs font-medium tracking-tight text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">{backLabel}</span>
        </Link>
        {title && (
          <span className="hidden text-xs font-semibold tracking-[0.18em] text-white/65 uppercase [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] md:inline">
            {title}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <CharacterChip />
          <AccountIdentity />
        </div>
      </header>
      <div className="relative flex-1">{children}</div>
      {sidebar}
    </main>
  );
};

export default PlayShell;
