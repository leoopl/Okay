import { type Config } from 'tailwindcss';

const config: Config = {
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
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
      fontFamily: {
        varela: ['var(--font-varela-round)'],
      },
      colors: {
        yellow: {
          light: '#f8e3a3',
          medium: '#f9d56e',
          dark: '#f9c22e',
        },
        blue: {
          light: '#a8dff1',
          medium: '#65c3e8',
          dark: '#0d9ddb',
        },
        beige: {
          light: '#f2e4d0',
          medium: '#c7bba9',
          dark: '#96897b',
        },
        green: {
          light: '#c4e0c8',
          medium: '#9abf9f',
          dark: '#69996f',
        },
        gray: {
          light: '#d1d3de',
          medium: '#9fa3b8',
          dark: '#797e8e',
        },

        background: '#b6cfb8',
        foreground: '#797e8e',

        primary: {
          DEFAULT: '#69996f',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f8e3a3',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: '#c4e0c8',
          foreground: '#000000',
        },
        muted: {
          DEFAULT: '#9fa3b8',
          foreground: '#797e8e',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#f2e4d0',
          foreground: '#797e8e',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#797e8e',
        },

        border: '#9fa3b8',
        input: '#9fa3b8',
        ring: '#69996f',

        chart: {
          1: '#4583cc',
          2: '#35b396',
          3: '#f9c22e',
          4: '#b866d8',
          5: '#e84c88',
        },
      },
    },
    data: {
      checked: 'ui~="checked"',
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
