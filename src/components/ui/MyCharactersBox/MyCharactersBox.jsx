"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  UI_MODES,
  pb,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "../primitives/Toast";
import { Tooltip } from "../primitives/Tooltip";
import { cn } from "../primitives/cn";

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-6 w-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-3.5 w-3.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79"
    />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-3.5 w-3.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
    />
  </svg>
);

const MyCharactersBox = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const setMode = useConfiguratorStore((s) => s.setMode);
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );
  const setMainCharacter = useConfiguratorStore((s) => s.setMainCharacter);
  const currentCharacterId = useConfiguratorStore(
    (s) => s.currentCharacterId,
  );
  const charactersChangedAt = useConfiguratorStore(
    (s) => s.charactersChangedAt,
  );

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const mainId = user?.mainCharacter || null;

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoading(true);
    pb.collection("CharacterStudioCharacters")
      .getFullList({ sort: "-updated" })
      .then((list) => {
        if (!cancelled) setCharacters(list);
      })
      .catch((err) => {
        if (!cancelled && !err?.isAbort)
          toast.error(err?.message || "Failed to load characters");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, charactersChangedAt]);

  const onPick = async (character) => {
    try {
      await loadCharacter(character);
      setMode(UI_MODES.CUSTOMIZE);
      toast.success(`Loaded "${character.name}"`);
    } catch (err) {
      toast.error(err?.message || "Failed to load character");
    }
  };

  const onNew = () => {
    setCurrentCharacter({ id: null, name: null });
    setMode(UI_MODES.CUSTOMIZE);
  };

  const onDelete = async (character, e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${character.name}"?`)) return;
    try {
      await pb
        .collection("CharacterStudioCharacters")
        .delete(character.id);
      setCharacters((list) => list.filter((c) => c.id !== character.id));
      if (currentCharacterId === character.id) {
        setCurrentCharacter({ id: null, name: null });
      }
      toast.success("Character deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const onToggleMain = async (character, e) => {
    e.stopPropagation();
    try {
      const next = mainId === character.id ? null : character.id;
      await setMainCharacter(next);
      toast.success(
        next ? `"${character.name}" is now your main character` : "Cleared main",
      );
    } catch (err) {
      toast.error(err?.message || "Failed to set main");
    }
  };

  return (
    <div
      className={cn(
        "glass-panel thin-scrollbar absolute top-1/2 left-4 z-30 flex w-[clamp(260px,30vw,360px)] max-h-[calc(100vh-120px)] -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-2xl p-4",
        "max-md:fixed max-md:inset-x-2 max-md:left-2 max-md:top-auto max-md:bottom-2 max-md:w-auto max-md:max-h-[55vh] max-md:translate-y-0",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
          My Characters
        </h3>
        <span className="text-[10px] text-white/40">
          {characters.length}
        </span>
      </div>

      {loading && characters.length === 0 ? (
        <div className="py-8 text-center text-xs text-white/45">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            onClick={onNew}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-2 text-white/55 transition-colors hover:border-white/35 hover:bg-white/[0.05] hover:text-white"
          >
            <PlusIcon />
            <span className="text-[11px] font-medium">New</span>
          </motion.button>

          {characters.map((c) => {
            const thumb = c.thumbnail
              ? pb.files.getURL(c, c.thumbnail, { thumb: "256x256" })
              : null;
            const active = currentCharacterId === c.id;
            const isMain = mainId === c.id;
            return (
              <motion.div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onPick(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick(c);
                  }
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-lg border bg-white/[0.04] text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  active
                    ? "border-white/70 ring-1 ring-white/55"
                    : "border-white/10 hover:border-white/30",
                )}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35">
                    No preview
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pt-5 pb-1.5">
                  <div className="truncate text-[11px] font-medium text-white">
                    {c.name}
                  </div>
                  <div className="text-[9px] text-white/55">{c.gender}</div>
                </div>
                <Tooltip
                  label={isMain ? "Unset main" : "Set as main"}
                  side="top"
                >
                  <button
                    type="button"
                    onClick={(e) => onToggleMain(c, e)}
                    className={cn(
                      "absolute top-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition-all",
                      isMain
                        ? "bg-amber-400/85 text-amber-950"
                        : "bg-black/45 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-amber-400/70 hover:text-amber-950",
                    )}
                  >
                    <StarIcon filled={isMain} />
                  </button>
                </Tooltip>
                <Tooltip label="Delete" side="top">
                  <button
                    type="button"
                    onClick={(e) => onDelete(c, e)}
                    className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/45 text-white/70 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-500/70 hover:text-white"
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCharactersBox;
