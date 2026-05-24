"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  GitFork,
  Loader2,
  MessagesSquare,
  Pencil,
  Share2,
} from "lucide-react";
import Scene from "@/components/scene/Scene";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import HubHeader from "@/components/shell/HubHeader";
import { Button } from "@/components/ui/button";
import {
  pb,
  useConfiguratorStore,
  UI_MODES,
} from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";

const TRY_LINKS = [
  { href: "/play/playground", label: "Playground", icon: Camera },
  { href: "/play/lipsync", label: "Lipsync", icon: MessagesSquare },
  { href: "/play/platformer", label: "Platformer", icon: ArrowRight },
];

const CharacterPageView = ({ id }) => {
  const router = useRouter();
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const setMode = useConfiguratorStore((s) => s.setMode);
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );
  const introFinished = useConfiguratorStore((s) => s.introFinished);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const [record, setRecord] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMode(UI_MODES.CUSTOMIZE);
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    setRecord(null);
    setMissing(false);
    (async () => {
      try {
        const rec = await pb
          .collection("CharacterStudioCharacters")
          .getOne(id, { expand: "user", requestKey: null });
        if (cancelled) return;
        setRecord(rec);
        try {
          await loadCharacter(rec);
        } catch (loadErr) {
          // Bad customization data shouldn't blank the page — log and keep
          // the metadata visible.
          console.warn("loadCharacter failed", loadErr);
        }
      } catch (e) {
        if (e?.isAbort) return;
        if (!cancelled) {
          console.warn("character fetch failed", e?.status, e?.message);
          setMissing(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadCharacter]);

  const isOwner = record && userId && record.user === userId;
  const author = record?.expand?.user?.name || "Anonymous";

  const onFork = () => {
    if (!isLoggedIn) {
      setLoginDialogOpen(true);
      return;
    }
    // Drop the id so a Save will create a new record under the new owner,
    // keeping the customization/morphs/height already loaded into the store.
    setCurrentCharacter({
      id: null,
      name: `${record?.name || "Untitled"} — fork`,
    });
    router.push("/create");
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  if (missing) {
    return (
      <main className="min-h-screen hub-bg text-white">
        <HubHeader />
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Character not found
          </h1>
          <p className="text-sm text-white/55">
            It may have been deleted or hidden.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/15"
          >
            Back to hub
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 flex h-screen w-full flex-col bg-black text-white">
      <HubHeader variant="fixed" />
      <div className="relative flex-1">
        <Scene />
        {!introFinished && <LoadingScreen />}

        {/* Info panel */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pointer-events-none absolute left-4 top-1/2 z-20 flex w-[min(360px,calc(100vw-32px))] -translate-y-1/2 flex-col gap-4 max-md:top-auto max-md:left-2 max-md:right-2 max-md:bottom-[160px] max-md:w-auto max-md:translate-y-0"
        >
          <div className="pointer-events-auto glass-panel rounded-2xl p-5">
            {!record ? (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
                  Character
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {record.name}
                </h1>
                <div className="mt-1 text-xs text-white/55">
                  by{" "}
                  <span className="text-white/80">{author}</span>
                  {" · "}
                  {new Date(record.created).toLocaleDateString()}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isOwner ? (
                    <Link
                      href={`/create/${record.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold tracking-tight text-zinc-950 transition-colors hover:bg-white/90"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      onClick={onFork}
                      className="h-auto gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold tracking-tight text-zinc-950 transition-colors hover:bg-white/90"
                    >
                      <GitFork className="h-3.5 w-3.5" /> Fork
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onShare}
                    className="h-auto gap-1.5 rounded-full border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium tracking-tight text-white/85 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>

                <div className="mt-5">
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
                    Try in
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRY_LINKS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <Link
                          key={t.href}
                          href={t.href}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium tracking-tight text-white/75 transition-colors hover:border-white/30 hover:text-white"
                        >
                          <Icon className="h-3 w-3" />
                          {t.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.aside>
      </div>
    </main>
  );
};

export default CharacterPageView;
