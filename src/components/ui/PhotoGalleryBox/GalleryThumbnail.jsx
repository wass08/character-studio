"use client";

import { motion } from "motion/react";
import { Link2, Trash2 } from "lucide-react";
import { pb } from "@/stores/useConfiguratorStore";
import { Button } from "@/components/ui/button";
import { Tooltip } from "../primitives/Tooltip";
import { toast } from "../primitives/Toast";

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Safari requires user gesture + focused page; fall through.
    }
  }
  if (typeof window !== "undefined") {
    window.prompt("Copy this link", text);
    return true;
  }
  return false;
};

const GalleryThumbnail = ({ photo, onDelete }) => {
  const url = pb.files.getURL(photo, photo.image, { thumb: "256x256" });
  const fullUrl = pb.files.getURL(photo, photo.image);

  const onCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(fullUrl);
    if (ok) toast.success("Link copied");
  };

  return (
    <motion.a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.04 }}
      className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30"
    >
      <img src={url} alt="" className="h-full w-full object-cover" />
      <Tooltip label="Copy link" side="top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCopy}
          aria-label="Copy link"
          className="absolute top-1 left-1 h-6 w-6 rounded-md bg-black/55 text-white/80 opacity-100 transition-all hover:bg-white/25 hover:text-white md:opacity-0 md:group-hover:opacity-100"
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Delete" side="top">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(photo);
          }}
          aria-label="Delete photo"
          className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/55 text-white/80 opacity-100 transition-all hover:bg-rose-500/70 hover:text-white md:opacity-0 md:group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
    </motion.a>
  );
};

export default GalleryThumbnail;
