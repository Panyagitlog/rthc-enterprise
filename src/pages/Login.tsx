// pages/Login.tsx - Enterprise AI Campus Edition
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, AlertCircle, Shield, Zap } from 'lucide-react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { Environment, Float, Effects, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// ============================================
// ENTERPRISE CAMPUS GENERATOR
// ============================================

// Building Generator - Creates modern office towers
function createBuilding(x: number, z: number, width: number, depth: number, height: number, color: string = '#e8edf2') {
  const group = new THREE.Group();
  
  // Main tower
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshPhysicalMaterial({
    color: color,
    roughness: 0.2,
    metalness: 0.7,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    transparent: true,
    opacity: 0.95,
  });
  const tower = new THREE.Mesh(geometry, material);
  tower.position.y = height / 2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Glass panels (window grid)
  const rows = Math.floor(height / 2.5);
  const cols = Math.floor(Math.min(width, depth) / 1.5);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.3,
    emissive: '#4a9eff',
    emissiveIntensity: 0.1,
  });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        glassMat
      );
      const yPos = 1.5 + i * 2.2;
      const xPos = -width/2 + 0.8 + j * 1.4;
      glass.position.set(xPos, yPos, depth/2 + 0.01);
      group.add(glass);
    }
  }

  // Blue accent lines
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: '#2563eb',
    emissive: '#2563eb',
    emissiveIntensity: 0.3,
    roughness: 0.1,
    metalness: 0.9,
  });

  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.05, 0.05),
      accentMat
    );
    line.position.set(0, (i + 1) * (height / 4), depth/2 + 0.02);
    group.add(line);
  }

  return group;
}

// Data Center - Server racks with glowing lights
function createDataCenter(x: number, z: number) {
  const group = new THREE.Group();
  const rackMat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a2e',
    roughness: 0.3,
    metalness: 0.8,
  });
  const lightMat = new THREE.MeshPhysicalMaterial({
    color: '#00ff88',
    emissive: '#00ff88',
    emissiveIntensity: 0.5,
  });

  for (let i = 0; i < 8; i++) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 2.5, 0.8),
      rackMat
    );
    rack.position.set(i * 1.2 - 4.2, 1.25, 0);
    rack.castShadow = true;
    group.add(rack);

    // LED lights on each rack
    for (let j = 0; j < 6; j++) {
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        lightMat
      );
      led.position.set(i * 1.2 - 4.2, 0.3 + j * 0.4, 0.45);
      group.add(led);
    }
  }

  group.position.set(x, 0, z);
  return group;
}

// Communication Tower
function createCommsTower(x: number, z: number) {
  const group = new THREE.Group();
  const towerMat = new THREE.MeshPhysicalMaterial({
    color: '#c0c8d0',
    roughness: 0.2,
    metalness: 0.9,
  });

  // Main mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.3, 8, 8),
    towerMat
  );
  mast.position.y = 4;
  mast.castShadow = true;
  group.add(mast);

  // Cross beams
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.05),
      towerMat
    );
    beam.position.y = 1.5 + i * 2;
    group.add(beam);

    const beam2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 1.5),
      towerMat
    );
    beam2.position.y = 1.5 + i * 2;
    group.add(beam2);
  }

  // Antenna dish
  const dishMat = new THREE.MeshPhysicalMaterial({
    color: '#e8edf2',
    roughness: 0.1,
    metalness: 0.95,
  });
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16),
    dishMat
  );
  dish.position.set(0, 7.5, 0);
  dish.rotation.x = Math.PI / 2;
  group.add(dish);

  // Signal rings
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    emissive: '#4a9eff',
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5 + i * 0.3, 0.02, 8, 16),
      ringMat
    );
    ring.position.set(0, 7.5, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  group.position.set(x, 0, z);
  return group;
}

// Helipad with glowing landing pad
function createHelipad(x: number, z: number) {
  const group = new THREE.Group();
  
  const padMat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a2e',
    roughness: 0.3,
    metalness: 0.8,
  });
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16),
    padMat
  );
  pad.position.y = 0.1;
  pad.receiveShadow = true;
  group.add(pad);

  // Glowing ring
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: '#2563eb',
    emissive: '#2563eb',
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.5,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.05, 8, 16),
    ringMat
  );
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // H
  const hMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.2,
  });
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.6), hMat);
  h1.position.set(0, 0.25, 0);
  group.add(h1);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.6), hMat);
  h2.position.set(0, 0.25, 0);
  h2.rotation.y = Math.PI / 2;
  group.add(h2);

  group.position.set(x, 0, z);
  return group;
}

