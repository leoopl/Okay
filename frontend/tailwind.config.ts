/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        yellowLight: 'hsl(var(--yellow-light))',
        yellowMedium: 'hsl(var(--yellow-medium))',
        yellowDark: 'hsl(var(--yellow-dark))',
        blueLight: 'hsl(var(--blue-light))',
        blueMedium: 'hsl(var(--blue-medium))',
        blueDark: 'hsl(var(--blue-dark))',
        beigeLight: 'hsl(var(--beige-light))',
        beigeMedium: 'hsl(var(--beige-medium))',
        beigeDark: 'hsl(var(--beige-dark))',
        greenLight: 'hsl(var(--green-light))',
        greenMedium: 'hsl(var(--green-medium))',
        greenDark: 'hsl(var(--green-dark))',
        grayLight: 'hsl(var(--gray-light))',
        grayMedium: 'hsl(var(--gray-medium))',
        grayDark: 'hsl(var(--gray-dark))',

        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
    },
    data: {
      checked: 'ui~="checked"',
    },
  },
  plugins: [require('tailwindcss-animate')],
};
