"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { OnboardingCard } from "@/app/components/OnboardingCard";
import type { OnboardingStatus } from "@prisma/client";

// incorporating another CRUD operation

type Assignment = {
  id: string;
  status: OnboardingStatus;
  article: {
    id: string;
    title: string;
    description?: string | null;
    url: string;
    sourceName?: string | null;
    category?: string | null;
    urlToImage?: string | null;
    publishedAt?: string | null;

    article?: {
      category?: { name?: string | null } | null;
    } | null;
  };
};

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["onboarding-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding/articles");
      if (!res.ok) throw new Error("Failed to load assignments");
      return res.json() as Promise<{ assignments: Assignment[] }>;
    },
  });

  const assignments = data?.assignments ?? [];

  const pending = useMemo(
    () => assignments.filter((a) => a.status === "PENDING"),
    [assignments]
  );
  const completed = assignments.length - pending.length;
  const total = assignments.length || 7;

  const current = pending[0];

//for asynchronous operations

  const responseMutation = useMutation({
    mutationFn: async (vars: { assignmentId: string; status: OnboardingStatus }) => {
      const res = await fetch("/api/onboarding/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to record response");
      }
      return res.json();
    },
    onSuccess: async () => {
      // Refetch to update remaining pending items
      await queryClient.invalidateQueries({ queryKey: ["onboarding-assignments"] });
    },
  });

  useEffect(() => {
    if (status === "authenticated" && session?.user?.onboardingCompleted) {
      router.replace("/");
    }
  }, [status, session?.user?.onboardingCompleted, router]);

  useEffect(() => {
    // If there are zero pending and we had assignments, mark complete
    if (!isLoading && assignments.length > 0 && pending.length === 0 && !submitting) {
      (async () => {
        try {
          setSubmitting(true);
          const res = await fetch("/api/onboarding/complete", { method: "POST" });
          if (!res.ok) throw new Error("Failed to complete onboarding");
          // Refresh session and go home
          // Best-effort: re-fetch assignments and navigate
          await refetch();
          router.replace("/");
        } finally {
          setSubmitting(false);
        }
      })();
    }
  }, [isLoading, assignments.length, pending.length, refetch, router, submitting]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">
        Loading onboarding...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">
        Please sign in to continue.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-600">
        Failed to load onboarding articles. Try again later.
      </div>
    );
  }

  const topic =
    current?.article?.category ||
    current?.article?.article?.category?.name ||
    undefined;

  return (
    <main className="min-h-[70vh] flex flex-col items-center px-4 py-8 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Help us tailor your news</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Review a few articles so we can learn what you like. You can skip reading
          in depth—just make a quick call.
        </p>

        <div className="mt-4 h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded">
          <div
            className="h-2 bg-blue-600 rounded"
            style={{ width: `${Math.round((completed / total) * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {completed}/{total} completed
        </div>
      </div>

      {current ? (
        <OnboardingCard
          title={current.article.title}
          description={current.article.description}
          url={current.article.url}
          sourceName={current.article.sourceName}
          category={topic || null}
          urlToImage={current.article.urlToImage || null}
          publishedAt={current.article.publishedAt || null}
          disabled={responseMutation.isPending}
          onLike={() =>
            responseMutation.mutate({
              assignmentId: current.id,
              status: "LIKED" as OnboardingStatus,
            })
          }
          onDislike={() =>
            responseMutation.mutate({
              assignmentId: current.id,
              status: "DISLIKED" as OnboardingStatus,
            })
          }
        />
      ) : (
        <div className="min-h-[40vh] flex items-center justify-center text-zinc-600">
          {submitting ? "Wrapping up..." : "All set! Redirecting..."}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        Not into this set? It refreshes daily.
      </div>
    </main>
  );
}