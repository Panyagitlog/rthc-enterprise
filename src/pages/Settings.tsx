import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sun, Moon, Monitor, Check, Palette, Thermometer,
  Bell, Volume2, Globe, Shield, Eye, Layout, Type, Contrast
} from "lucide-react";

// ---------- Theme Types ----------
type ThemeMode = "system" | "light" | "dark";
type ColorScheme = "default" | "warm" | "cool" | "professional";
type AccentColor = "indigo" | "blue" | "emerald" | "rose" | "amber" | "violet";

interface Settings {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  accentColor: AccentColor;
  notifications: boolean;
  sound: boolean;
}

const defaultSettings: Settings = {
  themeMode: "system",
  colorScheme: "default",
  accentColor: "indigo",
  notifications: true,
  sound: false,
};

// Helper to save/load from localStorage
const loadSettings = (): Settings => {
  try {
    const saved = localStorage.getItem("rthc_settings");
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultSettings;
};

const saveSettings = (settings: Settings) => {
  localStorage.setItem("rthc_settings", JSON.stringify(settings));
};

// Apply settings to document
const applyTheme = (themeMode: ThemeMode, colorScheme: ColorScheme, accentColor: AccentColor) => {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-warm", "theme-cool", "theme-professional", "theme-default");
  root.classList.add(`theme-${colorScheme}`);

  // Remove previous accent classes
  const accentClasses = ["accent-indigo", "accent-blue", "accent-emerald", "accent-rose", "accent-amber", "accent-violet"];
  root.classList.remove(...accentClasses);
  root.classList.add(`accent-${accentColor}`);

  // Dark mode handling
  const applyDark = (dark: boolean) => {
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (themeMode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyDark(prefersDark);
  } else {
    applyDark(themeMode === "dark");
  }
};

// ---------- Component ----------
export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    applyTheme(settings.themeMode, settings.colorScheme, settings.accentColor);
    saveSettings(settings);
  }, [settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  // Accent color options
  const accentColors: { name: AccentColor; color: string; label: string }[] = [
    { name: "indigo", color: "bg-indigo-500", label: "Indigo" },
    { name: "blue", color: "bg-blue-500", label: "Blue" },
    { name: "emerald", color: "bg-emerald-500", label: "Emerald" },
    { name: "rose", color: "bg-rose-500", label: "Rose" },
    { name: "amber", color: "bg-amber-500", label: "Amber" },
    { name: "violet", color: "bg-violet-500", label: "Violet" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customise your experience across the platform.
          </p>
        </div>

        {/* Theme Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-500" />
              Appearance
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose your preferred theme, colour scheme, and accent colour.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Theme Mode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "system", icon: Monitor, label: "System" },
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => update("themeMode", value as ThemeMode)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      settings.themeMode === value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${
                      settings.themeMode === value ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                    }`} />
                    <span className={`text-sm font-medium ${
                      settings.themeMode === value ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colour Scheme */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-slate-400" />
                Colour Scheme (Temperature)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "default", label: "Default", gradient: "from-slate-100 to-slate-50" },
                  { value: "warm", label: "Warm", gradient: "from-amber-50 to-orange-50" },
                  { value: "cool", label: "Cool", gradient: "from-blue-50 to-indigo-50" },
                  { value: "professional", label: "Professional", gradient: "from-zinc-100 to-slate-200" },
                ].map(({ value, label, gradient }) => (
                  <button
                    key={value}
                    onClick={() => update("colorScheme", value as ColorScheme)}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      settings.colorScheme === value
                        ? "border-indigo-500 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`w-full h-12 rounded-lg bg-gradient-to-br ${gradient} mb-2`} />
                    <span className={`text-sm font-medium ${
                      settings.colorScheme === value ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"
                    }`}>
                      {label}
                    </span>
                    {settings.colorScheme === value && (
                      <Check className="absolute top-2 right-2 w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Colour */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Contrast className="w-4 h-4 text-slate-400" />
                Accent Colour
              </label>
              <div className="flex flex-wrap gap-3">
                {accentColors.map(({ name, color, label }) => (
                  <button
                    key={name}
                    onClick={() => update("accentColor", name)}
                    className={`w-12 h-12 rounded-full ${color} border-4 transition-all ${
                      settings.accentColor === name
                        ? "border-slate-900 dark:border-white scale-110 shadow-lg"
                        : "border-transparent hover:scale-105"
                    }`}
                    title={label}
                    aria-label={label}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {accentColors.map(({ name, label }) => (
                  <span
                    key={name}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      settings.accentColor === name
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              Preview
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              How your current settings will look.
            </p>
          </div>
          <div className="p-6 sm:p-8 flex flex-col gap-4">
            {/* Mock card using current theme */}
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-${settings.accentColor}-500`} />
                <div>
                  <div className="h-3 w-24 bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className={`h-8 w-16 rounded-lg bg-${settings.accentColor}-500`} />
                <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              This is a preview — buttons and controls will use your selected accent colour.
            </p>
          </div>
        </motion.div>

        {/* Other Preferences (optional but adds professionalism) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              Notifications & Sound
            </h2>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Push Notifications</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive real‑time alerts for headcount updates.
                </p>
              </div>
              <button
                onClick={() => update("notifications", !settings.notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  settings.notifications ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Interface Sounds</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Play sounds on submission, errors, and alerts.
                </p>
              </div>
              <button
                onClick={() => update("sound", !settings.sound)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.sound ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  settings.sound ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reset */}
        <div className="flex justify-end">
          <button
            onClick={resetToDefaults}
            className="text-sm text-slate-500 hover:text-rose-600 transition-colors underline underline-offset-4"
          >
            Reset to default settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}