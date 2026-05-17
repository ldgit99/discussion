import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// design.md §18 — 단일 진실 출처
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          900: 'var(--brand-900)',
        },
        ai: {
          50: 'var(--ai-50)',
          200: 'var(--ai-200)',
          500: 'var(--ai-500)',
          600: 'var(--ai-600)',
          text: 'var(--ai-text)',
        },
        personal: {
          bg: 'var(--personal-bg)',
          border: 'var(--personal-border)',
          accent: 'var(--personal-accent)',
          'badge-bg': 'var(--personal-badge-bg)',
        },
        success: {
          50: 'var(--success-50)',
          500: 'var(--success-500)',
        },
        warning: {
          50: 'var(--warning-50)',
          500: 'var(--warning-500)',
        },
        danger: {
          50: 'var(--danger-50)',
          500: 'var(--danger-500)',
        },
        info: {
          500: 'var(--info-500)',
        },
        neutral: {
          0: 'var(--neutral-0)',
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          400: 'var(--neutral-400)',
          600: 'var(--neutral-600)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },
        // shadcn/ui 시스템 색
        background: 'var(--neutral-0)',
        foreground: 'var(--neutral-800)',
        border: 'var(--neutral-200)',
        input: 'var(--neutral-200)',
        ring: 'var(--brand-500)',
        muted: {
          DEFAULT: 'var(--neutral-100)',
          foreground: 'var(--neutral-600)',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'Noto Sans KR',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'JetBrains Mono', 'D2Coding', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['13px', '18px'],
        sm: ['15px', '22px'],
        base: ['17px', '26px'],
        lg: ['19px', '28px'],
        xl: ['22px', '30px'],
        '2xl': ['26px', '34px'],
        '3xl': ['32px', '40px'],
        '4xl': ['40px', '48px'],
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        md: '0 4px 8px rgba(15, 23, 42, 0.08)',
        lg: '0 8px 24px rgba(15, 23, 42, 0.12)',
        xl: '0 16px 40px rgba(15, 23, 42, 0.16)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
        page: '480ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.4, 0, 0.2, 1)',
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'card-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'success-pulse': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'var(--success-50)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'card-in': 'card-in 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        'success-pulse': 'success-pulse 1s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
