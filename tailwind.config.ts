import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pn-bg':        '#0D0D0D',
        'pn-base':      '#0D0D0D',
        'pn-card':      '#1A1A2E',
        'pn-elevated':  '#141420',
        'pn-border':    '#2D2D44',
        'pn-purple':    '#7C3AED',
        'pn-cyan':      '#06B6D4',
        'pn-text':      '#FFFFFF',
        'pn-secondary': '#9CA3AF',
        'pn-tertiary':  '#6B7280',
        'pn-muted':     '#9CA3AF',
        'pn-accent':    '#7C3AED',
        'pn-success':   '#22C55E',
        'pn-danger':    '#EF4444',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Roboto',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
