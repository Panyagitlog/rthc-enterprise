import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  User, 
  ChevronDown,
  Home,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  CreditCard,
  BarChart3,
  Calendar,
  Mail,
  MessageSquare,
  FolderKanban,
  Zap,
  Sparkles
} from 'lucide-react';

// --- Types ---
interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// --- Navigation Items ---
const navItems: NavItem[] = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/' },
  { name: 'Analytics', icon: <BarChart3 size={20} />, href: '/analytics' },
  { name: 'Projects', icon: <FolderKanban size={20} />, href: '/projects', badge: 12 },
  { name: 'Team', icon: <Users size={20} />, href: '/team' },
  { name: 'Messages', icon: <MessageSquare size={20} />, href: '/messages', badge: 5 },
  { name: 'Calendar', icon: <Calendar size={20} />, href: '/calendar' },
  { name: 'Documents', icon: <FileText size={20} />, href: '/documents' },
  { name: 'Settings', icon: <Settings size={20} />, href: '/settings' },
];

// --- Main Component ---
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Responsive ---
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Mouse Parallax ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // --- Sidebar Variants ---
  const sidebarVariants = {
    open: { 
      x: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 } 
    },
    closed: { 
      x: '-100%', 
      opacity: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 } 
    }
  };

  const overlayVariants = {
    open: { opacity: 1, pointerEvents: 'auto' as const },
    closed: { opacity: 0, pointerEvents: 'none' as const }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(120, 119, 198, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255, 119, 119, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(119, 200, 255, 0.06) 0%, transparent 50%), #f8fafc'
      }}
    >
      {/* --- Mouse Parallax Background Orbs --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl"
          animate={{
            x: mousePosition.x * -20,
            y: mousePosition.y * -20,
          }}
          transition={{ type: 'tween', ease: 'easeOut', duration: 1.5 }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-blue-200/25 blur-3xl"
          animate={{
            x: mousePosition.x * 15,
            y: mousePosition.y * -15,
          }}
          transition={{ type: 'tween', ease: 'easeOut', duration: 1.5 }}
        />
        <motion.div
          className="absolute bottom-20 left-1/3 w-72 h-72 rounded-full bg-pink-200/20 blur-3xl"
          animate={{
            x: mousePosition.x * -10,
            y: mousePosition.y * 20,
          }}
          transition={{ type: 'tween', ease: 'easeOut', duration: 1.5 }}
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[100px]" />
      </div>

      {/* --- Floating Sidebar --- */}
      <AnimatePresence>
        {(isSidebarOpen || !isMobile) && (
          <>
            {/* Mobile Overlay */}
            {isMobile && (
              <motion.div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                variants={overlayVariants}
                initial="closed"
                animate="open"
                exit="closed"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            <motion.aside
              className={`fixed left-3 top-3 bottom-3 z-50 w-[280px] rounded-2xl flex flex-col ${
                isMobile ? 'left-0 top-0 bottom-0 rounded-none w-[300px]' : ''
              }`}
              variants={sidebarVariants}
              initial={isMobile ? 'closed' : 'open'}
              animate={isSidebarOpen ? 'open' : 'closed'}
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(1.8)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-200/50">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <span className="text-lg font-semibold text-slate-800 tracking-tight">Acme</span>
                </div>
                {isMobile && (
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group relative"
                      style={{
                        background: 'transparent',
                        backdropFilter: 'none',
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                          {item.icon}
                        </span>
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.a>
                  ))}
                </div>

                {/* Bottom Section */}
                <div className="mt-8 pt-6 border-t border-white/30">
                  <a 
                    href="/help" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <HelpCircle size={20} className="text-slate-400" />
                    Help & Resources
                  </a>
                  <a 
                    href="/logout" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={20} className="text-slate-400" />
                    Logout
                  </a>
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- Main Content --- */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarOpen && !isMobile ? 'ml-[300px]' : 'ml-0'
        }`}
      >
        {/* --- Sticky Glass Header --- */}
        <header 
          className="sticky top-0 z-30 px-4 md:px-6 lg:px-8"
          style={{
            background: 'rgba(248, 250, 252, 0.72)',
            backdropFilter: 'blur(16px) saturate(1.8)',
            borderBottom: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
          }}
        >
          <div className="max-w-[1700px] mx-auto h-16 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-3">
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <Menu size={22} className="text-slate-600" />
                </button>
              )}
              <div className="relative hidden sm:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-9 pr-4 py-2 text-sm rounded-xl border-0 bg-white/60 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-400/50 transition-shadow"
                  style={{
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/50 shadow-sm"
              >
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/50 shadow-sm"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                  JD
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* --- Page Content --- */}
        <main className="px-4 md:px-6 lg:px-8 py-6">
          <div className="max-w-[1700px] mx-auto">
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;