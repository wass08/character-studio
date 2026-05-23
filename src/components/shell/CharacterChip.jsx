"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Plus, UserRound } from "lucide-react";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

/**
 * The active-character chip in the chrome.
 *  - Click → popover with "View profile", "Edit", and a list of the user's
 *    other characters for quick switching.
 *  - The active character is whatever is currently loaded in the
 *    configurator store (see AuthBootstrapper).
 */
const CharacterChip = () => {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const currentCharacterName = useConfiguratorStore(
    (s) => s.currentCharacterName,
  );
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const charactersChangedAt = useConfiguratorStore(
    (s) => s.charactersChangedAt,
  );

  const [open, setOpen] = useState(false);
  const [thumb, setThumb] = useState(null);
  const [list, setList] = useState([]);

  // Fetch a thumb for the active character.
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

  // Lazy-load the user's other characters for the switcher.
  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let cancelled = false;
    pb.collection("CharacterStudioCharacters")
      .getList(1, 12, { sort: "-updated", skipTotal: true })
      .then((r) => !cancelled && setList(r.items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, isLoggedIn, userId, charactersChangedAt]);

  // Anonymous users can have an active character too (per plan: editing is
  // anonymous, only save requires login). Only the empty-state CTA cares
  // about login.
  if (!currentCharacterId) {
    return (
      <button
        type="button"
        onClick={() => {
          if (isLoggedIn) router.push("/create");
          else setLoginDialogOpen(true);
        }}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pr-3 pl-1 text-xs font-medium tracking-tight text-white/75 transition-colors hover:border-white/25 hover:text-white"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <UserRound className="h-3.5 w-3.5 text-white/70" />
        </span>
        <span>No character</span>
      </button>
    );
  }

  const onSwitch = async (rec) => {
    setOpen(false);
    try {
      await loadCharacter(rec);
    } catch {}
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pr-2 pl-1 text-xs font-medium tracking-tight text-white/85 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
            open && "border-white/30 bg-white/[0.08] text-white",
          )}
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
          <ChevronDown className="h-3 w-3 text-white/55" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 text-sm text-white/90 shadow-2xl backdrop-blur-xl"
        >
          <Link
            href={`/c/${currentCharacterId}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs tracking-tight text-white/80 hover:bg-white/[0.06] hover:text-white"
          >
            View profile <span className="text-white/40">→</span>
          </Link>
          <Link
            href={`/create/${currentCharacterId}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs tracking-tight text-white/80 hover:bg-white/[0.06] hover:text-white"
          >
            Edit <span className="text-white/40">→</span>
          </Link>
          <div className="my-1 border-t border-white/5" />
          <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">
            Switch
          </div>
          <div className="thin-scrollbar grid max-h-60 grid-cols-3 gap-1 overflow-y-auto p-1">
            {list
              .filter((c) => c.id !== currentCharacterId)
              .map((c) => {
                const t = c.thumbnail
                  ? pb.files.getURL(c, c.thumbnail, { thumb: "128x128" })
                  : null;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => onSwitch(c)}
                    className="group flex flex-col gap-1 rounded-lg p-1 text-left text-[10px] text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="block aspect-square overflow-hidden rounded-md bg-white/5 ring-1 ring-white/10">
                      {t ? (
                        <img
                          src={t}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            <Link
              href="/create"
              onClick={() => setOpen(false)}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/12 text-[10px] text-white/55 transition-colors hover:border-white/30 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </Link>
          </div>
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-xs tracking-tight text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            See all characters <span className="text-white/40">→</span>
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default CharacterChip;
