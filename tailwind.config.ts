import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/flowbite-react/dist/esm/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Màu Background và thẻ
        bgApp: '#F4F7F4',      // Nền chính
        surface: '#FFFFFF',    // Màu thẻ (Card)

        // Primary: Xanh Mint (Phát triển, hoàn thành, nút chính)
        mint: {
          50: '#E8F8EE',       // Nền nhạt cho badge/tag (Done)
          100: '#D1F1DE',      // Hover cho nền nhạt
          400: '#47C77F',      // Màu viền (border) xanh
          500: '#1DB954',      // MÀU CHỦ ĐẠO - Nút chính
          600: '#179443',      // Hover cho nút chính
          700: '#116F32',      // Active (khi nhấn giữ nút)
        },
        primary: {
          DEFAULT: '#1DB954',
          50: '#E8F8EE',
          100: '#D1F1DE',
          400: '#47C77F',
          500: '#1DB954',
          600: '#179443',
          700: '#116F32',
        },

        // Secondary: Vàng Cát (Đang xử lý, cảnh báo, highlight)
        sand: {
          50: '#FEF9F0',       // Nền nhạt cho badge/tag (In Progress)
          100: '#FDF3E1',      // Hover cho nền nhạt
          500: '#F0C05A',      // MÀU PHỤ - Nút phụ / Warning
          600: '#D8AC51',      // Hover cho nút phụ
          700: '#A8863F',      // Text đậm trên nền vàng
        },

        // Neutral: Xám Rêu Than (Text, viền)
        moss: {
          50: '#f2f4f2',
          100: '#e1e6e0',
          200: '#c2cdc1',
          300: '#96a794',
          400: '#6c7d6b',
          500: '#4f5e4e',
          600: '#3d4a3c',
          700: '#323c31',
          800: '#2a3129',
          900: '#151916',
        },
        
        // Màu Đỏ Cam tươi
        coral: {
          50: '#FFF0F0',
          500: '#FF6B6B',
          600: '#E56060',
          700: '#CC4D4D',
          800: '#A43B3B',
          900: '#7A2B2B',
        },
        "background-light": "#F4F7F4",
        "background-dark": "#151916",
        "new-primary": "#34d399",
        "new-secondary": "#065f46",

        // Aliases for Jobs Dashboard custom CSS classes
        "on-surface": '#151916', // moss-900
        "on-surface-variant": '#6c7d6b', // moss-400
        "surface-container-lowest": '#FFFFFF',
        "surface-container-low": '#f2f4f2', // moss-50
        "surface-container": '#e1e6e0', // moss-100
        "surface-container-high": '#e1e6e0', // moss-100
        "surface-container-highest": '#c2cdc1', // moss-200
        "outline-variant": '#c2cdc1', // moss-200
        "primary-container": '#E8F8EE', // primary-50
        "on-primary-container": '#116F32', // primary-700
        "secondary-container": '#FEF9F0', // sand-50
        "on-secondary-container": '#A8863F', // sand-700
        "tertiary-container": '#FFF0F0', // coral-50
        "on-tertiary-container": '#E56060', // coral-600
        "tertiary": '#FF6B6B', // coral-500
        "on-tertiary": '#FFFFFF',
        "tertiary-fixed": '#FFF0F0', // coral-50
        "primary-fixed": '#D1F1DE', // primary-100
        "error": '#FF6B6B', // coral-500
        "on-error": '#FFFFFF',
        "on-background": '#151916', // moss-900
      },
      boxShadow: {
        'card': '0 2px 12px 0 rgba(0, 0, 0, 0.05)',
        'glow-mint': '0 0 15px rgba(52, 211, 153, 0.3)',
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist)", "monospace"],
        display: ["Public Sans", "sans-serif"],
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 10s ease-in-out 2s infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.4' },
          '50%': { transform: 'translate(30px, -20px) scale(1.05)', opacity: '0.6' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [require("flowbite/plugin")],
};

export default config;

