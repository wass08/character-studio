import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export const DEFAULT_CAMERA_POSITION = [
  0.4267973687335498, 1.4059367994699732, -2.990515168885181,
];
export const DEFAULT_CAMERA_TARGET = [
  0.7773834966980404, 0.9652248734528945, 0.5650397082939782,
];

const CAMERA_CONFIGS = {
  Hat: {
    bone: "DEF-head",
    offset: new THREE.Vector3(0, 0.1, -0.6),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Hair: {
    bone: "DEF-head",
    offset: new THREE.Vector3(0.4, 0.2, -0.6),
    targetOffset: new THREE.Vector3(0, 0.1, 0),
  },
  Top: {
    bone: "DEF-spine002",
    offset: new THREE.Vector3(0, 0, -1.2),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Bottom: {
    bone: "DEF-hips",
    offset: new THREE.Vector3(0, 0.2, -1.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Shoe: {
    bone: "DEF-footL",
    offset: new THREE.Vector3(-1, 0.2, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
};

export const CameraManager = ({ loading }) => {
  const controls = useRef();
  const scene = useThree((state) => state.scene);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const height = useConfiguratorStore((state) => state.height);

  useEffect(() => {
    if (!controls.current) return;

    const config = currentCategory
      ? CAMERA_CONFIGS[currentCategory.name]
      : null;
    const targetObject = config ? scene.getObjectByName(config.bone) : null;

    const targetPos = new THREE.Vector3();
    const lookAtPos = new THREE.Vector3();

    if (targetObject) {
      targetObject.getWorldPosition(lookAtPos);

      if (config.targetOffset) {
        lookAtPos.add(config.targetOffset);
      }

      targetPos.copy(lookAtPos).add(config.offset);
    } else {
      targetPos.set(...DEFAULT_CAMERA_POSITION);
      lookAtPos.set(...DEFAULT_CAMERA_TARGET);
    }

    const destAzimuth = Math.atan2(
      config?.offset.x ?? DEFAULT_CAMERA_POSITION[0] - DEFAULT_CAMERA_TARGET[0],
      config?.offset.z ?? DEFAULT_CAMERA_POSITION[2] - DEFAULT_CAMERA_TARGET[2],
    );
    const currentAzimuth = controls.current.azimuthAngle;
    const closestAzimuth =
      currentAzimuth -
      2 * Math.PI * Math.round((currentAzimuth - destAzimuth) / (2 * Math.PI));

    controls.current.azimuthAngle = closestAzimuth;
    controls.current.update(0);

    // 4. Perform the transition
    controls.current.setLookAt(
      targetPos.x,
      targetPos.y,
      targetPos.z,
      lookAtPos.x,
      lookAtPos.y,
      lookAtPos.z,
      true,
    );
  }, [currentCategory, height, scene]);

  useEffect(() => {
    if (controls.current) {
      controls.current.setLookAt(
        ...DEFAULT_CAMERA_POSITION,
        ...DEFAULT_CAMERA_TARGET,
        false,
      );
    }
  }, []);

  useControls({
    getCameraPosition: button(() => {
      console.log("Camera Position", controls.current.getPosition());
    }),
    getCameraTarget: button(() => {
      console.log("Camera Target", controls.current.getTarget());
    }),
  });

  return (
    <>
      <CameraControls
        ref={controls}
        // minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={8}
      />
    </>
  );
};
