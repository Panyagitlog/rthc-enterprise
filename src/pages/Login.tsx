import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  isSupabaseConfigured,
  getDemoUser,
  setStoredSession,
  clearStoredSession,
  getStoredSession,
  getProfileFromUsersTable,
  normalizeRole,
} from '../services/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import DMCFSLogo from '../components/brand/DMCFSLogo';
import {
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Shield,
  Zap,
  Mail,
  Lock,
  ChevronRight,
  Fingerprint,
  Globe,
  Users,
  Activity,
  Cloud,
  Building2,
  CheckCircle,
  Network,
  Cpu,
  Radio,
  LockKeyhole,
  Server,
  UserCheck,
  MapPin,
  Boxes,
  ArrowRight,
  Loader2,
  Hexagon,
  CircleDot,
  Workflow,
  Database,
  KeyRound,
  BadgeCheck
} from 'lucide-react';

// ============================================
// ENTERPRISE NETWORK VISUALIZATION COMPONENT
// ============================================

interface Node {
  id: number;
  x: number;
  y: number;
  type: 'person' | 'location' | 'system' | 'operation';
  size: number;
}

interface Connection {
  from: number;
  to: number;
  strength: number;
}

const NetworkVisualization = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [particles, setParticles] = useState<{ x: number; y: number; speed: number; size: number }[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize network data
  useEffect(() => {
    const generateNodes = (): Node[] => {
      const nodeTypes: Node['type'][] = ['person', 'location', 'system', 'operation'];
      const generatedNodes: Node[] = [];
      const nodeCount = 18;
      
      // Central node (RTHC core)
      generatedNodes.push({
        id: 0,
        x: 50,
        y: 50,
        type: 'operation',
        size: 6
      });

      for (let i = 1; i < nodeCount; i++) {
        const angle = (i / (nodeCount - 1)) * Math.PI * 2;
        const radius = 20 + Math.random() * 28;
        generatedNodes.push({
          id: i,
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius * 0.8,
          type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
          size: Math.random() * 2.5 + 1.5
        });
      }
      return generatedNodes;
    };

    const generateConnections = (nodeList: Node[]): Connection[] => {
      const connectionList: Connection[] = [];
      
      // Connect central node to all others
      for (let i = 1; i < nodeList.length; i++) {
        connectionList.push({
          from: 0,
          to: i,
          strength: Math.random() * 0.5 + 0.3
        });
      }

      // Add some interconnections
      for (let i = 1; i < nodeList.length - 1; i++) {
        if (Math.random() > 0.6) {
          connectionList.push({
            from: i,
            to: i + 1,
            strength: Math.random() * 0.4 + 0.2
          });
        }
        if (Math.random() > 0.7 && i < nodeList.length - 3) {
          connectionList.push({
            from: i,
            to: i + 2,
            strength: Math.random() * 0.3 + 0.15
          });
        }
      }

      return connectionList;
    };

    const generateParticles = () => {
      return Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        speed: Math.random() * 0.1 + 0.05,
        size: Math.random() * 1.5 + 0.5
      }));
    };

    const nodeList = generateNodes();
    setNodes(nodeList);
    setConnections(generateConnections(nodeList));
    setParticles(generateParticles());
  }, []);

  // Canvas animation
  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const mouseX = mouseRef.current.x * rect.width;
      const mouseY = mouseRef.current.y * rect.height;

      // Draw grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.03)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < rect.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }

      // Draw connections
      connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const fromX = (fromNode.x / 100) * rect.width;
        const fromY = (fromNode.y / 100) * rect.height;
        const toX = (toNode.x / 100) * rect.width;
        const toY = (toNode.y / 100) * rect.height;

        // Mouse interaction
        const distToMouse = Math.sqrt(
          Math.pow((fromX + toX) / 2 - mouseX, 2) + 
          Math.pow((fromY + toY) / 2 - mouseY, 2)
        );
        const mouseInfluence = Math.max(0, 1 - distToMouse / 150);

        const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
        gradient.addColorStop(0, `rgba(37, 99, 235, ${0.1 + conn.strength * 0.2 + mouseInfluence * 0.3})`);
        gradient.addColorStop(0.5, `rgba(6, 182, 212, ${0.15 + conn.strength * 0.25 + mouseInfluence * 0.35})`);
        gradient.addColorStop(1, `rgba(37, 99, 235, ${0.1 + conn.strength * 0.2 + mouseInfluence * 0.3})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.8 + conn.strength * 0.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        // Bezier curve for elegant connections
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const curveOffset = Math.min(Math.abs(fromX - toX), Math.abs(fromY - toY)) * 0.15;
        ctx.quadraticCurveTo(midX, midY - curveOffset, toX, toY);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(node => {
        const x = (node.x / 100) * rect.width;
        const y = (node.y / 100) * rect.height;
        
        const distToMouse = Math.sqrt(Math.pow(x - mouseX, 2) + Math.pow(y - mouseY, 2));
        const mouseInfluence = Math.max(0, 1 - distToMouse / 100);

        // Glow effect
        const glowRadius = node.size * 8 + mouseInfluence * 15;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        
        if (node.type === 'operation') {
          glow.addColorStop(0, 'rgba(37, 99, 235, 0.8)');
          glow.addColorStop(0.3, 'rgba(37, 99, 235, 0.3)');
          glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
        } else if (node.type === 'person') {
          glow.addColorStop(0, 'rgba(6, 182, 212, 0.7)');
          glow.addColorStop(0.3, 'rgba(6, 182, 212, 0.25)');
          glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else if (node.type === 'location') {
          glow.addColorStop(0, 'rgba(99, 102, 241, 0.6)');
          glow.addColorStop(0.3, 'rgba(99, 102, 241, 0.2)');
          glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
        } else {
          glow.addColorStop(0, 'rgba(148, 163, 184, 0.5)');
          glow.addColorStop(0.3, 'rgba(148, 163, 184, 0.15)');
          glow.addColorStop(1, 'rgba(148, 163, 184, 0)');
        }

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Node circle
        const nodeColor = node.type === 'operation' ? '#3B82F6' :
                         node.type === 'person' ? '#06B6D4' :
                         node.type === 'location' ? '#6366F1' : '#94A3B8';
        
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(x, y, node.size * (1 + mouseInfluence * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x - node.size * 0.2, y - node.size * 0.2, node.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Ring for central node
        if (node.type === 'operation') {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, node.size * 2.5, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(x, y, node.size * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw particles
      const time = Date.now() * 0.001;
      particles.forEach((particle, index) => {
        const x = ((particle.x + Math.sin(time + index) * 0.5 + 100) % 100) * rect.width / 100;
        const y = ((particle.y + Math.cos(time * 0.7 + index) * 0.3 + 100) % 100) * rect.height / 100;
        
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let frameCount = 0;
    const animate = () => {
      frameCount++;
      // Limit to 30fps for performance
      if (frameCount % 2 === 0) {
        draw();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, connections, particles, reducedMotion]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.x = (e.clientX - rect.left) / rect.width;
        mouseRef.current.y = (e.clientY - rect.top) / rect.height;
        setMousePosition({ 
          x: mouseRef.current.x, 
          y: mouseRef.current.y 
        });
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ 
        opacity: reducedMotion ? 0.3 : 0.8,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
};

// ============================================
// OPERATIONAL STATUS INDICATOR
// ============================================

const OperationalStatus = () => {
  return (
    <div className="relative z-10 inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900/40 backdrop-blur-sm border border-slate-700/50">
      <div className="flex items-center gap-2">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <span className="text-xs font-semibold text-slate-200">SYSTEM OPERATIONAL</span>
      </div>
      <div className="w-px h-4 bg-slate-700"></div>
      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[10px] font-medium text-slate-400 tracking-wider">REAL-TIME WORKFORCE</span>
      </div>
    </div>
  );
};

// ============================================
// RTHC LOGO COMPONENT
// ============================================

const RTHCLogo = ({ size = 44 }: { size?: number }) => {
  return (
    <div 
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-600/20"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" stroke="white" strokeOpacity="0.4" strokeWidth="1" />
        <circle cx="12" cy="12" r="3" fill="white" />
        <circle cx="12" cy="3" r="1.5" fill="white" />
        <circle cx="21" cy="12" r="1.5" fill="white" />
        <circle cx="12" cy="21" r="1.5" fill="white" />
        <circle cx="3" cy="12" r="1.5" fill="white" />
        <line x1="12" y1="3" x2="12" y2="6" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="21" y1="12" x2="18" y2="12" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="12" y1="21" x2="12" y2="18" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="3" y1="12" x2="6" y2="12" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="12" y1="6" x2="16" y2="10" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
        <line x1="12" y1="18" x2="16" y2="14" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
        <line x1="8" y1="10" x2="12" y2="6" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
        <line x1="8" y1="14" x2="12" y2="18" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
      </svg>
    </div>
  );
};

// ============================================
// SECURITY INDICATORS COMPONENT
// ============================================

const SecurityIndicators = () => {
  const indicators = [
    { icon: KeyRound, label: 'Secure Authentication' },
    { icon: LockKeyhole, label: 'Encrypted Session' },
    { icon: BadgeCheck, label: 'Enterprise Access' }
  ];

  return (
    <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-slate-200">
      {indicators.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <div className="w-px h-8 bg-slate-200" />}
          <div className="flex items-center gap-2">
            <item.icon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

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
  const [authChecked, setAuthChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // ============================================
  // EXISTING AUTHENTICATION LOGIC
  // ============================================

  const redirectBasedOnRole = useCallback((role: string) => {
    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      toast.error('No role assigned. Contact Administrator.');
      return;
    }

    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        navigate('/app-select', { replace: true });
        break;
      case 'AREA_ADMIN':
        navigate('/areadashboard', { replace: true });
        break;
      case 'COORDINATOR':
        navigate('/coordinator', { replace: true });
        break;
      case 'AUDITOR':
        navigate('/rtcpm', { replace: true });
        break;
      default:
        toast.error(`Unknown role: ${role}. Please contact support.`);
        supabase.auth.signOut();
        break;
    }
  }, [navigate]);

  // Session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!isSupabaseConfigured) {
          const storedSession = getStoredSession();
          if (storedSession?.role) {
            redirectBasedOnRole(storedSession.role);
          }
          return;
        }

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
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, [redirectBasedOnRole]);

  // LOGIN HANDLER
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        const demoUser = getDemoUser(email, password);

        if (!demoUser) {
          throw new Error('Demo login failed. Use admin@dmcfs.in, fieldofficer@dmcfs.in, area@dmcfs.in, or coordinator@dmcfs.in with password admin123.');
        }

        setStoredSession(demoUser);
        toast.success(`Welcome back, ${demoUser.name}!`);
        setAccessGranted(true);

        setTimeout(() => {
          redirectBasedOnRole(demoUser.role);
        }, 400);

        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address. Check your inbox.');
        }
        throw new Error(authError.message);
      }

      if (!data || !data.user) {
        throw new Error('Authentication failed. Please try again.');
      }

      const profile = await getProfileFromUsersTable(data.user.id);

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('User profile not found. Contact Administrator.');
      }

      if (profile.status && profile.status.toUpperCase() !== 'ACTIVE') {
        await supabase.auth.signOut();
        throw new Error('Your account has been disabled. Contact Administrator.');
      }

      if (!profile.role) {
        await supabase.auth.signOut();
        throw new Error('No role assigned. Contact Administrator.');
      }

      toast.success(`Welcome back, ${profile.name || 'User'}!`);
      
      setAccessGranted(true);
      
      setTimeout(() => {
        redirectBasedOnRole(profile.role);
      }, 400);

    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const version = import.meta.env.VITE_APP_VERSION || '2.0.0';

  if (!authChecked) {
    return (
      <div className="w-full min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
              <DMCFSLogo variant="mark" size="md" />
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Checking secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-dvh overflow-hidden bg-(--color-canvas) text-(--color-text-primary) transition-colors">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.05),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(6,182,212,0.03),_transparent_50%)]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="relative flex min-h-dvh">
        {/* ============ LEFT VISUAL SECTION ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="hidden min-h-dvh lg:flex w-[55%] xl:w-[58%] flex-col justify-between bg-slate-950 relative overflow-hidden"
        >
          {/* Decorative gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl" />

          {/* Network visualization */}
          <div className="absolute inset-0">
            <NetworkVisualization />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
            {/* Top - Logo and branding */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              className="flex items-center gap-3"
            >
                <DMCFSLogo variant="mark" size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tracking-tight">RTHC</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                    DMCFS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase mt-0.5">
                  Real Time Head Count
                </p>
              </div>
            </motion.div>

            {/* Middle - Main message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
              className="max-w-md"
            >
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
                Workforce Intelligence
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  in Real-Time
                </span>
              </h1>
              <p className="text-slate-400 text-sm xl:text-base leading-relaxed">
                Enterprise-grade operational command center for managing distributed workforce across multiple locations.
              </p>
              
              <div className="flex flex-col gap-2 mt-6">
                {[
                  { icon: Users, text: 'Centralized headcount management' },
                  { icon: Network, text: 'Real-time location tracking' },
                  { icon: Database, text: 'Integrated enterprise systems' }
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                    className="flex items-center gap-2.5 text-slate-300"
                  >
                    <item.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Bottom - Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >
              <OperationalStatus />
              
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Enterprise Platform
                </span>
                <span className="w-px h-3 bg-slate-700" />
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  Version {version}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ============ RIGHT LOGIN SECTION ============ */}
        <div className="flex min-h-dvh flex-1 items-center justify-center bg-(--color-canvas) p-6 transition-colors sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px]"
          >
            {/* Logo for mobile */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <DMCFSLogo variant="mark" size="md" />
                <div>
                  <span className="text-xl font-bold text-(--color-text-primary) tracking-tight">RTHC</span>
                  <p className="text-[9px] text-slate-500 font-semibold tracking-[0.2em] uppercase dark:text-slate-400">
                    Real Time Head Count
                  </p>
                </div>
              </div>
            </div>

            {/* Welcome */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                Sign in to your workforce operations workspace.
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label 
                  htmlFor="email"
                  className={`block text-xs font-semibold mb-2 transition-colors duration-200 ${
                    focusedField === 'email' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Email address
                </label>
                <div className={`relative transition-all duration-200 ${
                  focusedField === 'email' ? 'scale-[1.01]' : ''
                }`}>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className={`w-4 h-4 transition-colors duration-200 ${
                      focusedField === 'email' ? 'text-blue-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className={`w-full h-[52px] pl-11 pr-4 rounded-xl border bg-(--color-card) text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) transition-all duration-200 outline-none ${
                      focusedField === 'email'
                        ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                        : 'border-(--color-border-strong) hover:border-(--color-primary)'
                    }`}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label 
                  htmlFor="password"
                  className={`block text-xs font-semibold mb-2 transition-colors duration-200 ${
                    focusedField === 'password' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Password
                </label>
                <div className={`relative transition-all duration-200 ${
                  focusedField === 'password' ? 'scale-[1.01]' : ''
                }`}>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className={`w-4 h-4 transition-colors duration-200 ${
                      focusedField === 'password' ? 'text-blue-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full h-[52px] pl-11 pr-12 rounded-xl border bg-(--color-card) text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) transition-all duration-200 outline-none ${
                      focusedField === 'password'
                        ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                        : 'border-(--color-border-strong) hover:border-(--color-primary)'
                    }`}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                    disabled={loading}
                  />
                  <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                    rememberMe 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-slate-300 group-hover:border-slate-400 dark:border-slate-600 dark:group-hover:border-slate-500'
                  }`}>
                    {rememberMe && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5.5L4 8L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  onClick={() => toast.info('Password reset feature coming soon')}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-100">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700 font-medium">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Access granted */}
              <AnimatePresence>
                {accessGranted && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-emerald-700 font-medium">Access granted</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign in button */}
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full h-[52px] rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                whileHover={{ scale: loading ? 1 : 1.005 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-300" />
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* Security indicators */}
            <SecurityIndicators />

            {/* Footer */}
            <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-400 font-medium">
              <span>Version {version}</span>
              <span className="w-px h-3 bg-slate-200" />
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-500" />
                DMCFS Enterprise
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}