// Scene.jsx - Optimized 3D Scene
import React, { useMemo, useRef, memo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// Memoized Building
const Building = memo(({ x, z, w, d, h, color = '#f0f4f8' }) => {
  const geometry = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,
    metalness: 0.85,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.92,
    envMapIntensity: 1.2,
  }), [color]);

  return (
    <mesh 
      geometry={geometry}
      material={material}
      position={[x, h/2, z]}
      castShadow
      receiveShadow
    />
  );
});

// Optimized Scene
const EnterpriseScene = memo(({ mouseX, mouseY }) => {
  const groupRef = useRef();
  
  const buildings = useMemo(() => {
    const configs = [
      { x: -5, z: -3, w: 1.2, d: 1.2, h: 5.5 },
      { x: 5, z: -3, w: 1.2, d: 1.2, h: 5 },
      { x: -4, z: 5, w: 1.5, d: 1.5, h: 6.5 },
      { x: 6, z: 4, w: 1, d: 1, h: 4.5 },
      { x: 0, z: -5, w: 1.8, d: 1.8, h: 6 },
    ];
    return configs.map((config, i) => (
      <Building key={i} {...config} />
    ));
  }, []);

  const particles = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 12;
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
      size: 0.03,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (groupRef.current) {
      const targetRot = mouseX * 0.05;
      const targetPosX = mouseX * 0.1;
      const targetPosZ = mouseY * 0.08;
      
      groupRef.current.rotation.y += (targetRot - groupRef.current.rotation.y) * 0.05;
      groupRef.current.position.x += (targetPosX - groupRef.current.position.x) * 0.05;
      groupRef.current.position.z += (targetPosZ - groupRef.current.position.z) * 0.05;
    }

    if (particles) {
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(elapsed * 0.2 + i) * 0.0005;
        positions[i+1] += Math.cos(elapsed * 0.3 + i) * 0.0005;
        positions[i+2] += Math.sin(elapsed * 0.15 + i) * 0.0005;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow>
        <planeGeometry args={[40,40]} />
        <meshPhysicalMaterial 
          color="#f8fafc" 
          roughness={0.05} 
          metalness={0.95} 
          transparent 
          opacity={0.9} 
          envMapIntensity={1.2} 
        />
      </mesh>
      <gridHelper args={[30,15,'#2563eb20','#4a9eff20']} position={[0,0.01,0]} />
      {buildings}
      <primitive object={particles} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10,15,8]} intensity={0.8} castShadow shadow-mapSize={[1024,1024]} color="#ffffff" />
      <directionalLight position={[-8,5,-8]} intensity={0.2} color="#88bbff" />
      <pointLight position={[0,12,0]} intensity={0.1} color="#2563eb" />
      <fog attach="fog" args={['#f8fafc',18,35]} />
    </group>
  );
});

// Post Processing
const PostProcessing = memo(() => {
  const composer = useRef(null);
  const { scene, camera, gl } = useThree();

  useEffect(() => {
    composer.current = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.current.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.15, 0.1, 0.05
    );
    composer.current.addPass(bloomPass);

    return () => composer.current?.dispose();
  }, [scene, camera, gl]);

  useFrame(() => composer.current?.render(), 1);
  return null;
});

// Main Scene Component
const Scene = memo(() => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    let frameId = null;
    
    const handleMouseMove = (e) => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        setMouseX(x);
        setMouseY(y);
        frameId = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [12, 8, 12], fov: 40 }}
      dpr={[1, 1.2]}
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.8,
      }}
      shadows
    >
      <color attach="background" args={['#f8fafc']} />
      <EnterpriseScene mouseX={mouseX} mouseY={mouseY} />
      <PostProcessing />
      <Environment preset="city" background={false} />
    </Canvas>
  );
});

export default Scene;