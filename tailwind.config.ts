import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#030d1a",
          900: "#071422",
          800: "#0d1f35",
          700: "#122947",
          600: "#1a3759",
        },
        "deep-blue": {
          DEFAULT: "#1e3a5f",
          light: "#2a4f7f",
          dark: "#162d4a",
        },
        teal: {
          DEFAULT: "#0d9488",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scan': 'scan 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #071422 0%, #122947 50%, #0d1f35 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(30,58,95,0.5) 0%, rgba(13,148,136,0.1) 100%)',
        'teal-gradient': 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
      },
      boxShadow: {
        'teal': '0 0 20px rgba(13, 148, 136, 0.3)',
        'teal-lg': '0 0 40px rgba(13, 148, 136, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(13, 148, 136, 0.15)',
      },
    },
  },
  plugins: [],
};
export default config;
