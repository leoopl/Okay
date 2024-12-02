import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        yellowLight: '#FBE5A8', // background hearders
        yellowMedium: '#F8D77C',
        yellowDark: '#F4B400', // headers text
        blueLight: '#A5DCF6',
        blueMedium: '#78C7EE',
        blueDark: '#039BE5',
        beigeLight: '#F2DECC',
        beigeMedium: '#C2B2A3',
        beigeDark: '#91857A',
        greenLight: '#D1DBC3',
        greenMedium: '#ABB899',
        greenDark: '#7F9463',
        grayLight: '#CBCFD7',
        grayMedium: '#A3A6B0',
        grayDark: '#797D89', // background
      },
      fontFamily: {
        varela: ['var(--font-varela-round)'],
      },
    },
    data: {
      checked: 'ui~="checked"',
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
