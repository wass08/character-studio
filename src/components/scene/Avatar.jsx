import React, { Suspense, useRef, useEffect } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Asset } from "./Asset";
import { GLTFExporter } from "three-stdlib";

export default function Model(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF("/models/Armature.glb");
  const { actions, names } = useAnimations(animations, group);

  const customization = useConfiguratorStore((state) => state.customization);
  const setDownload = useConfiguratorStore((state) => state.setDownload);

  useEffect(() => {
    console.log("Available Animations:", names);

    if (names.length > 0) {
      actions["Rig|Walk_Loop"].reset().fadeIn(0.5).play();
    }
  }, [actions, names]);

  useEffect(() => {
    function download() {
      if (!group.current) return;

      const exporter = new GLTFExporter();

      exporter.parse(
        group.current,
        function (result) {
          save(
            new Blob([result], { type: "application/octet-stream" }),
            `avatar_${+new Date()}.glb`
          );
        },
        function (error) {
          console.error("An error happened during export:", error);
        },
        { binary: true }
      );
    }

    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link);

    function save(blob, filename) {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    setDownload(download);

    return () => {
      document.body.removeChild(link);
    };
  }, [setDownload]);

  return (
    <group ref={group} {...props} dispose={null}>
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
                    categoryName={key}
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
