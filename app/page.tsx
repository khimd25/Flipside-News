'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'app/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from 'app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'app/components/ui/tabs';
import { useSession, signIn } from 'next-auth/react';

type Article = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: {
    name: string;
  };
  publishedAt: string;
  urlToImage?: string;
  sentiment: {
    score: number;
    magnitude: number;
  };
};

type FlipState = 'all' | 'hide-negative' | 'hide-positive';
type FeedbackSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export default function Home() {
  const { data: session } = useSession();
  const [flipState, setFlipState] = useState<FlipState>('all');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [articles, setArticles] = useState<Article[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackSentiment>>({});
  const [savedArticleIds, setSavedArticleIds] = useState<Set<string>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);
  const [articleContent, setArticleContent] = useState<string>('');
  const [readerFontScale, setReaderFontScale] = useState(1);
  const fontSizeClass = readerFontScale <= 0 ? 'text-base' : readerFontScale === 1 ? 'text-lg' : 'text-xl';

  const categories = [
    'general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'
  ];

  // Using TanStack Query for smart data fetching - learned from their docs at tanstack.com/query
  // This handles caching, background refetching, and error states automatically - pretty sick!
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['news', selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/news?category=${selectedCategory}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch news: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      return json;
    },
  });

  // Sync articles state when data changes - React pattern from beta.reactjs.org
  useEffect(() => {
    if (data?.articles) {
      setArticles(data.articles);
    }
  }, [data]);

  // Force refetch when category changes - ensures fresh content per category
  useEffect(() => {
    refetch();
  }, [selectedCategory, refetch]);

  // Fetch existing feedback and saved articles for current user
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) return;
      
      try {
        // Fetch sentiment feedback
        if (articles.length > 0) {
          const urls = articles.map(a => encodeURIComponent(a.url)).join(',');
          const [feedbackRes, savedRes] = await Promise.all([
            fetch(`/api/feedback/sentiment?urls=${urls}`),
            fetch('/api/articles/save')
          ]);
          
          if (feedbackRes.ok) {
            const feedbackJson = await feedbackRes.json();
            setFeedbackMap(feedbackJson.feedback || {});
          }
          
          if (savedRes.ok) {
            const savedJson = await savedRes.json();
            const savedUrls = (savedJson.savedArticles || []).map((sa: any) => sa.article?.url).filter(Boolean) as string[];
            setSavedArticleIds(new Set(savedUrls));
          }
        } else {
          // Just fetch saved articles if no articles loaded yet
          const savedRes = await fetch('/api/articles/save');
          if (savedRes.ok) {
            const savedJson = await savedRes.json();
            const savedUrls = (savedJson.savedArticles || []).map((sa: any) => sa.article?.url).filter(Boolean) as string[];
            setSavedArticleIds(new Set(savedUrls));
          }
        }
      } catch (e) {
        // Silently fail for user data - non-critical feature
      }
    };
    
    fetchUserData();
  }, [session?.user, articles]);

  const handleFlip = () => {
    // Cycle through: all -> hide-negative -> hide-positive -> all
    if (flipState === 'all') {
      setFlipState('hide-negative');
    } else if (flipState === 'hide-negative') {
      setFlipState('hide-positive');
    } else {
      setFlipState('all');
    }
  };

  const categorizeSentiment = (score: number): 'positive' | 'negative' | 'neutral' => {
    if (score === 0.0) return 'neutral';
    if (score >= 0.02) return 'positive';
    if (score <= -0.02) return 'negative';
    // For values between -0.02 and 0.02 (but not 0.0), categorize to closest
    return score > 0 ? 'positive' : 'negative';
  };

  const getEffectiveSentiment = (article: Article): 'positive' | 'neutral' | 'negative' => {
    const fb = feedbackMap[article.url];
    if (fb === 'POSITIVE') return 'positive';
    if (fb === 'NEGATIVE') return 'negative';
    if (fb === 'NEUTRAL') return 'neutral';
    // fallback to model score
    return categorizeSentiment(article.sentiment?.score || 0);
  };

  const displayedArticles = useMemo(() => {
    if (flipState === 'all') return articles;
    return articles.filter(article => {
      const sentiment = getEffectiveSentiment(article);
      if (flipState === 'hide-negative') return sentiment !== 'negative';
      return sentiment !== 'positive'; // hide-positive
    });
  }, [articles, flipState, feedbackMap]);

  const getSentimentColor = (score: number, article?: Article) => {
    const sentiment = article ? getEffectiveSentiment(article) : categorizeSentiment(score);
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (score: number, article?: Article) => {
    const sentiment = article ? getEffectiveSentiment(article) : categorizeSentiment(score);
    if (sentiment === 'positive') return 'Positive';
    if (sentiment === 'negative') return 'Negative';
    return 'Neutral';
  };

  const getSentimentBg = (article: Article) => {
    const sentiment = getEffectiveSentiment(article);
    if (sentiment === 'positive') return 'bg-green-50';
    if (sentiment === 'negative') return 'bg-red-50';
    return 'bg-yellow-50';
  };

  const getFlipButtonText = () => {
    if (flipState === 'all') return 'Flip Perspective';
    if (flipState === 'hide-negative') return 'Showing Positive';
    return 'Showing Negative';
  };

  const handleReadArticle = async (article: any) => {
    setSelectedArticle(article);
    setIsReading(true);
    
    // Track the read interaction if user is logged in
    if (session?.user) {
      fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleUrl: article.url,
          sourceName: article.source?.name || article.sourceName,
          category: selectedCategory,
          sentiment: article.sentiment?.score,
          action: 'read'
        })
      }).catch(() => {
        // Analytics fail silently - don't interrupt the reading experience
      });
    }
    
    try {
      const response = await fetch(`/api/extract-article?url=${encodeURIComponent(article.url)}`);
      const data = await response.json();
      if (data.success) {
        // Successfully extracted article content
        setArticleContent(data.content);
      } else {
        // Fallback message when extraction fails - user experience first!
        setArticleContent('Sorry, we couldn’t load the article content. Please visit the original link.');
      }
    } catch (error) {
      // Fallback message when extraction fails - user experience first!
      setArticleContent("Sorry, we couldn't load the article content. Please visit the original link.");
    }
  };

  const handleCloseReader = () => {
    setIsReading(false);
    setSelectedArticle(null);
    setArticleContent('');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load news. Please try again later.</span>
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 mb-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
  }

  const getGreeting = () => {
    if (!session?.user) return null;
    
    const name = session.user.name || session.user.email?.split('@')[0] || 'News Explorer';
    const greetings = [
      `Welcome back, ${name}! Ready to flip the script on today’s headlines?`,
      `Hey ${name}! Your personalized news feed is fresh and ready to flip.`,
      `Good to see you, ${name}! Let’s see what stories are worth flipping through.`,
      `${name}, your dashboard is live—time to flip perspectives on the latest buzz.`,
      `Back for more, ${name}? Let’s flip some narratives and find the gems.`,
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return (
    <div className="space-y-6">
      {session?.user && (
        <div className="text-center mb-4">
          <p className="text-lg font-medium text-purple-600 dark:text-purple-400">
            {getGreeting()}
          </p>
        </div>
      )}
      <div className="flex flex-col items-center mb-8 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Latest News</h2>
        <Button 
          onClick={handleFlip}
          variant={flipState !== 'all' ? 'default' : 'outline'}
          className="flex items-center gap-3 px-8 py-6 text-xl font-semibold transition-all duration-200 transform hover:scale-105"
          disabled={!articles || articles.length === 0}
        >
          <span className="text-2xl">{getFlipButtonText()}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${flipState === 'hide-positive' ? 'rotate-180' : ''}`}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </Button>
        {flipState !== 'all' && articles.length > 0 && (
          <p className="text-sm text-gray-500">
            Showing {displayedArticles.length} of {articles.length} articles
            {flipState === 'hide-negative' && ' (hiding negative sentiment)'}
            {flipState === 'hide-positive' && ' (hiding positive sentiment)'}
          </p>
        )}
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 mb-6">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-gray-600">Loading {selectedCategory} news...</p>
            </div>
          ) : !articles || articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <h3 className="text-xl font-semibold text-gray-700">No articles found</h3>
              <p className="text-gray-500">We couldn’t find any {selectedCategory} news at the moment.</p>
              <p className="text-sm text-gray-400">Try selecting a different category or check back later.</p>
            </div>
          ) : displayedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <h3 className="text-xl font-semibold text-gray-700">No articles in this view</h3>
              <p className="text-gray-500">All articles have been filtered out based on your current perspective.</p>
              <Button onClick={handleFlip} variant="outline">Change Perspective</Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayedArticles.map((article) => (
                <Card key={article.url} className={`flex flex-col h-full border ${getSentimentBg(article)}`}>
                  {article.urlToImage && (
                    <div className="relative h-48 w-full">
                      <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="rounded-t-lg object-cover h-full w-full"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {article.title}
                      </a>
                    </CardTitle>
                    <CardDescription>
                      {new Date(article.publishedAt).toLocaleDateString()} • {typeof article.source === 'object' ? article.source.name : article.source}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-700 mb-4">
                      {article.description?.substring(0, 150)}...
                    </p>
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Sentiment:</span>
                      <span className={`${getSentimentColor(article.sentiment?.score || 0, article)} font-medium`}>
                        {getSentimentLabel(article.sentiment?.score || 0, article)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-2">Your take:</span>
                      {(['POSITIVE','NEUTRAL','NEGATIVE'] as FeedbackSentiment[]).map(s => (
                        <button
                          key={s}
                          className={`px-2 py-1 text-xs rounded border ${feedbackMap[article.url] === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                          onClick={async () => {
                            if (!session?.user) { await signIn(); return; }
                            try {
                              const res = await fetch('/api/feedback/sentiment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: article.url, sourceName: typeof article.source === 'object' ? article.source.name : String(article.source), sentiment: s })
                              });
                              if (res.ok) {
                                setFeedbackMap(prev => ({ ...prev, [article.url]: s }));
                              }
                            } catch (e) { /* noop */ }
                          }}
                          type="button"
                        >
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={savedArticleIds.has(article.url) ? 'default' : 'outline'} 
                        size="sm"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!session?.user) {
                            await signIn();
                            return;
                          }
                          
                          try {
                            const isSaved = savedArticleIds.has(article.url);
                            
                            if (isSaved) {
                              // Remove from saved
                              const response = await fetch('/api/articles/save', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ articleId: article.id || article.url })
                              });
                              
                              if (response.ok) {
                                setSavedArticleIds(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(article.url);
                                  return newSet;
                                });
                              }
                            } else {
                              // Add to saved
                              const response = await fetch('/api/articles/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  article: {
                                    ...article,
                                    source: typeof article.source === 'object' ? article.source.name : article.source
                                  }
                                })
                              });
                              
                              if (response.ok) {
                                setSavedArticleIds(prev => new Set(prev).add(article.url));
                              }
                            }
                          } catch (error) {
                            // Save/unsave errors fail gracefully
                          }
                        }}
                      >
                        {savedArticleIds.has(article.url) ? 'Saved' : 'Save'}
                      </Button>
                      <Button variant="link" size="sm" asChild>
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600"
                        >
                          Read More →
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadArticle(article)}
                        className="mt-2"
                      >
                        Read on Flipside
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {isReading && selectedArticle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 w-full max-w-3xl max-h-[85vh] overflow-hidden relative">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{selectedArticle.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  {(() => {
                    try {
                      const u = new URL(selectedArticle.url);
                      const host = u.hostname.replace(/^www\./, '');
                      const date = selectedArticle.publishedAt ? new Date(selectedArticle.publishedAt).toLocaleDateString() : '';
                      return `${host}${date ? ' • ' + date : ''}`;
                    } catch { return ''; }
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setReaderFontScale(Math.max(0, readerFontScale - 1))}
                  className="px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  type="button"
                >
                  A-
                </button>
                <button
                  onClick={() => setReaderFontScale(Math.min(2, readerFontScale + 1))}
                  className="px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  type="button"
                >
                  A+
                </button>
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm rounded border border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Open
                </a>
                <button
                  onClick={handleCloseReader}
                  className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Close"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            <div className="px-5 py-5 overflow-y-auto max-h-[calc(85vh-64px)]">
              <div className={`text-zinc-800 dark:text-zinc-100 whitespace-pre-line leading-relaxed font-serif ${fontSizeClass}`}>
                {articleContent}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}