// Bridge with glass panels
function createBridge(x1: number, z1: number, x2: number, z2: number) {
  const group = new THREE.Group();
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  const floorMat = new THREE.MeshPhysicalMaterial({
    color: '#e8edf2',
    roughness: 0.2,
    metalness: 0.7,
    transparent: true,
    opacity: 0.8,
  });
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.1, length),
    floorMat
  );
  floor.position.set(midX, 0.5, midZ);
  floor.rotation.y = angle;
  floor.receiveShadow = true;
  group.add(floor);

  // Glass rails
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.2,
  });

  for (let side = -0.4; side <= 0.4; side += 0.8) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.5, length),
      glassMat
    );
    rail.position.set(midX + side * Math.cos(angle + Math.PI/2), 0.8, midZ + side * Math.sin(angle + Math.PI/2));
    rail.rotation.y = angle;
    group.add(rail);
  }

  return group;
}

// Solar roof panels
function createSolarRoof(x: number, z: number, width: number, depth: number) {
  const group = new THREE.Group();
  const panelMat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a2e',
    roughness: 0.1,
    metalness: 0.9,
    emissive: '#2563eb',
    emissiveIntensity: 0.05,
  });

  for (let i = 0; i < width / 1.2; i++) {
    for (let j = 0; j < depth / 1.2; j++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        panelMat
      );
      panel.position.set(x - width/2 + 0.6 + i * 1.2, 3.5, z - depth/2 + 0.6 + j * 1.2);
      panel.rotation.x = -Math.PI / 2;
      group.add(panel);
    }
  }

  return group;
}

// AI Core - Floating holographic sphere with rings
function createAICore(x: number, z: number) {
  const group = new THREE.Group();
  
  // Core sphere
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    emissive: '#4a9eff',
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.3,
  });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 32, 32),
    coreMat
  );
  core.position.y = 2;
  group.add(core);

  // Orbiting rings
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: '#00ff88',
    emissive: '#00ff88',
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2 + i * 0.3, 0.02, 8, 32),
      ringMat
    );
    ring.position.y = 2;
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    ring.rotation.z = i * 0.5;
    group.add(ring);
  }

  // Data particles around core
  const particleCount = 50;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.5 + Math.random() * 0.5;
    positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = 2 + r * Math.cos(phi);
    positions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: '#4a9eff',
    size: 0.03,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.position.y = 0;
  group.add(particles);

  group.position.set(x, 0, z);
  return group;
}

// Drone - Flying vehicle with rotors
function createDrone(x: number, z: number, y: number) {
  const group = new THREE.Group();
  
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#e8edf2',
    roughness: 0.2,
    metalness: 0.8,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.1, 0.6),
    bodyMat
  );
  body.castShadow = true;
  group.add(body);

  // Arms
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, 0.4),
      bodyMat
    );
    arm.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -angle;
    group.add(arm);

    // Rotor
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.01, 0.15),
      new THREE.MeshPhysicalMaterial({
        color: '#c0c8d0',
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.5,
      })
    );
    rotor.position.set(Math.cos(angle) * 0.5, 0.05, Math.sin(angle) * 0.5);
    group.add(rotor);
  }

  // LED
  const ledMat = new THREE.MeshPhysicalMaterial({
    color: '#00ff88',
    emissive: '#00ff88',
    emissiveIntensity: 0.8,
  });
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 6, 6),
    ledMat
  );
  led.position.set(0, 0.06, 0.3);
  group.add(led);

  group.position.set(x, y, z);
  return group;
}

// Autonomous Delivery Bot
function createDeliveryBot(x: number, z: number) {
  const group = new THREE.Group();
  
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.1,
    metalness: 0.9,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.4),
    bodyMat
  );
  body.position.y = 0.15;
  body.castShadow = true;
  group.add(body);

  // Wheels
  const wheelMat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a2e',
    roughness: 0.8,
    metalness: 0.2,
  });
  for (let i = -1; i <= 1; i+=2) {
    for (let j = -1; j <= 1; j+=2) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
        wheelMat
      );
      wheel.position.set(i * 0.18, 0.06, j * 0.18);
      wheel.rotation.x = Math.PI / 2;
      group.add(wheel);
    }
  }

  // Sensor
  const sensorMat = new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    emissive: '#4a9eff',
    emissiveIntensity: 0.3,
  });
  const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    sensorMat
  );
  sensor.position.set(0, 0.2, 0.22);
  group.add(sensor);

  group.position.set(x, 0, z);
  return group;
}

