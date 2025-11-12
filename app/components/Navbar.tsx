
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnalyticsModal } from "./AnalyticsModal";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [showAnalytics, setShowAnalytics] = useState(false);

  // If we're on the onboarding page, don't show the navbar
  if (pathname.startsWith("/onboarding")) {
    return null;
  }

  return (
    <>
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-purple-600 dark:text-purple-400">
              <span className="animate-flip">FLIP</span>side News
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {status === "authenticated" ? (
              <>
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
                >
                  📊 My Stats
                </button>
                <Link href="/saved" className="text-sm hover:text-blue-600 dark:hover:text-blue-400">
                  Saved Articles
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Create Your Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
      </nav>
      <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
    </>
  );
}