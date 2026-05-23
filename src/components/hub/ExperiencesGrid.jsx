"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Camera, MessagesSquare, Gamepad2 } from "lucide-react";

const EXPERIENCES = [
  {
    href: "/play/playground",
    title: "Playground",
    blurb: "Pose, dance, capture stills.",
    icon: Camera,
    gradient:
      "radial-gradient(700px 400px at 20% 0%, rgba(255,200,150,0.35), transparent 60%), linear-gradient(160deg,#1a1422,#0d0a13)",
  },
  {
    href: "/play/lipsync",
    title: "Lipsync",
    blurb: "Say something, watch them speak.",
    icon: MessagesSquare,
    gradient:
      "radial-gradient(700px 400px at 80% 0%, rgba(180,160,255,0.35), transparent 60%), linear-gradient(160deg,#15192a,#0a0c15)",
  },
  {
    href: "/play/platformer",
    title: "Platformer",
    blurb: "Walk, run, jump. Feel them move.",
    icon: Gamepad2,
    gradient:
      "radial-gradient(700px 400px at 50% 100%, rgba(140,255,200,0.30), transparent 60%), linear-gradient(160deg,#0e1a18,#080d10)",
  },
];

const ExperiencesGrid = () => (
  <section className="mx-auto w-full max-w-7xl px-5 pb-12 md:px-8">
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-white">
        Experiences
      </h2>
      <span className="text-xs text-white/45">try your character</span>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {EXPERIENCES.map((e) => {
        const Icon = e.icon;
        return (
          <motion.div
            key={e.href}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative overflow-hidden rounded-2xl ring-1 ring-white/10"
            style={{ background: e.gradient }}
          >
            <Link
              href={e.href}
              className="flex h-44 flex-col justify-between p-5"
            >
              <Icon className="h-7 w-7 text-white/85" />
              <div>
                <div className="text-base font-semibold tracking-tight text-white">
                  {e.title}
                </div>
                <div className="text-xs text-white/65">{e.blurb}</div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  </section>
);

export default ExperiencesGrid;
