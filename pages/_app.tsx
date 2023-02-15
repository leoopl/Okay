import '../styles/globals.scss';
import Navbar from '../components/layout/navBar';
import type { AppProps } from 'next/app';
import Footer from '../components/layout/footer';

export default function App({ Component, pageProps }: AppProps) {
	return (
		<>
			<Navbar />
			<Component {...pageProps} />
			<Footer />
		</>
	);
}
