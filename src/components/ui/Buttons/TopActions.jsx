"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Tooltip } from "../primitives/Tooltip";
import SaveDialog from "../SaveDialog/SaveDialog";
import { toast } from "../primitives/Toast";

const MotionButton = motion.button;

const SaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M17.586 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6.414a2 2 0 0 0-.586-1.414l-2.414-2.414A2 2 0 0 0 17.586 3ZM7.5 5h7v3a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1V5Zm10 14h-11v-5.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V19Z" />
  </svg>
);

const Spinner = () => (
  <svg
    className="h-5 w-5 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2.5"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const TopActions = () => {
  const saveCharacter = useConfiguratorStore((state) => state.saveCharacter);
  const saving = useConfiguratorStore((state) => state.saving);
  const isDirty = useConfiguratorStore((state) => state.isDirty);
  const currentCharacterId = useConfiguratorStore(
    (state) => state.currentCharacterId,
  );
  const currentCharacterName = useConfiguratorStore(
    (state) => state.currentCharacterName,
  );

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  const onSave = async () => {
    if (!isLoggedIn) {
      setLoginDialogOpen(true);
      return;
    }
    if (!currentCharacterId) {
      setNameDialogOpen(true);
      return;
    }
    try {
      await saveCharacter();
      toast.success(`Saved "${currentCharacterName}"`);
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const onNameSubmit = async (name) => {
    try {
      await saveCharacter({ name });
      setNameDialogOpen(false);
      toast.success(`Saved "${name}"`);
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    }
  };

  // Disabled when signed in, viewing an existing character, and nothing
  // changed since load/save. New (unsaved) characters and signed-out users
  // can always click — the button routes them through the right flow.
  const clean = isLoggedIn && currentCharacterId && !isDirty;
  const disabled = saving || clean;
  const tooltipLabel = clean
    ? "No changes to save"
    : currentCharacterId
      ? `Update "${currentCharacterName}"`
      : "Save character";

  return (
    <>
      <Tooltip label={tooltipLabel} side="bottom">
        <Button
          asChild
          variant="default"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/90 px-4 text-sm font-medium tracking-tight text-zinc-900 shadow-[0_0_22px_rgba(255,255,255,0.18)] ring-1 ring-white/40 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <MotionButton
            type="button"
            onClick={onSave}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.04 }}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            aria-label="Save character"
          >
            {saving ? <Spinner /> : <SaveIcon />}
            <span>Save</span>
          </MotionButton>
        </Button>
      </Tooltip>

      <SaveDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onSubmit={onNameSubmit}
      />
    </>
  );
};

export default TopActions;
