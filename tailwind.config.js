/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    // ── Container ──────────────────────────────────────────────────────────
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        lg: '2rem',
      },
    },
    extend: {
      // ── Colors ─────────────────────────────────────────────────────────
      colors: {
        bg: {
          app: '#F8F9FB',
          sidebar: '#0F172A',
          card: '#FFFFFF',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          tertiary: '#94A3B8',
        },
        border: {
          default: '#E2E8F0',
        },
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },

      // ── Typography ──────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      // Section 2.2 — type scale
      // [size, { lineHeight, fontWeight, letterSpacing? }]
      fontSize: {
        'display-2xl': ['4.5rem',   { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-xl':  ['3.75rem',  { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.02em' }],
        h1:            ['2.25rem',  { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.01em' }],
        h2:            ['1.875rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        h3:            ['1.5rem',   { lineHeight: '1.3',  fontWeight: '600' }],
        h4:            ['1.25rem',  { lineHeight: '1.35', fontWeight: '600' }],
        body:          ['1rem',     { lineHeight: '1.5',  fontWeight: '400' }],
        'body-sm':     ['0.9375rem',{ lineHeight: '1.5',  fontWeight: '400' }],
        caption:       ['0.875rem', { lineHeight: '1.4',  fontWeight: '400' }],
        micro:         ['0.75rem',  { lineHeight: '1.4',  fontWeight: '400' }],
      },

      // ── Shadows ─────────────────────────────────────────────────────────
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(79 70 229 / 0.12), 0 2px 6px -1px rgb(0 0 0 / 0.08)',
      },

      // ── Border radius ───────────────────────────────────────────────────
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
    },
  },
  plugins: [
    // Container utility (center + padding already set in theme.container above)
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
