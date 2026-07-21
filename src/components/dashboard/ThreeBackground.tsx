// src/components/dashboard/ThreeBackground.tsx
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// ---------- Primary particle sphere ----------
function PrimaryField() {
  const ref = useRef<THREE.Points>(null!);
  const count = 3000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.4 + Math.random() * 0.6;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    // Rotation
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.06;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.09;
    ref.current.rotation.z = state.clock.getElapsedTime() * 0.04;
    // Breathing size
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.size = 0.025 + 0.015 * Math.sin(state.clock.getElapsedTime() * 0.8);
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#a78bfa" // violet-400
        size={0.04}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ---------- Secondary ring (cyan, spinning on a different axis) ----------
function SecondaryRing() {
  const ref = useRef<THREE.Points>(null!);
  const count = 2000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.0 + Math.random() * 0.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 0.4; // thin disc
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.1;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    ref.current.rotation.z = state.clock.getElapsedTime() * 0.2;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.size = 0.02 + 0.01 * Math.sin(state.clock.getElapsedTime() * 1.2 + 1);
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#67e8f9" // cyan-300
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ---------- Main component ----------
export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0.2, 0.8, 4.5], fov: 55 }} // slightly tilted
      >
        <ambientLight intensity={0.6} />
        <PrimaryField />
        <SecondaryRing />
      </Canvas>
    </div>
  );
}