'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { data: session, status } = useSession();

  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    console.log('Navbar mounted, hasAnimated:', hasAnimated);
    // Only animate on first load
    if (!hasAnimated) {
      console.log('Triggering flip animation');
      setHasAnimated(true);
      const timer = setTimeout(() => {
        console.log('Animation should be complete now');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated]);

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">
                <span className={`inline-block ${hasAnimated ? 'animate-flip' : ''}`}>FLIP</span>
                <span>SIDE</span>
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a href="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Home
              </a>
              {session && (
                <>
                  <a href="/saved" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Saved Articles
                  </a>
                  <a href="/categories" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Categories
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {status === 'loading' ? (
              <span className="text-gray-500">Loading...</span>
            ) : session ? (
              <>
                <span className="text-sm text-gray-700">
                  {session.user?.name || session.user?.email}
                </span>
                <button 
                  onClick={() => signOut()}
                  className="bg-gray-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={() => signIn()}
                className="bg-indigo-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
