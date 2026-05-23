/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fff9ef',
          100: '#fef4e3',
          200: '#fbe8c8',
          300: '#f5d9a4',
        },
        woody: {
          100: '#f0dcb9',
          200: '#e3c590',
          300: '#cfa771',
          400: '#b88752',
          500: '#9c6a3a',
          600: '#7a4f25',
          700: '#5c3a18',
        },
        usagi: {
          pink: '#f6a6a6',
          pinkSoft: '#fde0e0',
          mint: '#a8d8c8',
          mintSoft: '#e0f1ec',
          orange: '#e8855a',
          orangeSoft: '#fde6d8',
          black: '#26211d',
          ink: '#3a322c',
        },
        night: {
          black: '#05060a',
          deep: '#0a0c12',
          ink: '#10131c',
          navy: '#121a27',
          warm: '#1b120c',
          mid: '#2a1a12',
          accent: '#3a2517',
          wood: '#2b160d',
          gold: '#d4af37',
          glow: '#ffc679',
          neon: '#ff5fa2',
          mint: '#7fe7c5',
          orange: '#ff944d',
        },
      },
      boxShadow: {
        soft: '0 2px 0 rgba(60, 40, 20, 0.06), 0 4px 14px rgba(60, 40, 20, 0.08)',
        chip: '0 1px 0 rgba(60, 40, 20, 0.08)',
        bar: '0 18px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 198, 121, 0.12)',
        neon: '0 0 18px rgba(255, 95, 162, 0.35), 0 0 34px rgba(255, 198, 121, 0.18)',
      },
      borderRadius: {
        bar: '22px',
      },
      fontFamily: {
        display: [
          '"Hiragino Maru Gothic ProN"',
          '"Yu Gothic UI"',
          '"Yu Gothic"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
