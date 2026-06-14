import {
  ArrowRight,
  Box,
  Camera,
  Check,
  Code2,
  ExternalLink,
  GitBranch,
  Mic,
  Paintbrush,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CAPABILITIES = [
  {
    title: "Style",
    body: "Parts, skin, hair, makeup, outfits, and colors stay live in the 3D view.",
    icon: Paintbrush,
  },
  {
    title: "Capture",
    body: "Move from editor to photo booth and save clean character thumbnails.",
    icon: Camera,
  },
  {
    title: "Voice",
    body: "Test speech and lip-sync without rebuilding the character for every scene.",
    icon: Mic,
  },
  {
    title: "Export",
    body: "Download a GLB for Three.js, Unity, Unreal Engine, or another runtime.",
    icon: Box,
  },
  {
    title: "Publish",
    body: "Share public characters when they are polished enough to discover.",
    icon: Share2,
  },
];

const FLOW = [
  {
    eyebrow: "Create",
    title: "Start from a clean rig",
    body: "Use the editor as the main workspace for body, wardrobe, makeup, and personality.",
  },
  {
    eyebrow: "Test",
    title: "Move through real scenes",
    body: "Jump into poses, voice, photo booth, and playful demos without leaving the character behind.",
  },
  {
    eyebrow: "Export",
    title: "Use the GLB in your stack",
    body: "Bring the model into Three.js, Unity, Unreal Engine, or another GLB-ready runtime.",
  },
  {
    eyebrow: "Publish",
    title: "Let people discover it",
    body: "Public characters with thumbnails get room to stand out when people visit.",
  },
];

const ENGINE_TARGETS = [
  "Three.js browser scenes",
  "Unity prototypes",
  "Unreal Engine pipelines",
  "GLB-compatible tools",
];

const OPEN_SOURCE_POINTS = [
  "Inspect the editor, renderer, asset loading, and export flow.",
  "Report issues or follow the roadmap in the public repository.",
  "Adapt the stack for your own Three.js and character tooling.",
];

export function HomeCapabilities() {
  return (
    <section className="border-y border-white/[0.07] bg-white/[0.025]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <div className="rounded-lg border border-white/10 bg-[#111116]/80 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] md:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            Character workflow
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            One character, every creative step.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
            Shape the character once, then move through the places it matters:
            styling, posing, voice, GLB export, and community discovery.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2">
            {["Live editor", "GLB export", "Public profile"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3"
              >
                <Check className="mb-3 h-4 w-4 text-amber-200" />
                <div className="text-xs font-semibold tracking-tight text-white/80">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
          {CAPABILITIES.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="grid grid-cols-[auto_1fr] gap-4 border-white/10 px-5 py-4 last:border-b-0 md:px-6 md:py-5 [&:not(:last-child)]:border-b"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-950">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="grid gap-1 md:grid-cols-[8rem_1fr] md:items-start">
                  <h3 className="text-sm font-semibold tracking-tight text-white">
                    {String(index + 1).padStart(2, "0")} · {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-white/52">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeCreationFlow() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-14 md:px-8 md:py-16">
      <div className="mb-10 grid gap-5 lg:grid-cols-[0.75fr_1fr] lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/60">
            <UsersRound className="h-3.5 w-3.5 text-amber-200" />
            Build loop
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Built around the moment a character becomes usable.
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/55 lg:justify-self-end lg:text-right">
          Discovery is part of the loop, but so is leaving the studio with a
          model you can load into real projects.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {FLOW.map((step, index) => (
          <article
            key={step.title}
            className="relative border-t border-white/12 pt-5"
          >
            <div className="-mt-[1.95rem] mb-6 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#0a0a0d] text-xs font-semibold text-white/70">
              {index + 1}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {step.eyebrow}
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/52">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeEngineExport() {
  return (
    <section className="border-y border-white/[0.07] bg-white/[0.025]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/60">
            <Box className="h-3.5 w-3.5 text-amber-200" />
            GLB export
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Build in Character Studio, then ship the model where you need it.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
            Community is one path, not the whole goal. The character can leave
            the studio as a GLB so it can become part of an app, game, demo, or
            realtime scene.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#070708]/90 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/8" />
            </div>
            <span className="text-[11px] font-medium tracking-tight text-white/42">
              character.glb
            </span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 text-xs leading-6 text-white/62">
            <code>{`const loader = new GLTFLoader();
const avatar = await loader.loadAsync("/character.glb");
scene.add(avatar.scene);`}</code>
          </pre>
          <div className="grid border-t border-white/10 md:grid-cols-2">
            {ENGINE_TARGETS.map((target) => (
              <div
                key={target}
                className="flex items-center gap-3 border-white/10 px-5 py-4 text-sm font-medium tracking-tight text-white/72 odd:border-r [&:nth-child(-n+2)]:border-b"
              >
                <Code2 className="h-4 w-4 text-amber-200" />
                {target}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeOpenSource() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/60">
          <GitBranch className="h-3.5 w-3.5 text-amber-200" />
          Open source
        </div>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Character Studio is built in the open.
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-6 text-white/55">
          The project lives on GitHub so creators and developers can study the
          implementation, file issues, and build on the same foundation.
        </p>
        <Button
          asChild
          size="lg"
          variant="ghost"
          className="mt-6 h-auto rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold tracking-tight text-white hover:bg-white/10 hover:text-white"
        >
          <a
            href="https://github.com/wass08/character-studio"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.025]">
        {OPEN_SOURCE_POINTS.map((point) => (
          <div
            key={point}
            className="flex gap-4 border-white/10 px-5 py-5 last:border-b-0 [&:not(:last-child)]:border-b"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
              <Check className="h-3.5 w-3.5 text-amber-200" />
            </div>
            <p className="text-sm leading-6 text-white/58">{point}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeFinalCta() {
  return (
    <section className="border-t border-white/[0.07] bg-white/[0.035]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8 md:py-14">
        <div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Start with one character.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            Build the look, try the character in motion, export the GLB, and
            share it when it has a thumbnail worth showing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="h-auto rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-tight text-zinc-950 hover:bg-white"
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
            className="h-auto rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold tracking-tight text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/community">Browse shared characters</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
