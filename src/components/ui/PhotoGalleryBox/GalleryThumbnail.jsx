"use client";

import { Download, Link2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pb } from "@/stores/useConfiguratorStore";
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

const downloadFromUrl = async (url, filename) => {
  // Fetch the bytes so the browser saves them instead of navigating
  // (a plain <a download> ignores the attribute for cross-origin URLs).
  const blob = await fetch(url).then((r) => r.blob());
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const GalleryThumbnail = ({ photo, onDelete }) => {
  const thumbUrl = pb.files.getURL(photo, photo.image, { thumb: "256x256" });
  const fullUrl = pb.files.getURL(photo, photo.image);
  const [open, setOpen] = useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboard(fullUrl);
    if (ok) toast.success("Link copied");
  };

  const onDownload = async () => {
    try {
      await downloadFromUrl(fullUrl, photo.image || `photo_${photo.id}.png`);
    } catch (err) {
      toast.error(err?.message || "Failed to download");
    }
  };

  const onConfirmDelete = () => {
    setOpen(false);
    onDelete(photo);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Open photo"
        >
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        </motion.button>
      </DialogTrigger>
      <DialogContent
        // Cap total dialog height to the viewport so the centered
        // transform never pushes the top edge above the fold; the
        // image's own max-h-[60vh] leaves room for the metadata row
        // below.
        className="flex max-h-[90vh] max-w-3xl flex-col gap-3 border-white/10 bg-zinc-950/95 p-4 text-white sm:p-5"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Photo</DialogTitle>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-black/40">
          <img
            src={fullUrl}
            alt=""
            className="max-h-[60vh] w-auto max-w-full object-contain"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
          <div className="flex flex-wrap items-center gap-2">
            {photo.expand?.character?.name &&
              (() => {
                const char = photo.expand.character;
                const avatarUrl = char.thumbnail
                  ? pb.files.getURL(char, char.thumbnail, { thumb: "48x48" })
                  : null;
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pr-2.5 pl-0.5 text-[10px] font-semibold tracking-tight text-white/85 ring-1 ring-white/15">
                    <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    {char.name}
                  </span>
                );
              })()}
            <span className="truncate">
              {new Date(photo.created).toLocaleString()}
              {photo.pose ? ` · ${photo.pose}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 gap-1.5 rounded-md text-xs text-white/75 hover:bg-white/10 hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onConfirmDelete}
              className="h-8 gap-1.5 rounded-md text-xs text-rose-300/85 hover:bg-rose-500/15 hover:text-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onDownload}
              className="h-8 gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-zinc-950 hover:bg-white/90"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryThumbnail;
