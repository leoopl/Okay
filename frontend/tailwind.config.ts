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
    },
  },

  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
