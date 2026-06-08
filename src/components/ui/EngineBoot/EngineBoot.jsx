import Spinner from "@/components/ui/Spinner/Spinner";

/**
 * Engine-boot screen: shown while the three.js chunk downloads + the WebGPU
 * canvas spins up (the `loading` fallback for the `next/dynamic` engine
 * boundaries). This is the "3D scene is loading" state — branded with the
 * Character Studio wordmark + a spinner. The in-canvas 3D diamond is a separate
 * thing: it covers the *character* decoding once the canvas is already live.
 */
const EngineBoot = () => (
  <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-black">
    <img
      src="/images/logo-white.svg"
      alt="Character Studio"
      className="w-44 select-none opacity-90 md:w-52"
    />
    <Spinner className="h-7 w-7" />
  </div>
);

export default EngineBoot;
