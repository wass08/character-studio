"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { getUserDisplayName } from "@/lib/userDisplay";
import { useAuthStore } from "@/stores/useAuthStore";
import { Tooltip } from "../primitives/Tooltip";

const MotionButton = motion.button;

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
    />
  </svg>
);

const initial = (user) => {
  const src = getUserDisplayName(user, "You");
  return src.trim().charAt(0).toUpperCase();
};

const UserMenu = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const logout = useAuthStore((s) => s.logout);

  if (!isLoggedIn) {
    return (
      <Tooltip label="Sign in" side="bottom">
        <Button
          asChild
          variant="ghost"
          className="glass-panel inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white/85 transition-colors hover:text-white"
        >
          <MotionButton
            type="button"
            onClick={() => setLoginDialogOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Sign in"
          >
            <UserIcon />
            <span className="text-xs tracking-tight">Sign in</span>
          </MotionButton>
        </Button>
      </Tooltip>
    );
  }

  return (
    <div className="glass-panel inline-flex h-10 items-center gap-1 rounded-xl px-1 pl-1">
      <Tooltip label={user?.email || "Account"} side="bottom">
        <div className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-medium tracking-tight text-white/90">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] ring-1 ring-white/20">
            {initial(user)}
          </span>
          <span className="max-w-[110px] truncate">
            {getUserDisplayName(user, "You")}
          </span>
        </div>
      </Tooltip>
      <Tooltip label="Sign out" side="bottom">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MotionButton
            type="button"
            onClick={logout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Sign out"
          >
            <LogoutIcon />
          </MotionButton>
        </Button>
      </Tooltip>
    </div>
  );
};

export default UserMenu;
