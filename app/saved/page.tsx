'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from 'app/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from 'app/components/ui/card';
import { useRouter } from 'next/navigation';

type Article = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  sourceName: string;
  sentiment?: number | {
    score: number;
    magnitude: number;
  } | null;
};

type SavedArticle = {
  id: string;
  article: Article;
  createdAt: string;
};

export default function SavedArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchSavedArticles();
    }
  }, [status, router]);

  const fetchSavedArticles = async () => {
    try {
      const response = await fetch('/api/articles/save');
      if (!response.ok) {
        throw new Error('Failed to fetch saved articles');
      }
      const data = await response.json();
      setSavedArticles(data.savedArticles || []);
    } catch (error) {
      console.error('Error fetching saved articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (articleId: string) => {
    try {
      const response = await fetch('/api/articles/save', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove article');
      }

      // Update local state
      setSavedArticles(prev => prev.filter(item => item.id !== articleId));
    } catch (error) {
      console.error('Error removing article:', error);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.02) return 'text-green-600';
    if (score < -0.02) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentBg = (score: number) => {
    if (score > 0.02) return 'bg-green-50';
    if (score < -0.02) return 'bg-red-50';
    return 'bg-yellow-50';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.02) return 'Positive';
    if (score < -0.02) return 'Negative';
    return 'Neutral';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will be redirected by the effect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Saved Articles</h1>
      </div>

      {savedArticles.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600">No saved articles yet</h2>
          <p className="mt-2 text-gray-500">Save articles to read them later</p>
          <Button 
            className="mt-4" 
            onClick={() => router.push('/')}
          >
            Browse Articles
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedArticles.map((saved) => (
            <Card key={saved.id} className={`flex flex-col h-full border ${typeof saved.article.sentiment === 'number' ? getSentimentBg(saved.article.sentiment) : getSentimentBg(saved.article.sentiment?.score ?? 0)}`}>
              <CardHeader>
                <CardTitle className="line-clamp-2">{saved.article.title}</CardTitle>
                <CardDescription>
                  {new Date(saved.article.publishedAt).toLocaleDateString()} • {saved.article.sourceName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {saved.article.description}
                </p>
                {saved.article.sentiment !== null && saved.article.sentiment !== undefined && (
                  <div className="flex items-center text-sm">
                    <span className="font-medium mr-2">Sentiment:</span>
                    <span className={`${getSentimentColor(typeof saved.article.sentiment === 'number' ? saved.article.sentiment : saved.article.sentiment.score)} font-medium`}>
                      {getSentimentLabel(typeof saved.article.sentiment === 'number' ? saved.article.sentiment : saved.article.sentiment.score)}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemove(saved.id)}
                >
                  Remove
                </Button>
                <Button variant="link" size="sm" asChild>
                  <a 
                    href={saved.article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600"
                  >
                    Read More →
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
