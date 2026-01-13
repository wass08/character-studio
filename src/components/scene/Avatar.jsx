import React, { Suspense, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Asset } from "./Asset";

export default function Model(props) {
  const { nodes, materials } = useGLTF("/models/Armature.glb");

  const customization = useConfiguratorStore((state) => state.customization);

  return (
    <group {...props} dispose={null}>
      <group name="Scene">
        <group
          name="Rig"
          position={[0, 0, 0.098]}
          rotation={[Math.PI, 0, Math.PI]}
        >
          <primitive object={nodes.root} />
          <primitive object={nodes["MCH-eyes_parent"]} />

          {Object.keys(customization).map(
            (key) =>
              customization[key]?.asset?.url && (
                <Suspense key={customization[key].asset.id}>
                  <Asset
                    url={pb.files.getURL(
                      customization[key].asset,
                      customization[key].asset.url
                    )}
                    skeleton={nodes.Plane.skeleton}
                  />
                </Suspense>
              )
          )}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Armature.glb");