// ============================================
// MAIN 3D SCENE
// ============================================

function EnterpriseCampus({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);
  const drones = useRef<THREE.Group[]>([]);
  const botRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const coreRef = useRef<THREE.Group | null>(null);
  const hoverRef = useRef<THREE.Mesh | null>(null);

  // Generate campus buildings
  const campus = useMemo(() => {
    const group = new THREE.Group();

    // Main office towers
    const towerPositions = [
      [-5, -3, 1.2, 1.2, 5],
      [5, -3, 1.2, 1.2, 4.5],
      [-4, 5, 1.5, 1.5, 6],
      [6, 4, 1, 1, 4],
      [0, -5, 1.8, 1.8, 5.5],
      [-6, 2, 1, 1, 3.5],
      [7, -2, 1.2, 1.2, 4],
    ];

    towerPositions.forEach(([x, z, w, d, h]) => {
      const tower = createBuilding(x, z, w, d, h);
      group.add(tower);
    });

    // Data Centers
    group.add(createDataCenter(-7, -4));
    group.add(createDataCenter(7, -5));

    // Communication Towers
    group.add(createCommsTower(-4, -6));
    group.add(createCommsTower(4, -6));

    // Helipad
    group.add(createHelipad(0, 6));

    // Bridges
    group.add(createBridge(-2, 2, 2, 2));
    group.add(createBridge(-3, -2, -1, -1));

    // Solar roofs on some buildings
    group.add(createSolarRoof(-5, -3, 1.2, 1.2));
    group.add(createSolarRoof(5, -3, 1.2, 1.2));

    // AI Core
    const core = createAICore(-6, 3);
    coreRef.current = core;
    group.add(core);

    return group;
  }, []);

  // Drones
  const droneObjects = useMemo(() => {
    const drones = [];
    const positions = [
      [-3, 2, 3],
      [4, 1.5, -2],
      [-5, 2.5, -4],
      [6, 1.8, 3],
      [0, 2.2, 0],
    ];
    positions.forEach(([x, y, z]) => {
      const drone = createDrone(x, z, y);
      drones.push(drone);
    });
    return drones;
  }, []);

  // Delivery bots
  const bot = useMemo(() => {
    const bot = createDeliveryBot(3, 2);
    botRef.current = bot;
    return bot;
  }, []);

  // Particles - Digital dust and energy
  const particleSystem = useMemo(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i*3] = (Math.random() - 0.5) * 40;
      positions[i*3+1] = (Math.random() - 0.5) * 15 + 3;
      positions[i*3+2] = (Math.random() - 0.5) * 40;
      
      colors[i*3] = 0.2 + Math.random() * 0.3;
      colors[i*3+1] = 0.5 + Math.random() * 0.4;
      colors[i*3+2] = 0.8 + Math.random() * 0.2;
      
      velocities[i*3] = (Math.random() - 0.5) * 0.02;
      velocities[i*3+1] = (Math.random() - 0.5) * 0.02;
      velocities[i*3+2] = (Math.random() - 0.5) * 0.02;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.userData.velocities = velocities;

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    particlesRef.current = points;
    return points;
  }, []);

  // Hover effect plane
  const hoverPlane = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#4a9eff',
      emissive: '#4a9eff',
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    hoverRef.current = mesh;
    return mesh;
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    time.current = elapsed;

    // Animate campus
    if (groupRef.current) {
      groupRef.current.rotation.y = mouseX * 0.15;
      groupRef.current.position.x = mouseX * 0.3;
      groupRef.current.position.z = mouseY * 0.2;
    }

    // Animate drones
    droneObjects.forEach((drone, index) => {
      const speed = 0.3 + index * 0.05;
      const radius = 3 + index * 0.5;
      const phase = index * 1.2;
      
      drone.position.x += Math.sin(elapsed * speed + phase) * 0.008;
      drone.position.z += Math.cos(elapsed * speed * 0.7 + phase) * 0.008;
      drone.position.y += Math.sin(elapsed * speed * 0.5 + phase) * 0.005;
      
      drone.rotation.y += 0.02;
      drone.rotation.x = Math.sin(elapsed * 0.5 + phase) * 0.05;
    });

    // Animate bot
    if (botRef.current) {
      botRef.current.position.x += Math.sin(elapsed * 0.2) * 0.005;
      botRef.current.position.z += Math.cos(elapsed * 0.15) * 0.005;
      botRef.current.rotation.y += 0.01;
    }

    // Animate AI Core
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.01;
      coreRef.current.position.y = 0.5 + Math.sin(elapsed * 0.3) * 0.2;
    }

    // Animate particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const velocities = particlesRef.current.geometry.userData.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] + Math.sin(elapsed + i) * 0.001;
        positions[i+1] += velocities[i+1] + Math.cos(elapsed * 0.5 + i) * 0.001;
        positions[i+2] += velocities[i+2] + Math.sin(elapsed * 0.7 + i) * 0.001;
        
        // Wrap around
        if (positions[i] > 20) positions[i] = -20;
        if (positions[i] < -20) positions[i] = 20;
        if (positions[i+1] > 10) positions[i+1] = -5;
        if (positions[i+1] < -5) positions[i+1] = 10;
        if (positions[i+2] > 20) positions[i+2] = -20;
        if (positions[i+2] < -20) positions[i+2] = 20;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate hover plane
    if (hoverRef.current) {
      hoverRef.current.position.x = mouseX * 2;
      hoverRef.current.position.z = mouseY * 2;
      hoverRef.current.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.2);
    }

    // Animate communication tower rings
    groupRef.current?.children.forEach(child => {
      if (child.type === 'Group') {
        child.children.forEach(subchild => {
          if (subchild.type === 'Mesh' && subchild.geometry.type === 'TorusGeometry') {
            subchild.rotation.z += 0.01;
          }
        });
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Ground plane with reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshPhysicalMaterial 
          color="#f0f4f8"
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.7}
          envMapIntensity={1}
        />
      </mesh>

      {/* Campus */}
      <primitive object={campus} />

      {/* Drones */}
      {droneObjects.map((drone, i) => (
        <primitive key={i} object={drone} />
      ))}

      {/* Delivery Bot */}
      <primitive object={bot} />

      {/* Particles */}
      <primitive object={particleSystem} />

      {/* Hover effect */}
      <primitive object={hoverPlane} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#88bbff" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#2563eb" />
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#00ff88" />
      
      {/* Volumetric fog */}
      <fog attach="fog" args={['#e8ecf0', 15, 35]} />
    </group>
  );
}

