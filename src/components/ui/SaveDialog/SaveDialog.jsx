"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../primitives/Dialog";
import { Spinner } from "../primitives/Spinner";

const SaveDialog = ({ open, onOpenChange, onSubmit, defaultName = "" }) => {
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setName("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Name your character</DialogTitle>
        <DialogDescription>
          Pick a name for this character — you can rename it later.
        </DialogDescription>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            maxLength={80}
            placeholder="e.g. Maya the Explorer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium tracking-tight text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
          >
            {submitting && <Spinner />}
            <span>Save character</span>
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveDialog;
