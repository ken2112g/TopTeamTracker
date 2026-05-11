import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: { 0: '#0c0a09', 1: '#161310', 2: '#1f1a16', 3: '#2a221d' },
        line: { DEFAULT: '#2a221d', strong: '#3a2f27' },
        text: { 0: '#fef7f0', 1: '#c9b9aa', 2: '#877766' },
        orange: { DEFAULT: '#f1641e', bright: '#ff7a3d', dim: '#c4501a' },
        accent: {
          green: '#84cc16',
          red: '#ef4444',
          amber: '#facc15',
          purple: '#a78bfa',
          blue: '#60a5fa'
        }
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        }
      }
    }
  },
  plugins: []
};

export default config;
