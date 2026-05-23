"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

const HubHero = () => (
  <section className="relative isolate mx-auto w-full max-w-7xl px-5 pt-8 pb-12 md:px-8 md:pt-12 md:pb-16">
    <div className="flex flex-col items-start gap-5">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/75"
      >
        <Sparkles className="h-3 w-3 text-amber-200" />
        Studio · build, play, share
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-4xl font-semibold tracking-tight text-white md:text-6xl"
      >
        Bring a character to life.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.05 }}
        className="max-w-xl text-base text-white/65 md:text-lg"
      >
        Pose them, make them speak, take them for a walk. Then drop them into
        whatever you build next.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold tracking-tight text-zinc-950 shadow-[0_0_32px_rgba(255,255,255,0.18)] transition-transform hover:scale-[1.02]"
        >
          Create a character
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/play/playground"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium tracking-tight text-white/85 transition-colors hover:border-white/35 hover:text-white"
        >
          Try the playground
        </Link>
      </motion.div>
    </div>
  </section>
);

export default HubHero;
