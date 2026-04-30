import React, { useRef } from "react";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

gsap.registerPlugin(useGSAP);

const LoadingScreen = () => {
  const loading = useConfiguratorStore((state) => state.loading);
  const setIntroFinished = useConfiguratorStore(
    (state) => state.setIntroFinished,
  );

  const container = useRef();
  const textRef = useRef();

  useGSAP(
    () => {
      if (!loading) {
        const tl = gsap.timeline({
          onComplete: () => setIntroFinished(true),
        });

        tl.to(textRef.current, {
          y: -20,
          opacity: 0,
          duration: 0.5,
          ease: "power2.in",
        }).to(
          container.current,
          { opacity: 0, duration: 0.8, ease: "power2.out" },
          "-=0.2",
        );
      }
    },
    { dependencies: [loading], scope: container },
  );

  return (
    <div
      ref={container}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black text-white"
    >
      <div
        ref={textRef}
        className="text-sm font-medium tracking-[0.3em] text-white/85 uppercase"
      >
        Loading
      </div>
    </div>
  );
};

export default LoadingScreen;
