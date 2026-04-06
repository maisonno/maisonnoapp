import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tiki: {
          bark: '#1C0A00',
          wood: '#3B1A05',
          mahogany: '#5C2E0A',
          bamboo: '#8B6914',
          amber: '#D4830A',
          gold: '#F5A623',
          flame: '#E8521A',
          teal: '#0B7171',
          aqua: '#1DA8A8',
          palm: '#2D6B4F',
          sand: '#F0E6CC',
          cream: '#FDF6E8',
          mist: '#C4B89A',
        },
      },
      fontFamily: {
        tiki: ['var(--font-tiki)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      animation: {
        flicker: 'flicker 2.5s ease-in-out infinite alternate',
        glow: 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1', transform: 'scaleY(1)' },
          '33%': { opacity: '0.75', transform: 'scaleY(0.95)' },
          '66%': { opacity: '0.9', transform: 'scaleY(1.02)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(212, 131, 10, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 166, 35, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
