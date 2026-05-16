import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0A',
          secondary: '#141414',
          tertiary: '#1E1E1E',
          hover: '#252525',
          active: '#2A2A2A',
        },
        gold: {
          DEFAULT: '#FFD700',
          dim: '#CCB000',
          light: '#FFE44D',
          muted: 'rgba(255,215,0,0.12)',
        },
        border: { DEFAULT: '#2A2A2A', strong: '#3A3A3A' },
        text: { primary: '#FFFFFF', secondary: '#A0A0A0', muted: '#606060' },
        status: { online: '#22C55E', away: '#F59E0B', offline: '#6B7280' },
        bubble: {
          sent: '#FFD700',
          received: '#1E1E1E',
          'sent-text': '#0A0A0A',
          'received-text': '#FFFFFF',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        slideInLeft: { from: { transform: 'translateX(-100%)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
export default config
