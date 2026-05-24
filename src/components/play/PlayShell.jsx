"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CharacterChip from "@/components/shell/CharacterChip";
import AccountIdentity from "@/components/shell/AccountIdentity";

/**
 * Pinned chrome for /play/* — minimal, sits over a fullscreen 3D canvas.
 * Keeps the character chip visible so users always see who's "on stage."
 */
const PlayShell = ({ title, children, sidebar }) => (
  <main className="fixed inset-0 flex h-screen w-full flex-col bg-black text-white">
    <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-5 py-3 md:px-8">
      {/* Back to workspace. Wired to /me until the route rename in
          phase 4 of the nav-and-positioning plan. */}
      <Link
        href="/me"
        className="inline-flex h-9 items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 text-xs font-medium tracking-tight text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Studio
      </Link>
      {title && (
        <span className="hidden text-xs font-semibold tracking-[0.18em] text-white/65 uppercase md:inline">
          {title}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <CharacterChip />
        <AccountIdentity />
      </div>
    </header>
    <div className="relative flex-1">{children}</div>
    {sidebar}
  </main>
);

export default PlayShell;
