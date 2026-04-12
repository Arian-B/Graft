import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f97316',
          dark:    '#ea580c',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'SF Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
