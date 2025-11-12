// app/components/OnboardingGuard.tsx
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const publicPaths = ["/auth/signin", "/auth/register", "/onboarding", "/"];

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client after initial render
    if (status === "loading") return;

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
    
    // Only redirect authenticated users who haven't completed onboarding
    // Unauthenticated users can browse freely

    // If authenticated but not on a public path and onboarding is not completed
    if (
      status === "authenticated" &&
      !session?.user?.onboardingCompleted &&
      !isPublicPath
    ) {
      router.push("/onboarding");
      return;
    }

    setIsLoading(false);
  }, [status, pathname, router, session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}