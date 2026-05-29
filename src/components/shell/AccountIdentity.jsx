"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-9 gap-2 rounded-full px-3 text-xs font-medium tracking-tight text-white/85 transition-colors hover:bg-white/[0.05] hover:text-white",
          )}
        >
          <span className="max-w-[120px] truncate">{display}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-48 overflow-hidden rounded-xl border-white/10 bg-zinc-950/95 p-1 text-sm text-white/90 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuItem
          onSelect={() => router.push("/studio")}
          className="cursor-pointer rounded-lg px-3 py-2 text-xs focus:bg-white/[0.06] focus:text-white"
        >
          <User className="h-3.5 w-3.5 text-white/55" />
          My characters
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onSelect={() => router.push("/admin")}
            className="cursor-pointer rounded-lg px-3 py-2 text-xs focus:bg-white/[0.06] focus:text-white"
          >
            <Settings className="h-3.5 w-3.5 text-white/55" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1 bg-white/5" />
        <DropdownMenuItem
          onSelect={logout}
          className="cursor-pointer rounded-lg px-3 py-2 text-xs text-white/75 focus:bg-white/[0.06] focus:text-white"
        >
          <LogOut className="h-3.5 w-3.5 text-white/55" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountIdentity;
