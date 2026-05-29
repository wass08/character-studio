"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { pb } from "@/stores/useConfiguratorStore";
import { cn } from "@/lib/utils";

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
        thumb: size === "featured" ? "512x512" : "256x256",
      })
    : null;
  const author = character.expand?.user?.name;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 transition-shadow hover:ring-white/25",
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
      <div
        className="absolute inset-0"
        style={{
          background: thumb
            ? "linear-gradient(180deg,#1c1c24,#0c0c12)"
            : undefined,
        }}
      />
      {thumb && (
        <motion.img
          src={thumb}
          alt={character.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          animate={{ scale: [1, 1.02, 1], y: [0, -1.5, 0] }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: Math.random() * 1.5,
          }}
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
