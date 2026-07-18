"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import { pb } from "@/stores/useConfiguratorStore";

/**
 * Card used by the living wall and the featured row.
 *
 * size variants:
 *   - "wall"     compact tile for the infinite-scroll wall
 *   - "featured" bigger card for the featured row
 *   - "owned"    used on /me
 */
const CharacterCard = ({ character, size = "wall", overlay }) => {
  const thumb = character.thumbnail
    ? pb.files.getURL(character, character.thumbnail, {
        thumb:
          size === "featured"
            ? "512x512"
            : size === "owned"
              ? "320x320"
              : "256x256",
      })
    : null;
  const author = getUserDisplayName(character.expand?.user, "");

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "card-glow-border group relative isolate overflow-hidden rounded-lg ring-1 ring-white/10 transition-shadow hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)] hover:ring-white/20",
        size === "wall" && "aspect-square",
        size === "featured" && "aspect-[3/4]",
        size === "owned" && "aspect-square",
      )}
    >
      <Link
        href={`/c/${character.id}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${character.name}`}
      />
      {/* Radial glow behind the portrait so the tile has depth instead of a
          flat slab; a faint warm accent hugs the top edge. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_-10%,#2b2636_0%,#171420_48%,#0b0a10_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(80%_45%_at_50%_0%,rgba(255,208,160,0.10),transparent_70%)]"
      />
      {thumb && (
        <img
          src={thumb}
          alt={character.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          loading="lazy"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-2.5">
        <div className="truncate text-sm font-medium tracking-tight text-white">
          {character.name}
        </div>
        {author && (
          <div className="truncate text-[10px] text-white/55">by {author}</div>
        )}
      </div>
      {overlay}
    </motion.div>
  );
};

export default CharacterCard;