// ============================================
// POST-PROCESSING
// ============================================

function PostProcessing() {
  const composer = useRef<EffectComposer | null>(null);
  const { scene, camera, gl } = useThree();

  useEffect(() => {
    composer.current = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.current.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,
      0.1,
      0.1
    );
    composer.current.addPass(bloomPass);

    return () => {
      composer.current?.dispose();
    };
  }, [scene, camera, gl]);

  useFrame(() => {
    composer.current?.render();
  }, 1);

  return null;
}

// ============================================
// MAIN LOGIN COMPONENT
// ============================================

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // EXISTING AUTH LOGIC - COMPLETELY UNTOUCHED
  const redirectBasedOnRole = (role: string) => {
    console.log('🔍 Redirecting with role:', role);
    
    if (!role) {
      console.error('❌ Role is null or undefined');
      toast.error('No role assigned. Contact Administrator.');
      return;
    }

    const normalizedRole = role.toUpperCase();
    console.log('📌 Normalized role:', normalizedRole);

    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        navigate('/dashboard', { replace: true });
        break;
      case 'AREA_ADMIN':
        navigate('/areadashboard', { replace: true });
        break;
      case 'COORDINATOR':
        navigate('/coordinator', { replace: true });
        break;
      default:
        console.error('❌ Unknown role:', role);
        toast.error(`Unknown role: ${role}. Please contact support.`);
        supabase.auth.signOut();
        break;
    }
  };

  // EXISTING SESSION CHECK
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('auth_user_id', session.user.id)
            .single();

          if (profile) {
            redirectBasedOnRole(profile.role);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    checkSession();
  }, []);

  // Mouse tracking for 3D interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouseX(x);
      setMouseY(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Card tilt effect
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleCardMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      
      card.style.transform = `
        perspective(1000px)
        rotateY(${x * 6}deg)
        rotateX(${-y * 6}deg)
        translateY(${y * -4}px)
      `;
    };

    card.addEventListener('mousemove', handleCardMove);
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)';
    });

    return () => {
      card.removeEventListener('mousemove', handleCardMove);
      card.removeEventListener('mouseleave', () => {});
    };
  }, []);

  // EXISTING LOGIN HANDLER - COMPLETELY UNTOUCHED
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login for:', email);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address.');
        }
        throw new Error(authError.message);
      }

      console.log('✅ Auth successful for user:', data.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        await supabase.auth.signOut();
        throw new Error('No profile found. Contact Administrator.');
      }

      console.log('📋 Profile found:', profile);
      console.log('👤 Role from database:', profile.role);

      if (profile.status !== 'ACTIVE') {
        console.error('❌ Account not active:', profile.status);
        await supabase.auth.signOut();
        throw new Error('Your account has been disabled.');
      }

      if (!profile.role) {
        console.error('❌ Role is null for user:', profile);
        await supabase.auth.signOut();
        throw new Error('No role assigned. Contact Administrator.');
      }

      toast.success(`Welcome back, ${profile.name || 'User'}!`);
      redirectBasedOnRole(profile.role);

    } catch (err: any) {
      console.error('❌ Login error:', err);
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e8ecf0]">
      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [12, 8, 12], fov: 40 }}
          dpr={[1, 2]}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          shadows
          onCreated={() => setIsSceneReady(true)}
        >
          <color attach="background" args={['#e8ecf0']} />
          <EnterpriseCampus mouseX={mouseX} mouseY={mouseY} />
          <PostProcessing />
          <Environment preset="city" background={false} />
        </Canvas>
      </div>

      {/* Login Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 1, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2
          }}
          className="pointer-events-auto w-[440px] max-w-[92vw] transition-transform duration-300 ease-out"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="relative rounded-[32px] p-8 backdrop-blur-2xl bg-white/30 border border-white/40 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.5)_inset]">
            
            {/* Glow border effect */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-xl" />
            
            {/* Logo */}
            <div className="relative flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Shield className="text-white" size={28} />
              </div>
              <div>
                <span className="text-3xl font-bold text-gray-900 tracking-tight">RTHC</span>
                <p className="text-[10px] text-gray-400 font-semibold tracking-[0.2em] uppercase">Real Time Head Count</p>
              </div>
            </div>

            {/* Welcome */}
            <div className="relative mb-8">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Enterprise platform access
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="relative space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200/60 bg-white/40 backdrop-blur-sm text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200/60 bg-white/40 backdrop-blur-sm text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-2 transition"
                    disabled={loading}
                  />
                  <span className="font-medium group-hover:text-gray-900 transition">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                  onClick={() => toast.info('Password reset feature coming soon')}
                >
                  Forgot Password?
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100/60"
                  >
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700 font-medium">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30"
              >
                <span className="relative flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Sign In</span>
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white/40 backdrop-blur-sm text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="relative grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-gray-200/50 bg-white/30 backdrop-blur-sm text-sm font-medium text-gray-700 hover:bg-white/50 hover:border-gray-300 transition-all"
                onClick={() => toast.info('Microsoft SSO coming soon')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.04-3.91 1.184-4.96 3.008-2.117 3.656-.54 9.064 1.52 12.03 1.008 1.456 2.208 3.086 3.792 3.024 1.52-.064 2.096-.984 3.936-.984 1.824 0 2.336.984 3.92.944 1.616-.04 2.64-1.472 3.648-2.928 1.136-1.632 1.6-3.216 1.632-3.296-.032-.016-3.136-1.2-3.168-4.768-.032-2.992 2.432-4.416 2.544-4.496-1.392-2.048-3.552-2.288-4.304-2.288-1.92-.032-2.992 1.072-3.968 1.072z"/>
                </svg>
                Microsoft
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-gray-200/50 bg-white/30 backdrop-blur-sm text-sm font-medium text-gray-700 hover:bg-white/50 hover:border-gray-300 transition-all"
                onClick={() => toast.info('Google SSO coming soon')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.478,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Google
              </button>
            </div>

            {/* Footer */}
            <div className="relative mt-6 pt-4 border-t border-gray-200/30 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium tracking-wider">
                Version {version}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-300 font-semibold tracking-widest">
                <Zap size={10} className="text-blue-500" />
                POWERED BY DMCFS
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}