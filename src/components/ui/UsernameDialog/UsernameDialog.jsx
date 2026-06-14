"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isGeneratedUsername } from "@/lib/userDisplay";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../primitives/Dialog";
import { Spinner } from "../primitives/Spinner";
import { toast } from "../primitives/Toast";

const USERNAME_RX = /^[a-z0-9_]{3,28}$/;

const usernameError = (value) => {
  if (!value) return "Choose a username.";
  if (!USERNAME_RX.test(value)) {
    return "Use 3-28 lowercase letters, numbers, or underscores.";
  }
  if (isGeneratedUsername(value)) {
    return "Choose a more personal username.";
  }
  return "";
};

const apiMessage = (error) =>
  error?.response?.data?.username?.message ||
  error?.response?.message ||
  error?.message ||
  "Could not save username";

const UsernameDialog = () => {
  const open = useAuthStore((s) => s.usernameDialogOpen);
  const required = useAuthStore((s) => s.usernameDialogRequired);
  const user = useAuthStore((s) => s.user);
  const pending = useAuthStore((s) => s.usernameUpdatePending);
  const completeUsernameSetup = useAuthStore((s) => s.completeUsernameSetup);
  const closeUsernameDialog = useAuthStore((s) => s.closeUsernameDialog);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const currentUsername =
      user?.username && !isGeneratedUsername(user.username)
        ? user.username
        : "";
    setUsername(currentUsername);
    setError("");
  }, [open, user?.username]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextUsername = username.trim().toLowerCase();
    const nextError = usernameError(nextUsername);
    if (nextError) {
      setError(nextError);
      return;
    }

    try {
      await completeUsernameSetup(nextUsername);
      setUsername("");
      setError("");
      toast.success("Username saved");
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeUsernameDialog();
      }}
    >
      <DialogContent
        showCloseButton={!required}
        onEscapeKeyDown={(event) => {
          if (required) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (required) event.preventDefault();
        }}
      >
        <DialogTitle>
          {required ? "Choose a username" : "Update username"}
        </DialogTitle>
        <DialogDescription>
          This is shown with your public characters.
        </DialogDescription>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-medium tracking-tight text-white/70">
            Username
            <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus-within:border-white/35">
              <span className="text-white/35">@</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  const value = event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "");
                  setUsername(value.slice(0, 28));
                  if (error) setError("");
                }}
                autoFocus
                className="min-w-0 flex-1 bg-transparent px-1.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                placeholder="creator_name"
              />
            </div>
          </label>

          {error && <p className="text-xs text-red-300">{error}</p>}

          <Button
            type="submit"
            variant="default"
            disabled={pending}
            className="h-auto gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium tracking-tight text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
          >
            {pending && <Spinner />}
            <span>{required ? "Save username" : "Update username"}</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameDialog;
