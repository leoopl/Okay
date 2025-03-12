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
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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

        // UI Theme colors
        background: '#b6cfb8',
        foreground: '#797e8e',

        // Objects with foreground variants
        primary: {
          DEFAULT: '#69996f',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f8e3a3',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: '#0d9ddb',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#9fa3b8',
          foreground: '#797e8e',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },

        // Other UI colors
        border: '#9fa3b8',
        input: '#9fa3b8',
        ring: '#69996f',

        // Chart colors
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
