// ThreeScene.jsx - Fixed with proper imports
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// Simplified building generator for better performance
function createBuilding(x, z, w, d, h) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#e8edf2',
    roughness: 0.2,
    metalness: 0.7,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.9,
    envMapIntensity: 1.2,
  });
  const tower = new THREE.Mesh(geometry, material);
  tower.position.y = h / 2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  group.position.set(x, 0, z);
  return group;
}

// Simplified AI Core
function createAICore(x, z) {
  const group = new THREE.Group();
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    emissive: '#4a9eff',
    emissiveIntensity: 0.2,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.15,
    envMapIntensity: 2,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), coreMat);
  core.position.y = 2.5;
  group.add(core);
  
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    emissive: '#4a9eff',
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.9,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.015, 8, 48), ringMat);
  ring.position.y = 2.5;
  ring.rotation.x = Math.PI / 3;
  ring.userData = { speed: 0.3 };
  group.add(ring);
  
  group.position.set(x, 0, z);
  return group;
}

// Main Scene Component
function EnterpriseScene({ mouseX, mouseY }) {
  const groupRef = useRef();
  const coreRef = useRef(null);
  
  const campus = useMemo(() => {
    const group = new THREE.Group();
    const towerConfigs = [
      { x: -4, z: -3, w: 1.2, d: 1.2, h: 5 },
      { x: 4, z: -3, w: 1.2, d: 1.2, h: 4.5 },
      { x: -3, z: 4, w: 1.5, d: 1.5, h: 6 },
      { x: 5, z: 3, w: 1, d: 1, h: 4 },
      { x: 0, z: -4, w: 1.8, d: 1.8, h: 5.5 },
    ];
    towerConfigs.forEach(config => {
      group.add(createBuilding(config.x, config.z, config.w, config.d, config.h));
    });
    const core = createAICore(-5, 3);
    coreRef.current = core;
    group.add(core);
    return group;
  }, []);

  // Particle system - simplified
  const particleSystem = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = 2 + radius * Math.cos(phi) * 0.3;
      positions[i*3+2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: '#4a9eff',
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = mouseX * 0.1;
      groupRef.current.position.x = mouseX * 0.2;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
      coreRef.current.children.forEach(child => {
        if (child.type === 'Mesh' && child.geometry.type === 'TorusGeometry') {
          child.rotation.x += 0.01 * (child.userData.speed || 0.3);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow>
        <planeGeometry args={[40,40]} />
        <meshPhysicalMaterial color="#f0f4f8" roughness={0.05} metalness={0.95} transparent opacity={0.7} />
      </mesh>
      <gridHelper args={[30,15,'#2563eb','#4a9eff']} position={[0,0.01,0]} />
      <primitive object={campus} />
      <primitive object={particleSystem} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10,15,10]} intensity={1.2} castShadow shadow-mapSize={[1024,1024]} color="#ffffff" />
      <directionalLight position={[-8,5,-8]} intensity={0.3} color="#88bbff" />
      <pointLight position={[0,12,0]} intensity={0.2} color="#2563eb" />
      <fog attach="fog" args={['#e8ecf0',18,35]} />
    </group>
  );
}

// Post-processing
function PostProcessing() {
  const composer = useRef(null);
  const { scene, camera, gl } = useThree();
  
  useEffect(() => {
    composer.current = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.current.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, 0.15, 0.1
    );
    composer.current.addPass(bloomPass);
    return () => composer.current?.dispose();
  }, [scene, camera, gl]);
  
  useFrame(() => composer.current?.render(), 1);
  return null;
}

// Main ThreeScene Component
export default function ThreeScene({ onReady }) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouseX(x);
      setMouseY(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [12, 8, 12], fov: 35 }}
      dpr={[1, 1.5]}
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      shadows
      onCreated={() => onReady && onReady()}
    >
      <color attach="background" args={['#e8ecf0']} />
      <EnterpriseScene mouseX={mouseX} mouseY={mouseY} />
      <PostProcessing />
      <Environment preset="city" background={false} />
    </Canvas>
  );
}