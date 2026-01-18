import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { CameraControls } from "@react-three/drei";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";

export const START_CAMERA_POSITION = [500, 10, 1000];
export const DEFAULT_CAMERA_POSITION = [-1, 1, 5];
export const DEFAULT_CAMERA_TARGET = [0, 0, 0];

export const CameraManager = ({ loading }) => {
  const controls = useRef();

  useControls({
    getCameraPosition: button(() => {
      console.log("Camera Position", [...controls.current.getPosition()]);
    }),
    getCameraTarget: button(() => {
      console.log("Camera Target", [...controls.current.getTarget()]);
    }),
  });

  return (
    <CameraControls
      ref={controls}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2}
      minDistance={2}
      maxDistance={8}
    />
  );
};
