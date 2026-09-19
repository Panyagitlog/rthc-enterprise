import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  LayoutDashboard,
  Building,
  MapPinned,
  UserCog,
  Users,
  FileBarChart,
  BarChart3,
  History,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../../services/supabase";
import DMCFSLogo from "../brand/DMCFSLogo";

// Types
interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

// ALL NAVIGATION ITEMS - COMPLETELY PRESERVED
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Companies", icon: Building, path: "/companies" },
  { label: "Locations", icon: MapPinned, path: "/locations" },
  { label: "Coordinators", icon: UserCog, path: "/coordinators" },
  { label: "Head Count", icon: Users, path: "/headcount" },
  { label: "Reports", icon: FileBarChart, path: "/reports" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Audit Logs", icon: History, path: "/audit-logs" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Custom hook for mouse position tracking
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return mousePosition;
};

// Navigation Item Component - ENTERPRISE GRADE
const NavItem: React.FC<{
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  index: number;
}> = ({ item, active, collapsed, onCloseMobile, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setTimeout(() => setRipple(null), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      onMouseEnter={() => collapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        to={item.path}
        onClick={() => {
          onCloseMobile();
          handleClick as any;
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative block"
        aria-label={item.label}
        role="menuitem"
      >
        <motion.div
          className={`relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
            active
              ? "bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-purple-600/15 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/5"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          style={{
            perspective: "1200px",
          }}
          animate={
            isHovered && !collapsed
              ? {
                  y: -2,
                  scale: 1.01,
                  rotateX: 1.5,
                  rotateY: -1.5,
                  z: 10,
                }
              : {
                  y: 0,
                  scale: 1,
                  rotateX: 0,
                  rotateY: 0,
                  z: 0,
                }
          }
          transition={{ type: "spring", stiffness: 550, damping: 28, mass: 0.5 }}
        >
          {/* Glass background */}
          <div
            className={`absolute inset-0 rounded-xl transition-all duration-200 ${
              isHovered
                ? "bg-white/60 backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:bg-slate-800/60 dark:shadow-slate-900/40"
                : active
                  ? "bg-white/40 backdrop-blur-md dark:bg-slate-800/40"
                  : "bg-transparent"
            }`}
          />

          {/* Active indicator with pulse */}
          {active && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-gradient-to-b from-blue-600 to-purple-600"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 30, mass: 0.5 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-blue-600"
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}

          {/* Ripple effect */}
          {ripple && (
            <motion.span
              className="absolute inset-0 overflow-hidden rounded-xl"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span
                className="absolute h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                }}
              />
            </motion.span>
          )}

          {/* Icon with animation */}
          <motion.div
            className="relative z-10"
            animate={
              isHovered
                ? {
                    scale: 1.05,
                    rotate: [0, -2, 2, -2, 0],
                  }
                : active
                  ? {
                      scale: [1, 1.05, 1],
                    }
                  : { scale: 1, rotate: 0 }
            }
            transition={{
              rotate: { duration: 0.3, ease: "easeInOut" },
              scale: { type: "spring", stiffness: 550, damping: 28, mass: 0.5 },
            }}
          >
            <item.icon
              className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                active
                  ? "text-blue-600 dark:text-blue-300"
                  : isHovered
                    ? "text-blue-600 dark:text-blue-400"
                    : ""
              }`}
            />
          </motion.div>

          {/* Label */}
          {!collapsed && (
            <motion.span
              className="relative z-10 truncate tracking-wide"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.12 }}
            >
              {item.label}
            </motion.span>
          )}

          {/* Active dot with pulse */}
          {active && !collapsed && (
            <motion.span
              className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm shadow-blue-500/30"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Glow effect on hover */}
          {isHovered && !collapsed && (
            <motion.div
              className="absolute -inset-px rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Tooltip for collapsed mode */}
          {collapsed && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 16, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="absolute left-full top-1/2 z-50 -translate-y-1/2"
            >
              <div className="ml-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-xl backdrop-blur-xl dark:bg-slate-800/95 dark:text-white">
                {item.label}
                <div className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white/95 dark:bg-slate-800/95" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
};

// Sidebar Header Component
const SidebarHeader: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  return (
    <div className="flex h-16 items-center border-b border-white/10 px-4 dark:border-white/5">
      <div className="flex w-full items-center gap-3">
        {/* Logo Container */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-lg" />
          <DMCFSLogo variant={collapsed ? "mark" : "full"} size="sm" className={collapsed ? "relative" : "relative w-[150px]"} />

          <div className="absolute -right-0.5 -top-0.5">
            <div className="relative">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/30" />
              <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse opacity-50" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.12 }}
            className="min-w-0 flex-1"
          >
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                RTHC
              </span>
              <Sparkles className="h-3 w-3 text-blue-400/60" />
            </div>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400/70 dark:text-slate-500">
              Real-Time Head Count
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Main Sidebar Component
export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLElement>(null);
  const mousePosition = useMousePosition();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);

  useEffect(() => {
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      spotlightX.set(mousePosition.x - rect.left);
      spotlightY.set(mousePosition.y - rect.top);
    }
  }, [mousePosition, spotlightX, spotlightY]);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
            role="button"
            aria-label="Close sidebar"
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-60"}`}
        initial={false}
        animate={{
          width: collapsed ? "72px" : "240px",
        }}
        transition={{ type: "spring", stiffness: 550, damping: 28, mass: 0.5 }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="absolute inset-0 overflow-hidden rounded-r-2xl bg-white/80 backdrop-blur-2xl shadow-2xl shadow-slate-200/50 dark:bg-slate-950/80 dark:shadow-slate-900/50">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "256px 256px",
            }}
          />

          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 h-full w-full">
              <div className="absolute h-[500px] w-[500px] animate-orbit rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-[400px] w-[400px] animate-orbit-delayed rounded-full bg-purple-500/10 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] animate-orbit-slow rounded-full bg-cyan-500/5 blur-3xl" />
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
            style={{
              background: `radial-gradient(circle 400px at ${spotlightX.get()}px ${spotlightY.get()}px, rgba(99, 102, 241, 0.06) 0%, transparent 100%)`,
            }}
          />

          <div className="absolute inset-0 rounded-r-2xl border-r border-white/20 dark:border-white/5" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <SidebarHeader collapsed={collapsed} />

          <nav className="flex-1 overflow-y-auto px-2.5 py-4 custom-scrollbar" role="menu">
            <div className="space-y-1">
              {NAV_ITEMS.map((item, index) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={location.pathname === item.path}
                  collapsed={collapsed}
                  onCloseMobile={onCloseMobile}
                  index={index}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-white/20 p-2.5 dark:border-white/5">
            <div className="space-y-1.5">
              <motion.button
                onClick={onToggleCollapsed}
                className="hidden w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-white/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white lg:flex"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 550, damping: 28, mass: 0.5 }}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
                {!collapsed && "Collapse"}
              </motion.button>

              <motion.button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="group relative flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50/50 dark:text-red-400 dark:hover:bg-red-500/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 550, damping: 28, mass: 0.5 }}
                aria-label="Logout"
              >
                <div className="absolute inset-0 rounded-xl bg-red-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-100" />

                <motion.div
                  animate={isLoggingOut ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <LogOut className="relative h-5 w-5 shrink-0" />
                </motion.div>
                {!collapsed && (
                  <span className="relative">
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.aside>

      <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(100px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
        }
        @keyframes orbit-delayed {
          0% { transform: rotate(120deg) translateX(80px) rotate(-120deg); }
          100% { transform: rotate(480deg) translateX(80px) rotate(-480deg); }
        }
        @keyframes orbit-slow {
          0% { transform: rotate(240deg) translateX(60px) rotate(-240deg); }
          100% { transform: rotate(600deg) translateX(60px) rotate(-600deg); }
        }
        .animate-orbit {
          animation: orbit 20s linear infinite;
        }
        .animate-orbit-delayed {
          animation: orbit-delayed 25s linear infinite;
        }
        .animate-orbit-slow {
          animation: orbit-slow 30s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
      `}</style>
    </>
  );
}