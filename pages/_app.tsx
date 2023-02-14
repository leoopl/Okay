import '../styles/globals.scss';
import Navbar from '../components/layout/navBar';
import type { AppProps } from 'next/app';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import Footer from '../components/layout/footer';

const theme = createTheme({
	typography: {
		fontFamily: ['Varela Round', 'sans-serif'].join(','),
		button: {
			fontWeight: 500,
		},
	},
});

export default function App({ Component, pageProps }: AppProps) {
	return (
		<>
			{/* <ThemeProvider theme={theme}> */}
			<Navbar />
			<Component {...pageProps} />
			<Footer />
			{/* </ThemeProvider> */}
		</>
	);
}
