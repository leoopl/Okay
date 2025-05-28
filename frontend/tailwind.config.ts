import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
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
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

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
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
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
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-gentle': 'pulse-gentle 3s infinite ease-in-out',
        float: 'float 6s infinite ease-in-out',
      },

      colors: {
        // Core colors
        transparent: 'transparent',
        current: 'currentColor',

        // UI theme colors (using CSS variables with HSL)
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        popover: 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        destructive: 'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        // Custom okay colors with direct HSL values
        yellow: {
          light: '#f8e3a3',
          medium: '#f9d56e',
          dark: '#f9c22e',
        },
        blue: {
          light: '#A5DCF6',
          medium: '#78C7EE',
          dark: '#039BE5',
        },
        green: {
          light: '#D1DBC3',
          medium: '#b6cfb8',
          dark: '#7F9463',
        },
        beige: {
          light: '#F2DECC',
          medium: '#C2B2A3',
          dark: '#91857A',
        },
        grey: {
          light: '#CBCFD7',
          medium: '#A3A6B0',
          dark: '#797D89',
        },

        // Chart colors
        'chart-1': 'hsl(var(--chart-1) / <alpha-value>)',
        'chart-2': 'hsl(var(--chart-2) / <alpha-value>)',
        'chart-3': 'hsl(var(--chart-3) / <alpha-value>)',
        'chart-4': 'hsl(var(--chart-4) / <alpha-value>)',
        'chart-5': 'hsl(var(--chart-5) / <alpha-value>)',
      },

      // Enhanced grid support
      gridTemplateRows: {
        'auto-fr': 'auto 1fr',
        'fr-auto': '1fr auto',
      },

      // Enhanced spacing for mental health design
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
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    // Custom plugin for additional utilities
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        // Focus utilities for accessibility
        '.focus-ring': {
          '&:focus-visible': {
            outline: 'none',
            'box-shadow': '0 0 0 2px hsl(var(--ring))',
            'border-radius': '0.125rem',
          },
        },
        '.focus-ring-primary': {
          '&:focus-visible': {
            'box-shadow': '0 0 0 2px hsl(var(--primary) / 0.5)',
          },
        },
        '.focus-ring-destructive': {
          '&:focus-visible': {
            'box-shadow': '0 0 0 2px hsl(var(--destructive) / 0.5)',
          },
        },
        // Interactive elements
        '.interactive-element': {
          transition: 'all 200ms ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.05)',
            'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          '&:disabled': {
            cursor: 'not-allowed',
            opacity: '0.5',
            '&:hover': {
              transform: 'none',
              'box-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            },
          },
        },
        // Status indicators
        '.status-success': {
          color: '#059669', // emerald-600
          backgroundColor: '#ecfdf5', // emerald-50
          borderColor: '#a7f3d0', // emerald-200
        },
        '.status-error': {
          color: '#dc2626', // red-600
          backgroundColor: '#fef2f2', // red-50
          borderColor: '#fecaca', // red-200
        },
        '.status-warning': {
          color: '#d97706', // amber-600
          backgroundColor: '#fffbeb', // amber-50
          borderColor: '#fed7aa', // amber-200
        },
        '.status-info': {
          color: '#2563eb', // blue-600
          backgroundColor: '#eff6ff', // blue-50
          borderColor: '#bfdbfe', // blue-200
        },
      };

      addUtilities(newUtilities, ['responsive', 'hover', 'focus']);
    },
  ],
} satisfies Config;
