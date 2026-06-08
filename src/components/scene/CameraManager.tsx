import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Triplet = [number, number, number];

export const DEFAULT_CAMERA_POSITION: Triplet = [
  0.1, 1.4059367994699732, -2.990515168885181,
];
export const DEFAULT_CAMERA_TARGET: Triplet = [
  0, 0.9652248734528945, 0.5650397082939782,
];

// The avatar's body center sits at z≈0.565 (the customize-mode default
// target), not z=0. Orbiting around z=0 swung the pivot ~0.5m in front of
// the character, so rotating threw it off-screen. Re-center the pivot on
// the body and shift the camera by the same +0.565 so the framing distance
// (~3.5m) is preserved.
export const PHOTO_CAMERA_POSITION: Triplet = [0, 1.4, -2.935];
export const PHOTO_CAMERA_TARGET: Triplet = [0, 1.0, 0.565];

type CameraConfig = {
  bone: string;
  offset: THREE.Vector3;
  targetOffset: THREE.Vector3;
};

const CAMERA_CONFIGS: Record<string, CameraConfig> = {
  Hat: {
    bone: "DEF-head",
    offset: new THREE.Vector3(0.3, 0.1, -0.8),
    targetOffset: new THREE.Vector3(0, 0.1, 0),
  },
  Head: {
    bone: "DEF-head",
    offset: new THREE.Vector3(-0.2, 0.1, -0.6),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Face: {
    bone: "DEF-head",
    offset: new THREE.Vector3(0.1, 0.1, -0.6),
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
  "Facial Hair": {
    bone: "teethB",
    offset: new THREE.Vector3(0, 0, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Eyes: {
    bone: "nose",
    offset: new THREE.Vector3(0, 0, -0.5),
    targetOffset: new THREE.Vector3(0, 0, 0),
  },
  Glasses: {
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
  lipsyncPlaying: boolean;
};

// `loading` is part of the historic API but currently unused — kept
// in the props for ABI parity until the engine rewrite's later phases
// remove the field entirely.
export const CameraManager = (_props: CameraManagerProps = {}) => {
  const controls = useRef<CameraControls | null>(null);
  const lipsyncZoomed = useRef(false);
  const scene = useThree((state) => state.scene);
  const currentCategory = useConfiguratorStore(
    (state: StoreSlice) => state.currentCategory,
  );
  const height = useConfiguratorStore((state: StoreSlice) => state.height);
  const mode = useConfiguratorStore((state: StoreSlice) => state.mode);
  const loading = useConfiguratorStore((state: StoreSlice) => state.loading);
  const lipsyncPlaying = useConfiguratorStore(
    (state: StoreSlice) => state.lipsyncPlaying,
  );

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

    // Lipsync mode: tight head + upper-body framing. The actual setLookAt
    // happens in the useFrame below, which waits for the DEF-head bone to
    // exist — the avatar's Armature GLB loads async, so the bone often
    // isn't in the scene yet when this effect fires on mode change.
    if (mode === UI_MODES.LIPSYNC) {
      controls.current.enabled = false;
      controls.current.minDistance = 0.6;
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
    // `loading` participates so per-category framing re-resolves its bone
    // once the avatar finishes mounting (bones aren't in the scene tree
    // until then). Lipsync framing is handled separately in useFrame.
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

  // Lipsync framing. Eases in to a head + chest shot (mirroring the
  // face-thumbnail framing) while audio plays, and back out to the default
  // full-body view when it stops. Runs in useFrame rather than an effect
  // because the DEF-head bone loads async — we wait until it's in the
  // scene before zooming in.
  useFrame(() => {
    if (mode !== UI_MODES.LIPSYNC || !controls.current) {
      lipsyncZoomed.current = false;
      return;
    }
    if (lipsyncPlaying && !lipsyncZoomed.current) {
      const head = scene.getObjectByName("DEF-head");
      if (!head) return;
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);
      controls.current.setLookAt(
        headPos.x,
        headPos.y + 0.05,
        headPos.z - 0.95,
        headPos.x,
        headPos.y - 0.12,
        headPos.z,
        true,
      );
      lipsyncZoomed.current = true;
    } else if (!lipsyncPlaying && lipsyncZoomed.current) {
      controls.current.setLookAt(
        ...DEFAULT_CAMERA_POSITION,
        ...DEFAULT_CAMERA_TARGET,
        true,
      );
      lipsyncZoomed.current = false;
    }
  });

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
