import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF9F4',
        ink: '#1A1A1A',
        teal: { DEFAULT: '#1A8B7F', dark: '#14746A', light: '#E8F4F2' },
        amber: { DEFAULT: '#C98A2C', light: '#FBF0DD' },
        grey: { 400: '#A8A29A', 500: '#6B6B6B', 700: '#3D3A34' },
      },
      fontFamily: {
        sans: ['var(--font-vazir)', 'Tahoma', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
