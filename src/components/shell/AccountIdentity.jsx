"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

/**
 * Account-side identity in the chrome.
 *
 * Per plan, the chrome shows only the user's name (no account avatar — the
 * character chip is the only avatar surface). Click opens a tiny menu with
 * sign-in/out and admin link.
 */
const AccountIdentity = () => {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const user = useAuthStore((s) => s.user);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const logout = useAuthStore((s) => s.logout);

  if (!isLoggedIn) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setLoginDialogOpen(true)}
        className="h-9 gap-1.5 rounded-full px-3 text-xs font-medium tracking-tight text-white/75 hover:bg-transparent hover:text-white"
      >
        Sign in
      </Button>
    );
  }

  const display = user?.name || user?.email?.split("@")[0] || "You";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-9 gap-2 rounded-full px-3 text-xs font-medium tracking-tight text-white/85 transition-colors hover:bg-white/[0.05] hover:text-white",
          )}
        >
          <span className="max-w-[120px] truncate">{display}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 text-sm text-white/90 shadow-2xl backdrop-blur-xl"
        >
          <DropdownMenu.Item
            onSelect={() => router.push("/me")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
          >
            <User className="h-3.5 w-3.5 text-white/55" />
            My characters
          </DropdownMenu.Item>
          {isAdmin && (
            <DropdownMenu.Item
              onSelect={() => router.push("/admin")}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
            >
              <Settings className="h-3.5 w-3.5 text-white/55" />
              Admin
            </DropdownMenu.Item>
          )}
          <div className="my-1 border-t border-white/5" />
          <DropdownMenu.Item
            onSelect={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/75 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
          >
            <LogOut className="h-3.5 w-3.5 text-white/55" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default AccountIdentity;
