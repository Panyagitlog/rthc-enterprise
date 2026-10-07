// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        background: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
        },
        foreground: {
          DEFAULT: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
        },
        border: {
          DEFAULT: '#e2e8f0',
          strong: '#cbd5e1',
        },
        // Brand primary — matches the DMCFS logo orange (#FF6600)
        primary: {
          DEFAULT: '#FF6600',
          50: '#FFF3EA',
          100: '#FFE1C7',
          200: '#FFC28F',
          300: '#FFA157',
          400: '#FF8330',
          500: '#FF6600',
          600: '#E65C00',
          700: '#B84A00',
          800: '#8A3800',
          900: '#5C2500',
        },
      },
    },
  },
  plugins: [],
}