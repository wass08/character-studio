"use client";

import { Environment } from "@react-three/drei";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import Avatar from "@/components/scene/Avatar";
import { StoreCharacterProvider } from "@/components/scene/CharacterContext";
import IdleJuice from "@/components/scene/IdleJuice";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
import { Button } from "@/components/ui/button";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * The homepage hero: one big live 3D character on the right, marketing
 * copy + CTA on the left.
 *
 * The character is whatever sits in `useConfiguratorStore`:
 *   - Signed-in user with a main character → AuthBootstrapper loads it.
 *   - Anonymous user with a persisted `currentCharacterId` → AuthBootstrapper
 *     re-fetches it.
 *   - Otherwise → this component fetches one curator-featured (or most
 *     recent non-hidden) character and loads it as the demo hero.
 *
 * We deliberately reuse the editor's `<Avatar />` and the singleton
 * configurator store rather than spawning per-character clones — the
 * proven path animates correctly. Multi-character "plaza" is the
 * deferred phase 6 of plans/app-nav-and-positioning.md.
 */
const HeroStage = () => {
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);

  // Run the demo bootstrap exactly once per mount. The ref survives
  // React strict-mode's mount → unmount → mount without re-dispatching.
  const triedDemoRef = useRef(false);
  useEffect(() => {
    if (currentCharacterId) return;
    if (triedDemoRef.current) return;
    triedDemoRef.current = true;
    (async () => {
      try {
        // Featured first, then most-recent non-hidden as fallback.
        let rec = null;
        const featured = await pb
          .collection("CharacterStudioCharacters")
          .getList(1, 1, {
            filter: "featured = true && hidden != true",
            sort: "-updated",
            skipTotal: true,
            requestKey: null,
          });
        rec = featured.items[0] || null;
        if (!rec) {
          const latest = await pb
            .collection("CharacterStudioCharacters")
            .getList(1, 1, {
              filter: "hidden != true",
              sort: "-updated",
              skipTotal: true,
              requestKey: null,
            });
          rec = latest.items[0] || null;
        }
        // Race guard: AuthBootstrapper may have populated the store
        // while we were fetching.
        if (rec && !useConfiguratorStore.getState().currentCharacterId) {
          await loadCharacter(rec);
        }
      } catch {
        // Quietly fall through — the hero canvas just shows the
        // default rig (which is invisible, but Featured/Wall below
        // still carry the page).
      }
    })();
  }, [currentCharacterId, loadCharacter]);

  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pt-8 pb-12 md:px-8 md:pt-12 md:pb-16">
      <IdleJuice />
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
        {/* Marketing copy */}
        <div className="flex flex-col items-start gap-5">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/75"
          >
            <Sparkles className="h-3 w-3 text-amber-200" />
            Character Studio
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            Create your character.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="max-w-xl text-base text-white/65 md:text-lg"
          >
            Build a character that's yours. Pose them, make them speak, take
            them for a walk — then drop them into whatever you build next.
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
              className="h-auto gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-tight text-zinc-950 shadow-[0_0_32px_rgba(255,255,255,0.18)] hover:bg-white hover:scale-[1.02] transition-transform"
            >
              <Link href="/editor">
                Create your character
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Live character stage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
          className="relative h-[420px] w-full overflow-hidden rounded-2xl md:h-[520px] lg:h-[600px]"
        >
          <EngineCanvas
            dpr={[1, 1.5]}
            shadows={false}
            camera={{ position: [0, 1.05, -3.6], fov: 38 }}
            // R3F's default lookAt is origin (feet). Aim at chest height
            // so the head sits in the upper third of the frame.
            onCreated={({ camera }) => {
              camera.lookAt(0, 1.0, 0);
              camera.updateProjectionMatrix();
            }}
          >
            <color attach="background" args={["#1c1c2a"]} />
            <Environment
              background={false}
              environmentIntensity={0.55}
              environmentRotation={[0, Math.PI / 2, 0]}
              preset="city"
            />
            <ambientLight intensity={0.45} />
            <hemisphereLight args={["#fff4ec", "#33344a", 0.55]} />
            <directionalLight
              position={[-3, 5, -3]}
              intensity={1.2}
              color="#ffebe3"
            />
            <directionalLight
              position={[-5, 5, 5]}
              intensity={1.4}
              color="#ffebe3"
            />
            <directionalLight
              position={[0.8, 2, -4]}
              intensity={0.8}
              color="#fff2e7"
            />
            <StoreCharacterProvider>
              <Avatar />
            </StoreCharacterProvider>
          </EngineCanvas>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroStage;
