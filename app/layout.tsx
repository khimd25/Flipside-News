import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from './components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FLIPSIDE - Discover Different Perspectives',
  description: 'A personalized news feed with sentiment analysis and perspective flipping',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen app-bg">
            <Navbar />
            <main className="container mx-auto px-4 py-8 flex-1">
              {children}
            </main>
            <footer className="py-4 text-center text-sm text-gray-500 border-t border-gray-100">
              <div className="container mx-auto px-4">
                Made with ❤️ by Khim David • Software Engineering Bootcamp 2025
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
