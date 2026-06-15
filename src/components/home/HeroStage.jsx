"use client";

import { ArrowRight, Compass, Sparkles, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import IdleJuice from "@/components/scene/IdleJuice";
import { Button } from "@/components/ui/button";

// Client-only: the hero's three.js/WebGPU wall streams in as its own
// chunk after the copy + CTA have painted.
const HeroCharacterWall = dynamic(() => import("./HeroCharacterWall"), {
  ssr: false,
});

const HERO_SIGNALS = [
  { value: "GLB", label: "Three.js, Unity, Unreal" },
  { value: "3D", label: "Editor, poses, voice" },
  { value: "Open", label: "Source on GitHub" },
];

/**
 * The homepage hero: random public characters on the right, marketing copy +
 * CTA on the left. The wall fetches a fresh random set on each mount instead
 * of binding the homepage to the viewer's active editor character.
 */
const HeroStage = () => {
  return (
    <section className="relative isolate min-h-[calc(100svh-3.75rem)] overflow-hidden border-b border-white/[0.07] bg-[#08080b]">
      <IdleJuice />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,#08080b_0%,#141119_44%,#1d1913_66%,#09090c_100%)]"
      />
      <div className="absolute inset-0">
        <HeroCharacterWall />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,11,0.97)_0%,rgba(8,8,11,0.84)_29%,rgba(8,8,11,0.44)_54%,rgba(8,8,11,0.06)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(0deg,#08080b_0%,rgba(8,8,11,0.8)_38%,rgba(8,8,11,0)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(8,8,11,0.72)_0%,rgba(8,8,11,0)_100%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.75rem)] w-full max-w-7xl items-center px-5 py-12 md:px-8 md:py-16">
        <div className="flex max-w-2xl flex-col items-start gap-6 py-4 lg:py-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium tracking-tight text-white/75 backdrop-blur-md"
          >
            <UsersRound className="h-3.5 w-3.5 text-amber-200" />
            Open 3D character studio
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-balance text-5xl font-semibold tracking-tight text-white/95 [text-shadow:0_12px_38px_rgba(0,0,0,0.62)] sm:text-6xl lg:text-7xl"
          >
            Make yours.
            <br />
            Export anywhere.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="max-w-xl text-base leading-7 text-white/65 md:text-lg md:leading-8"
          >
            Design a character that feels like yours, tune the look in 3D, test
            poses and voice, then export a GLB for Three.js, Unity, or Unreal
            Engine. Share it with the community when it is ready.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            <Button
              asChild
              size="lg"
              className="h-auto gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-tight text-zinc-950 shadow-[0_0_32px_rgba(255,255,255,0.18)] transition-transform hover:scale-[1.02] hover:bg-white"
            >
              <Link href="/editor">
                Create your character
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-auto gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold tracking-tight text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/community">
                Explore community
                <Compass className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.16 }}
            className="hidden w-full max-w-xl grid-cols-3 gap-2 pt-2 sm:grid"
          >
            {HERO_SIGNALS.map((signal) => (
              <div
                key={signal.label}
                className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 backdrop-blur"
              >
                <div className="text-sm font-semibold tracking-tight text-white">
                  {signal.value}
                </div>
                <div className="mt-1 text-[11px] leading-4 text-white/45">
                  {signal.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="absolute right-5 bottom-6 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-medium tracking-tight text-white/65 backdrop-blur-md md:flex">
        <Sparkles className="h-3.5 w-3.5 text-amber-200" />
        New lineup every visit
      </div>
    </section>
  );
};

export default HeroStage;
