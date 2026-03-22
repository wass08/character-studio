import React, { Suspense, useRef, useEffect } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { NodeIO } from "@gltf-transform/core";
import { dedup, draco, prune, quantize } from "@gltf-transform/functions";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Asset } from "./Asset";
import { GLTFExporter } from "three-stdlib";
import { SkinManager } from "./SkinManager";

export default function Model(props) {
  const group = useRef();

  const gender = useConfiguratorStore((state) => state.gender);

  const { nodes } = useGLTF(`/models/characters/${gender}/Armature.glb`);

  const { animations } = useGLTF(`/models/characters/${gender}/Animations.glb`);

  const { actions, names } = useAnimations(animations, group);

  if (!nodes?.root || !nodes?.["MCH-eyes_parent"] || !nodes?.Plane002) {
    return null;
  }

  const customization = useConfiguratorStore((state) => state.customization);
  const setDownload = useConfiguratorStore((state) => state.setDownload);
  const height = useConfiguratorStore((state) => state.height);

  const pose = useConfiguratorStore((state) => state.pose);

  const remap = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  useEffect(() => {
    animations.forEach((clip) => {
      clip.tracks = clip.tracks.filter(
        (track) => !track.name.includes(".scale"),
      );
    });
  }, [animations]);

  useEffect(() => {
    const rig = group.current?.getObjectByName("Rig");
    if (rig) {
      const visualScale = remap(height, 0.5, 2.0, 0.95, 1);

      rig.scale.set(visualScale, visualScale, visualScale);
    }
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
          console.log("Export Result:", result);
          console.log("Result Byte Length:", result.byteLength);
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

    console.log("TEST LOG");

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
      <Suspense fallback={null}>
        <SkinManager />
      </Suspense>
      <group name="Scene">
        <group
          name="Rig"
          position={[0, 0, 0.098]}
          rotation={[Math.PI, 0, Math.PI]}
          scale={[height, height, height]}
        >
          <primitive object={nodes.root} />
          <primitive object={nodes["MCH-eyes_parent"]} />

          {Object.keys(customization).map((key) => {
            const asset = customization[key]?.asset;
            if (!asset?.url) return null;

            const url = pb.files.getURL(asset, asset.url);
            const isImage = url.match(/\.(png|jpg|jpeg)$/i);

            if (isImage) return null;

            return (
              <Suspense key={asset.id}>
                <Asset
                  categoryName={key}
                  url={url}
                  skeleton={nodes.Plane002.skeleton}
                />
              </Suspense>
            );
          })}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/characters/woman/Armature.glb");
useGLTF.preload("/models/characters/man/Armature.glb");
useGLTF.preload("/models/characters/man/Animations.glb");
useGLTF.preload("/models/characters/woman/Animations.glb");
