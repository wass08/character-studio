import React, { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export default function Model(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF("/models/Test-v1.glb");
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const firstAnimationName = Object.keys(actions)[0];
    if (firstAnimationName) {
      actions["Rig|Walk_Loop"]?.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  const blinkTimerRef = useRef(0);

  useFrame((state, delta) => {
    blinkTimerRef.current += delta;

    if (blinkTimerRef.current > 3 + Math.random() * 2) {
      blink();
      blinkTimerRef.current = 0;
    }
  });

  const blink = () => {
    const face = nodes.Female_Base_Mesh;
    const leftEyeIndex = face.morphTargetDictionary["eyeBlinkLeft"];
    const rightEyeIndex = face.morphTargetDictionary["eyeBlinkRight"];

    face.morphTargetInfluences[leftEyeIndex] = 1;
    face.morphTargetInfluences[rightEyeIndex] = 1;

    setTimeout(() => {
      face.morphTargetInfluences[leftEyeIndex] = 0;
      face.morphTargetInfluences[rightEyeIndex] = 0;
    }, 100);
  };

  const setEyeBlink = (value) => {
    const face = nodes.Female_Base_Mesh;
    face.morphTargetInfluences[1] = value;
    face.morphTargetInfluences[8] = value;
  };

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Empty" position={[0, 0, 0.098]}>
          <group name="Rig" rotation={[Math.PI, 0, Math.PI]}>
            <skinnedMesh
              name="Eyebrows_Large"
              geometry={nodes.Eyebrows_Large.geometry}
              material={materials.Hair}
              skeleton={nodes.Eyebrows_Large.skeleton}
              morphTargetDictionary={nodes.Eyebrows_Large.morphTargetDictionary}
              morphTargetInfluences={nodes.Eyebrows_Large.morphTargetInfluences}
            />
            <skinnedMesh
              name="Eyelashes_Stylized"
              geometry={nodes.Eyelashes_Stylized.geometry}
              material={materials.Hair}
              skeleton={nodes.Eyelashes_Stylized.skeleton}
              morphTargetDictionary={
                nodes.Eyelashes_Stylized.morphTargetDictionary
              }
              morphTargetInfluences={
                nodes.Eyelashes_Stylized.morphTargetInfluences
              }
            />
            <skinnedMesh
              name="Female_Base_Mesh"
              geometry={nodes.Female_Base_Mesh.geometry}
              material={materials.Skin}
              skeleton={nodes.Female_Base_Mesh.skeleton}
              morphTargetDictionary={
                nodes.Female_Base_Mesh.morphTargetDictionary
              }
              morphTargetInfluences={
                nodes.Female_Base_Mesh.morphTargetInfluences
              }
            />
            <skinnedMesh
              name="Hair_Down_Medium"
              geometry={nodes.Hair_Down_Medium.geometry}
              material={materials.Hair}
              skeleton={nodes.Hair_Down_Medium.skeleton}
            />
            <skinnedMesh
              name="Inner_White_Shirt"
              geometry={nodes.Inner_White_Shirt.geometry}
              material={materials.Shirt}
              skeleton={nodes.Inner_White_Shirt.skeleton}
            />
            <group name="L_Eye">
              <skinnedMesh
                name="Sphere"
                geometry={nodes.Sphere.geometry}
                material={materials["Eye Black"]}
                skeleton={nodes.Sphere.skeleton}
                morphTargetDictionary={nodes.Sphere.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere.morphTargetInfluences}
              />
              <skinnedMesh
                name="Sphere_1"
                geometry={nodes.Sphere_1.geometry}
                material={materials["Eye White"]}
                skeleton={nodes.Sphere_1.skeleton}
                morphTargetDictionary={nodes.Sphere_1.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere_1.morphTargetInfluences}
              />
              <skinnedMesh
                name="Sphere_2"
                geometry={nodes.Sphere_2.geometry}
                material={materials["Eye Brown"]}
                skeleton={nodes.Sphere_2.skeleton}
                morphTargetDictionary={nodes.Sphere_2.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere_2.morphTargetInfluences}
              />
            </group>
            <group name="Mouth">
              <skinnedMesh
                name="Jaw_-_Stylized_"
                geometry={nodes["Jaw_-_Stylized_"].geometry}
                material={materials.Mouth}
                skeleton={nodes["Jaw_-_Stylized_"].skeleton}
                morphTargetDictionary={
                  nodes["Jaw_-_Stylized_"].morphTargetDictionary
                }
                morphTargetInfluences={
                  nodes["Jaw_-_Stylized_"].morphTargetInfluences
                }
              />
              <skinnedMesh
                name="Jaw_-_Stylized__1"
                geometry={nodes["Jaw_-_Stylized__1"].geometry}
                material={materials.Teeth}
                skeleton={nodes["Jaw_-_Stylized__1"].skeleton}
                morphTargetDictionary={
                  nodes["Jaw_-_Stylized__1"].morphTargetDictionary
                }
                morphTargetInfluences={
                  nodes["Jaw_-_Stylized__1"].morphTargetInfluences
                }
              />
            </group>
            <group name="R_Eye">
              <skinnedMesh
                name="Sphere001"
                geometry={nodes.Sphere001.geometry}
                material={materials["Eye Black"]}
                skeleton={nodes.Sphere001.skeleton}
                morphTargetDictionary={nodes.Sphere001.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere001.morphTargetInfluences}
              />
              <skinnedMesh
                name="Sphere001_1"
                geometry={nodes.Sphere001_1.geometry}
                material={materials["Eye White"]}
                skeleton={nodes.Sphere001_1.skeleton}
                morphTargetDictionary={nodes.Sphere001_1.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere001_1.morphTargetInfluences}
              />
              <skinnedMesh
                name="Sphere001_2"
                geometry={nodes.Sphere001_2.geometry}
                material={materials["Eye Brown"]}
                skeleton={nodes.Sphere001_2.skeleton}
                morphTargetDictionary={nodes.Sphere001_2.morphTargetDictionary}
                morphTargetInfluences={nodes.Sphere001_2.morphTargetInfluences}
              />
            </group>
            <skinnedMesh
              name="Suit"
              geometry={nodes.Suit.geometry}
              material={materials.Suit}
              skeleton={nodes.Suit.skeleton}
            />
            <skinnedMesh
              name="Suit_Shoes"
              geometry={nodes.Suit_Shoes.geometry}
              material={materials.Shoes}
              skeleton={nodes.Suit_Shoes.skeleton}
            />
            <skinnedMesh
              name="Suit_Skirt"
              geometry={nodes.Suit_Skirt.geometry}
              material={materials.Skirt}
              skeleton={nodes.Suit_Skirt.skeleton}
            />
            <primitive object={nodes.root} />
            <primitive object={nodes["MCH-eyes_parent"]} />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/Test-v1.glb");
