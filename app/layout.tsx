// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { OnboardingGuard } from "./components/OnboardingGuard";
import { Navbar } from "./components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flipside News",
  description: "Your personalized news feed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="app-bg">
            <Navbar />
            <OnboardingGuard>
              {children}
            </OnboardingGuard>
          </div>
        </Providers>
      </body>
    </html>
  );
}