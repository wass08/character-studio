import React, { Suspense, useRef, useEffect } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { NodeIO } from "@gltf-transform/core";
import { dedup, draco, prune, quantize } from "@gltf-transform/functions";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Asset } from "./Asset";
import { GLTFExporter } from "three-stdlib";

export default function Model(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF("/models/Armature.glb");
  const { actions, names } = useAnimations(animations, group);

  const customization = useConfiguratorStore((state) => state.customization);
  const setDownload = useConfiguratorStore((state) => state.setDownload);
  const height = useConfiguratorStore((state) => state.height);

  const pose = useConfiguratorStore((state) => state.pose);

  console.log(nodes);

  useEffect(() => {
    animations.forEach((clip) => {
      clip.tracks = clip.tracks.filter(
        (track) => !track.name.includes(".scale"),
      );
    });
  }, [animations]);

  useEffect(() => {
    const rig = group.current?.getObjectByName("Rig");
    if (rig) rig.scale.set(height, height, height);
  }, [height]);

  useEffect(() => {
    const action = actions[pose];
    if (action) {
      action.reset().fadeIn(0.5).play();
      return () => action.fadeOut(0.2).stop();
    }
  }, [actions, pose]);

  useEffect(() => {
    function download() {
      const exporter = new GLTFExporter();
      exporter.parse(
        group.current,
        async function (result) {
          const io = new NodeIO();

          // Read.
          const document = await io.readBinary(new Uint8Array(result)); // Uint8Array → Document
          await document.transform(
            // Remove unused nodes, textures, or other data.
            prune(),
            // Remove duplicate vertex or texture data, if any.
            dedup(),
            // Compress mesh geometry with Draco.
            draco(),
            // Quantize mesh geometry.
            quantize(),
          );

          // Write.
          const glb = await io.writeBinary(document); // Document → Uint8Array

          save(
            new Blob([glb], { type: "application/octet-stream" }),
            `avatar_${+new Date()}.glb`,
          );
        },
        function (error) {
          console.error(error);
        },
        { binary: true },
      );
    }

    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link); // Firefox workaround, see #6594

    function save(blob, filename) {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
    setDownload(download);
  }, []);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group
          name="Rig"
          position={[0, 0, 0.098]}
          rotation={[Math.PI, 0, Math.PI]}
          scale={[height, height, height]}
        >
          <primitive object={nodes.root} />
          {/* <primitive object={nodes["MCH-eyes_parent"]} /> */}

          {Object.keys(customization).map(
            (key) =>
              customization[key]?.asset?.url && (
                <Suspense key={customization[key].asset.id}>
                  <Asset
                    categoryName={key}
                    url={pb.files.getURL(
                      customization[key].asset,
                      customization[key].asset.url,
                    )}
                    skeleton={nodes.Plane.skeleton}
                  />
                </Suspense>
              ),
          )}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Armature.glb");
