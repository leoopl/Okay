import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },

    fontFamily: {
      varela: ['var(--font-varela-round)'],
    },

    extend: {
      // borderRadius removed — defined in @theme inline in globals.css.

      boxShadow: {
        'soft-xs': '0 1px 3px hsla(199, 84%, 40%, 0.05)',
        'soft-sm': '0 1px 3px hsla(199, 84%, 40%, 0.07), 0 1px 2px -1px hsla(199, 84%, 40%, 0.07)',
        'soft-md': '0 1px 3px hsla(199, 84%, 40%, 0.07), 0 2px 4px -1px hsla(199, 84%, 40%, 0.07)',
        'soft-lg': '0 1px 3px hsla(199, 84%, 40%, 0.07), 0 4px 6px -1px hsla(199, 84%, 40%, 0.07)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // fade-in, slide-up, scale-in removed — defined in globals.css @keyframes.
        // pulse-gentle and float kept here (only defined here).
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // fade-in, slide-up, scale-in removed — .animate-* utility classes in globals.css.
        'pulse-gentle': 'pulse-gentle 3s infinite ease-in-out',
        float: 'float 6s infinite ease-in-out',
      },

      // Enhanced grid support
      gridTemplateRows: {
        'auto-fr': 'auto 1fr',
        'fr-auto': '1fr auto',
      },

      // Enhanced spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Enhanced transition durations
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },

      // Enhanced z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },

  plugins: [
    tailwindcssAnimate,
    typography,

    // Focus utilities only.
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        // Tokens hold full hsl() values after v4 migration — use var() directly.
        '.focus-ring': {
          '&:focus-visible': {
            outline: 'none',
            'box-shadow': '0 0 0 2px var(--ring)',
            'border-radius': '0.125rem',
          },
        },
        '.focus-ring-primary': {
          '&:focus-visible': {
            'box-shadow': '0 0 0 2px color-mix(in srgb, var(--primary) 50%, transparent)',
          },
        },
        '.focus-ring-destructive': {
          '&:focus-visible': {
            'box-shadow': '0 0 0 2px color-mix(in srgb, var(--destructive) 50%, transparent)',
          },
        },
        '.focus-ring-crisis': {
          '&:focus-visible': {
            'box-shadow': '0 0 0 2px color-mix(in srgb, var(--crisis) 50%, transparent)',
          },
        },
      };

      addUtilities(newUtilities, ['responsive', 'hover', 'focus']);
    },
  ],
} satisfies Config;
