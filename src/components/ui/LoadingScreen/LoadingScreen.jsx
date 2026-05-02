"use client";

import { motion } from "motion/react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

const LoadingScreen = () => {
  const loading = useConfiguratorStore((state) => state.loading);
  const setIntroFinished = useConfiguratorStore(
    (state) => state.setIntroFinished,
  );

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: loading ? 1 : 0 }}
      transition={{
        duration: 0.8,
        delay: loading ? 0 : 0.3,
        ease: [0.4, 0, 0.6, 1],
      }}
      onAnimationComplete={() => {
        if (!loading) setIntroFinished(true);
      }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black"
    >
      <motion.div
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: loading ? 0 : -20, opacity: loading ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.7, 1] }}
        className="flex flex-col items-center justify-center gap-2"
      >
        <img
          src="/images/character-icon.svg"
          alt=""
          aria-hidden="true"
          className="h-20 w-auto animate-loading-pulse select-none"
        />
        <img
          src="/images/logo-white.svg"
          alt="Wawasensei"
          className="w-40 select-none"
        />
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
