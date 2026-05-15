"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import AuthDialog from "@/components/ui/AuthDialog/AuthDialog";

const AdminShell = ({ title, subtitle, actions, children }) => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isLoggedIn) setLoginDialogOpen(true);
  }, [isLoggedIn, setLoginDialogOpen]);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <AuthDialog />
        <div className="flex h-screen items-center justify-center">
          <p className="text-sm text-white/60">Sign in to continue.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24">
          <h1 className="text-xl font-semibold">Admin only</h1>
          <p className="text-sm text-white/55">
            Your account doesn't have admin access.
          </p>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Back to studio
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-white/55">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Link
              href="/admin"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/10"
            >
              Assets
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/10"
            >
              ← Studio
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
};

export default AdminShell;
