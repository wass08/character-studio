"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AccountIdentity from "./AccountIdentity";
import CharacterChip from "./CharacterChip";

const NAV = [
  { href: "/community", label: "Community" },
  { href: "/studio", label: "My Characters" },
];

/**
 * Persistent top chrome for hub-style pages and experiences.
 * Variant controls density:
 *   - "hub" (default): sticky bar over scrolling content
 *   - "fixed": pinned bar over a fullscreen canvas
 */
// The chip is a "current character" indicator, so it only makes sense on
// routes that actually have a character in scope: the editor and any
// /c/[id]/* page. Hub pages already surface the roster via /studio.
const isCharacterRoute = (pathname) =>
  !!pathname && (pathname.startsWith("/c/") || pathname.startsWith("/editor"));

const isActiveNavItem = (item, pathname) => {
  return item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
};

const HubHeader = ({ variant = "hub", className }) => {
  const pathname = usePathname();
  const fixed = variant === "fixed";
  const showChip = isCharacterRoute(pathname);
  return (
    <header
      className={cn(
        "app-topbar z-40 flex min-h-15 items-center gap-4 px-5 py-3 md:px-8",
        fixed ? "absolute inset-x-0 top-0" : "sticky top-0",
        className,
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2 shrink-0 select-none"
        aria-label="Character Studio home"
      >
        <img
          src="/images/logo-white.svg"
          alt="Character Studio"
          className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:h-9"
        />
      </Link>

      <nav className="hidden md:flex items-center gap-1 ml-3">
        {NAV.map((item) => {
          const active = isActiveNavItem(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3 py-1.5 text-sm tracking-tight transition-colors",
                active ? "text-white" : "text-white/55 hover:text-white/85",
              )}
            >
              {active && (
                <motion.span
                  layoutId="hub-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/15"
                />
              )}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {showChip && <CharacterChip />}
        <Button
          asChild
          size="sm"
          className="hidden h-8 rounded-lg bg-white px-3 text-xs font-semibold tracking-tight text-zinc-950 hover:bg-white sm:inline-flex"
        >
          <Link href="/editor">
            <Plus className="h-3.5 w-3.5" />
            Create
          </Link>
        </Button>
        <AccountIdentity />
      </div>
    </header>
  );
};

export default HubHeader;
