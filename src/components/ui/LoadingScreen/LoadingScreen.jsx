import React, { useRef, useState } from "react";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

import "./LoadingScreen.css";

gsap.registerPlugin(useGSAP);

const LoadingScreen = () => {
  const loading = useConfiguratorStore((state) => state.loading);
  const [isVisible, setIsVisible] = useState(true);

  const container = useRef();
  const textRef = useRef();

  useGSAP(
    () => {
      if (!loading) {
        const tl = gsap.timeline({
          onComplete: () => setIsVisible(false),
        });

        tl.to(textRef.current, {
          y: -20,
          opacity: 0,
          duration: 0.5,
          ease: "power2.in",
        }).to(
          container.current,
          {
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
          },
          "-=0.2",
        );
      }
    },
    { dependencies: [loading], scope: container },
  );

  if (!isVisible) return null;

  return (
    <div ref={container} className="loading-screen">
      <div ref={textRef} className="loading-text">
        loading brotha
      </div>
    </div>
  );
};

export default LoadingScreen;
