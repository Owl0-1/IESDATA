import type { Metadata } from 'next';
import { Poppins, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IESData',
  description:
    'API de consulta a instituições de ensino superior e cursos (dados INEP/MEC).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="bg-[#050807] text-stone-100">
      <body
        className={`${poppins.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
