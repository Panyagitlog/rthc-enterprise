import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Circle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface DashboardKpiCardProps {
  /** The main title of the KPI card */
  title: string;
  /** The primary value to display */
  value: number | string;
  /** Icon component from Lucide React */
  icon: React.ElementType;
  /** Color scheme for the card accent */
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'gray';
  /** Optional description text below the value */
  description?: string;
  /** Percentage change value (e.g., 12.5 for 12.5%) */
  percentage?: number;
  /** Trend direction: up, down, or neutral */
  trend?: 'up' | 'down' | 'neutral';
  /** Loading state for skeleton */
  loading?: boolean;
  /** Shows live badge indicator */
  isLive?: boolean;
  /** Status indicator: success, warning, error, or info */
  status?: 'success' | 'warning' | 'error' | 'info';
  /** Click handler for the card */
  onClick?: () => void;
}

const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  description,
  percentage,
  trend,
  loading = false,
  isLive = false,
  status,
  onClick,
}) => {
  const [displayValue, setDisplayValue] = useState<string | number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const previousValueRef = useRef<number | string>(0);

  // Color mappings
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'hover:border-blue-200 dark:hover:border-blue-800',
      progress: 'bg-blue-500 dark:bg-blue-400',
      glow: 'shadow-blue-100 dark:shadow-blue-950/30',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      icon: 'text-green-600 dark:text-green-400',
      border: 'hover:border-green-200 dark:hover:border-green-800',
      progress: 'bg-green-500 dark:bg-green-400',
      glow: 'shadow-green-100 dark:shadow-green-950/30',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'hover:border-purple-200 dark:hover:border-purple-800',
      progress: 'bg-purple-500 dark:bg-purple-400',
      glow: 'shadow-purple-100 dark:shadow-purple-950/30',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      icon: 'text-red-600 dark:text-red-400',
      border: 'hover:border-red-200 dark:hover:border-red-800',
      progress: 'bg-red-500 dark:bg-red-400',
      glow: 'shadow-red-100 dark:shadow-red-950/30',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      icon: 'text-yellow-600 dark:text-yellow-400',
      border: 'hover:border-yellow-200 dark:hover:border-yellow-800',
      progress: 'bg-yellow-500 dark:bg-yellow-400',
      glow: 'shadow-yellow-100 dark:shadow-yellow-950/30',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      icon: 'text-indigo-600 dark:text-indigo-400',
      border: 'hover:border-indigo-200 dark:hover:border-indigo-800',
      progress: 'bg-indigo-500 dark:bg-indigo-400',
      glow: 'shadow-indigo-100 dark:shadow-indigo-950/30',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/30',
      icon: 'text-gray-600 dark:text-gray-400',
      border: 'hover:border-gray-200 dark:hover:border-gray-700',
      progress: 'bg-gray-500 dark:bg-gray-400',
      glow: 'shadow-gray-100 dark:shadow-gray-950/30',
    },
  };

  const colors = colorMap[color];

  // Status indicator colors
  const statusColorMap = {
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    error: 'text-red-500 dark:text-red-400',
    info: 'text-blue-500 dark:text-blue-400',
  };

  // Format value with compact notation
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toString();
  };

  // Animate counter
  useEffect(() => {
    if (loading) return;

    const numericValue = typeof value === 'number' ? value : 0;
    const startValue = typeof previousValueRef.current === 'number' 
      ? previousValueRef.current 
      : 0;
    
    if (numericValue === 0) {
      setDisplayValue('0');
      return;
    }

    const duration = 800;
    const startTime = Date.now();
    const difference = numericValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + difference * eased;
      
      setDisplayValue(formatValue(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(formatValue(numericValue));
        previousValueRef.current = numericValue;
      }
    };

    animate();
  }, [value, loading]);

  // Trend icon and color
  const getTrendIcon = () => {
    if (!trend) return null;
    const trendColors = {
      up: 'text-green-500 dark:text-green-400',
      down: 'text-red-500 dark:text-red-400',
      neutral: 'text-gray-400 dark:text-gray-500',
    };
    const icons = {
      up: <ArrowUp className={`w-4 h-4 ${trendColors.up}`} />,
      down: <ArrowDown className={`w-4 h-4 ${trendColors.down}`} />,
      neutral: <Minus className={`w-4 h-4 ${trendColors.neutral}`} />,
    };
    return icons[trend];
  };

  // Loading skeleton
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-red-800 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-6 shadow-xl ${colors.glow} ${colors.border} transition-all duration-300 ease-out cursor-pointer group`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${title}: ${value}`}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 dark:from-white/5 to-transparent opacity-50 pointer-events-none" />
      
      {/* Live badge */}
      {isLive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30"
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 animate-ping" />
          </div>
          <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
            LIVE
          </span>
        </motion.div>
      )}

      {/* Status indicator */}
      {status && (
        <div className="absolute top-4 right-4">
          <Circle
            className={`w-3 h-3 fill-current ${statusColorMap[status]} animate-pulse`}
          />
        </div>
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider truncate">
            {title}
          </h3>
          
          <div className="mt-2 flex items-baseline gap-3">
            <motion.span
              key={typeof displayValue === 'string' ? displayValue : displayValue.toString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
            >
              {displayValue}
            </motion.span>
            
            {percentage !== undefined && (
              <span className={`text-sm font-medium ${
                percentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
              </span>
            )}
          </div>

          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}
        </div>

        <motion.div
          whileHover={{ rotate: 10, scale: 1.1 }}
          className={`flex-shrink-0 ml-4 p-3 rounded-xl ${colors.bg} ${colors.icon} transition-colors duration-200`}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      </div>

      {/* Progress bar */}
      {percentage !== undefined && (
        <div className="relative mt-4">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${colors.progress}`}
            />
          </div>
        </div>
      )}

      {/* Trend indicator */}
      {trend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 right-4 flex items-center gap-1.5"
        >
          {getTrendIcon()}
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
          </span>
        </motion.div>
      )}

    </motion.div>
  );
};

export default DashboardKpiCard;