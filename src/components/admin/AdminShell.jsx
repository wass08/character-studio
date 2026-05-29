"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import AuthDialog from "@/components/ui/AuthDialog/AuthDialog";
import { Button } from "@/components/ui/button";

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
      <main className="dark h-screen overflow-y-auto bg-background text-foreground">
        <AuthDialog />
        <div className="flex h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Sign in to continue.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="dark h-screen overflow-y-auto bg-background text-foreground">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24">
          <h1 className="text-xl font-semibold">Admin only</h1>
          <p className="text-sm text-muted-foreground">
            Your account doesn't have admin access.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/">Back to studio</Link>
            </Button>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dark h-screen overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Assets</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/characters">Characters</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/voices">Voices</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">← Studio</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
};

export default AdminShell;
