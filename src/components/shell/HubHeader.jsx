"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import CharacterChip from "./CharacterChip";
import AccountIdentity from "./AccountIdentity";
import { cn } from "@/lib/utils";

// Vocabulary locked in wiki/architecture/app-structure.md#vocabulary:
// home gets no nav label (the logo carries it), workspace is "Studio".
const NAV = [{ href: "/studio", label: "Studio" }];

/**
 * Persistent top chrome for hub-style pages and experiences.
 * Variant controls density:
 *   - "hub" (default): translucent overlay over scrolling content
 *   - "fixed": opaque pinned bar that sits over a fullscreen canvas
 */
const HubHeader = ({ variant = "hub", className }) => {
  const pathname = usePathname();
  const fixed = variant === "fixed";
  return (
    <header
      className={cn(
        "z-40 flex items-center gap-4 px-5 py-3 md:px-8",
        fixed
          ? "absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent"
          : "sticky top-0 backdrop-blur-md bg-black/30 border-b border-white/5",
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
          alt="Wawasensei"
          className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:h-9"
        />
        <span className="hidden text-xs font-medium tracking-[0.18em] text-white/65 uppercase md:inline">
          Studio
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 ml-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
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
                  className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15"
                />
              )}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/editor"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold tracking-tight text-zinc-900 shadow-[0_0_22px_rgba(255,255,255,0.15)] ring-1 ring-white/40 transition-colors hover:bg-white"
        >
          + New character
        </Link>
        <CharacterChip />
        <AccountIdentity />
      </div>
    </header>
  );
};

export default HubHeader;
