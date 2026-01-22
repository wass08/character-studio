import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export const DEFAULT_CAMERA_POSITION = [
  -0.409973747190002, 1.2638172494736424, -2.52503921021995,
];
export const DEFAULT_CAMERA_TARGET = [
  -1.2922606470757718, 0.711227468452741, 0.4337429681603808,
];

const CAMERA_CONFIGS = {
  Hat: {
    bone: "DEF-head",
    offset: new THREE.Vector3(0, 0.1, -0.6),
  },
  Top: {
    bone: "DEF-spine002",
    offset: new THREE.Vector3(0, 0, -1.2),
  },
  Bottom: {
    bone: "DEF-hips",
    offset: new THREE.Vector3(0, 0.2, -1.5),
  },
  Shoe: {
    bone: "DEF-footL",
    offset: new THREE.Vector3(-1, 0.2, -0.5),
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
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={8}
      />
    </>
  );
};
