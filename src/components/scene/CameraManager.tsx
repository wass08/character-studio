import { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";

type Triplet = [number, number, number];

export const DEFAULT_CAMERA_POSITION: Triplet = [
  0.1, 1.4059367994699732, -2.990515168885181,
];
export const DEFAULT_CAMERA_TARGET: Triplet = [
  0.1, 0.9652248734528945, 0.5650397082939782,
];

export const PHOTO_CAMERA_POSITION: Triplet = [0, 1.4, -3.5];
export const PHOTO_CAMERA_TARGET: Triplet = [0, 1.0, 0];

// Portrait framing for /try/lipsync — face fills ~40% of the viewport.
// Picks up the head bone's actual world position when available so
// height-slider tweaks don't crop the chin off; falls back to a
// reasonable default before the avatar mounts.
export const LIPSYNC_CAMERA_FALLBACK_POSITION: Triplet = [0, 1.55, -1.4];
export const LIPSYNC_CAMERA_FALLBACK_TARGET: Triplet = [0, 1.55, 0];

type CameraConfig = {
  bone: string;
  offset: THREE.Vector3;
  targetOffset: THREE.Vector3;
};

const CAMERA_CONFIGS: Record<string, CameraConfig> = {
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
    offset: new THREE.Vector3(1, 0.2, -2.3),
    targetOffset: new THREE.Vector3(0, -0.14, 0),
  },
  Mouth: {
    bone: "teethB",
    offset: new THREE.Vector3(0, 0, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Eyes: {
    bone: "nose",
    offset: new THREE.Vector3(0, 0, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Eyelashes: {
    bone: "nose",
    offset: new THREE.Vector3(0.02, 0, -0.2),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Eyebrows: {
    bone: "nose",
    offset: new THREE.Vector3(0, 0, -0.35),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Footwear: {
    bone: "DEF-footL",
    offset: new THREE.Vector3(-1, 0.2, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
};

type CameraManagerProps = {
  loading?: boolean;
};

// Until useConfiguratorStore is itself typed, the engine surface
// narrows store reads at the call site.
type CategoryRef = { name: string } | null;
type StoreSlice = {
  currentCategory: CategoryRef;
  height: number;
  mode: string;
  loading: boolean;
};

// `loading` is part of the historic API but currently unused — kept
// in the props for ABI parity until the engine rewrite's later phases
// remove the field entirely.
export const CameraManager = (_props: CameraManagerProps = {}) => {
  const controls = useRef<CameraControls | null>(null);
  const scene = useThree((state) => state.scene);
  const currentCategory = useConfiguratorStore(
    (state: StoreSlice) => state.currentCategory,
  );
  const height = useConfiguratorStore((state: StoreSlice) => state.height);
  const mode = useConfiguratorStore((state: StoreSlice) => state.mode);
  const loading = useConfiguratorStore((state: StoreSlice) => state.loading);

  useEffect(() => {
    if (!controls.current) return;

    // Photo mode: snap to a flattering full-body framing on entry, but
    // leave orbit/zoom on so users can compose their own shot. Drop
    // minDistance to allow close-ups without clipping into the avatar.
    if (mode === UI_MODES.PHOTO) {
      controls.current.enabled = true;
      controls.current.minDistance = 1;
      controls.current.setLookAt(
        ...PHOTO_CAMERA_POSITION,
        ...PHOTO_CAMERA_TARGET,
        true,
      );
      return;
    }

    // Lipsync mode: head-and-shoulders portrait. Anchored on DEF-head
    // when present so the face fills the frame regardless of avatar
    // height. CameraControls' minDistance is dropped to let the camera
    // sit ~1m from the head.
    if (mode === UI_MODES.LIPSYNC) {
      controls.current.enabled = false;
      controls.current.minDistance = 0.6;
      const head = scene.getObjectByName("DEF-head");
      if (head) {
        const headPos = new THREE.Vector3();
        head.getWorldPosition(headPos);
        controls.current.setLookAt(
          headPos.x,
          headPos.y + 0.02,
          headPos.z - 1.0,
          headPos.x,
          headPos.y - 0.05,
          headPos.z,
          true,
        );
      } else {
        controls.current.setLookAt(
          ...LIPSYNC_CAMERA_FALLBACK_POSITION,
          ...LIPSYNC_CAMERA_FALLBACK_TARGET,
          true,
        );
      }
      return;
    }

    // Re-enable controls when back in customize mode; restore default
    // dolly bounds (LIPSYNC drops them above).
    controls.current.minDistance = 2;
    controls.current.enabled = true;

    const config = currentCategory
      ? (CAMERA_CONFIGS[currentCategory.name] ?? null)
      : null;
    const targetObject = config ? scene.getObjectByName(config.bone) : null;

    const targetPos = new THREE.Vector3();
    const lookAtPos = new THREE.Vector3();

    if (targetObject && config) {
      targetObject.getWorldPosition(lookAtPos);
      lookAtPos.add(config.targetOffset);
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
    // `loading` participates so LIPSYNC re-targets DEF-head once the
    // avatar finishes mounting (head bone isn't in the scene tree
    // until then).
  }, [currentCategory, height, scene, mode, loading]);

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
      const c = controls.current;
      if (c) console.log("Camera Position", c.getPosition(new THREE.Vector3()));
    }),
    getCameraTarget: button(() => {
      const c = controls.current;
      if (c) console.log("Camera Target", c.getTarget(new THREE.Vector3()));
    }),
  });

  return (
    <CameraControls
      ref={controls}
      maxPolarAngle={Math.PI / 2}
      minDistance={2}
      maxDistance={8}
    />
  );
};
