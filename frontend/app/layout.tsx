import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Varela_Round } from 'next/font/google';
import Headers from '../components/Header';
import Footer from '../components/Footer';
import AuthProvider from '@/providers/auth-provider';

const varelaRound = Varela_Round({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-varela-round',
  weight: '400',
});

const APP_NAME = 'Okay';
const APP_DEFAULT_TITLE = 'Okay';
const APP_TITLE_TEMPLATE = '%s - PWA App';
const APP_DESCRIPTION = "Your mental health it's Okay?";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#fbe5a8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <link rel="manifest" href="/manifest.json" />
      <head />
      <body className={`${varelaRound.variable} gradient-background min-h-screen antialiased`}>
        <AuthProvider>
          <Headers />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
