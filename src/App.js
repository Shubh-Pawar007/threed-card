import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas, extend, useThree, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
  Text,
  Image,
} from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useControls } from "leva";
import bgImage from "../src/assets/Coverbg.jpg";

extend({ MeshLineGeometry, MeshLineMaterial });
useGLTF.preload(
  "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb"
);
useTexture.preload(
  "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/SOT1hmCesOHxEYxL7vkoZ/c57b29c85912047c414311723320c16b/band.jpg"
);

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 13], fov: 25 }}
      style={{
        height: "100vh",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        WebkitBackdropFilter: "blur(500px)", // For Webkit-based browsers
        backdropFilter: "blur(10px)",
      }}
    >
      <ambientLight intensity={Math.PI} />
      <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band />
      </Physics>
      <Environment background blur={0.35}>
        {/* <color attach="background" args={["whi"]} /> */}
        <Lightformer
          intensity={2}
          color="white"
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          color="white"
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
    </Canvas>
  );
}

function Band({ maxSpeed = 50, minSpeed = 10 }) {
  const band = useRef(), fixed = useRef(), j1 = useRef(), j2 = useRef(), j3 = useRef(), card = useRef(); // prettier-ignore
  const vec = new THREE.Vector3(), ang = new THREE.Vector3(), rot = new THREE.Vector3(), dir = new THREE.Vector3(); // prettier-ignore
  const segmentProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 2,
    linearDamping: 2,
  };
  const { nodes, materials } = useGLTF(
    "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb"
  );
  const texture = useTexture(
    "https://cdn.ajnavidya.com/ajnavidya/Shubhamimgwithoutbg_1727939670430.png"
  );

  const logoTexture = useTexture(
    "https://cdn.ajnavidya.com/ajnavidya/Screenshot20241003131232_1727941379358.png"
  );

  const backTexture = useTexture(
    "https://s3.ajnavidya.com/ajnalens/media/ajna-logo/AjnaLens_Logo%20Lockup-13-13.png"
  );

  // Ensure the texture wraps and repeats correctly
  logoTexture.wrapS = logoTexture.wrapT = THREE.RepeatWrapping;
  logoTexture.repeat.set(3, 1); // Adjust repeat based on band length and size

  const { width, height } = useThree((state) => state.size);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]); // prettier-ignore
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]); // prettier-ignore
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]); // prettier-ignore
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]); // prettier-ignore

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => void (document.body.style.cursor = "auto");
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      // Fix most of the jitter when over pulling the card
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation()
          );
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      // Calculate catmul curve
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));
      // Tilt it back towards the screen
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = "chordal";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => (
              e.target.releasePointerCapture(e.pointerId), drag(false)
            )}
            onPointerDown={(e) => (
              e.target.setPointerCapture(e.pointerId),
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              )
            )}
          >
            {/* Front side of the card */}
            <mesh geometry={nodes.card.geometry}>
              <shaderMaterial
                args={[
                  {
                    uniforms: {
                      uGradientStart: {
                        value: new THREE.Color("rgb(245, 141, 254)"),
                      },
                      uGradientEnd: {
                        value: new THREE.Color("rgb(108, 86, 251)"),
                      },
                      uAngle: { value: (118 * Math.PI) / 180 },
                    },
                    vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
                    fragmentShader: `
        uniform vec3 uGradientStart;
        uniform vec3 uGradientEnd;
        uniform float uAngle;
        varying vec2 vUv;

        void main() {
          // Calculate gradient effect
          float angle = uAngle;
          vec2 direction = vec2(cos(angle), sin(angle));
          float gradient = dot(vUv - vec2(0.5), direction) + 0.5;
          vec3 color = mix(uGradientStart, uGradientEnd, clamp(gradient, 0.0, 1.0));
          
          gl_FragColor = vec4(color, 0.95); // Add transparency for glass effect
        }
      `,
                    transparent: true,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.55,
                    roughness: 0.5,
                    metalness: 0.8,
                  },
                ]}
              />

              {/* Adding a white border */}
              <mesh position={[0, 0.65, -0.01]} scale={[0.75, 0.75, 0.75]}>
                <planeGeometry args={[0.6, 0.6]} />
                <meshBasicMaterial color="white" />
              </mesh>

              {/* Textured plane for the front side */}
              <mesh position={[0, 0.65, 0.01]} scale={[0.7, 0.7, 0.7]}>
                <planeGeometry args={[0.6, 0.6]} />
                <meshBasicMaterial map={texture} blendAlpha={true} />
              </mesh>

              {/* Text on the front */}
              <Text
                position={[0, 0.3, 0.02]}
                fontSize={0.07}
                color="white"
                maxWidth={1.5}
                anchorX="center"
                anchorY="middle"
              >
                Shubham Pawar
              </Text>
              <Text
                position={[0, 0.2, 0.02]}
                fontSize={0.07}
                color="white"
                maxWidth={1.5}
                anchorX="center"
                anchorY="middle"
              >
                SDE-1
              </Text>

              {/* Back side of the card */}
              <mesh
                position={[0, 0.65, -0.01]}
                scale={[0.75, 0.75, 0.75]}
                rotation={[0, Math.PI, 0]}
              >
                <planeGeometry args={[0.6, 0.6]} />
                <meshBasicMaterial map={backTexture} />{" "}
                {/* Applying the back texture */}
              </mesh>

              {/* Text on the back side */}
              <Text
                position={[0, 0.3, -0.02]} // Adjusted Z-position for backside text
                fontSize={0.08}
                color="white"
                maxWidth={1.5}
                anchorX="center"
                anchorY="middle"
                rotation={[0, Math.PI, 0]} // Rotating text to face backward
              >
                AjnaLens
              </Text>
            </mesh>

            {/* Metal clamps */}
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white" // Optional: base color
          depthTest={false}
          resolution={[width, height]}
          useMap={true} // Ensure useMap is true
          map={logoTexture} // Assign logo texture
          lineWidth={1} // Set line width as required
          repeat={[-3, 1]} // Adjust the repeat value as needed
        />
      </mesh>
    </>
  );
}
