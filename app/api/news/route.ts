import { NextResponse } from 'next/server';
import axios from 'axios';
import { LanguageServiceClient } from '@google-cloud/language';
import { auth } from 'google-auth-library';

// Google Cloud Natural Language setup - following their Node.js quickstart guide
// Docs: cloud.google.com/natural-language/docs/quickstart-client-libraries
let languageClient;

try {
  // Parse service account JSON from env - learned this pattern from a Stack Overflow post
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : null;

  if (credentials) {
    // Initialize with explicit credentials - needed for deployment environments
    languageClient = new LanguageServiceClient({
      projectId: credentials.project_id,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n') // Fix escaped newlines - tricky bug!
      }
    });
  } else {
    // Fallback to default auth - works locally with gcloud CLI
    languageClient = new LanguageServiceClient();
  }
} catch (error) {
  // If setup fails, we'll return neutral sentiment scores as fallback
  languageClient = null;
}

// Analyzes text sentiment using Google's NLP API - returns score (-1 to 1) and magnitude
// Based on: cloud.google.com/natural-language/docs/analyzing-sentiment
async function analyzeSentiment(text: string) {
  if (!text || !text.trim()) {
    return { score: 0, magnitude: 0 };
  }

  // Graceful degradation if Google Cloud isn't configured
  if (!languageClient) {
    return { score: 0, magnitude: 0 };
  }

  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    // Timeout prevents API calls from hanging - learned this the hard way!
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const [result] = await languageClient.analyzeSentiment({ 
        document,
        retry: {
          retryCodes: [
            // Add retryable error codes
            4,  // DEADLINE_EXCEEDED
            14, // UNAVAILABLE
            8,  // RESOURCE_EXHAUSTED
          ],
          backoffSettings: {
            initialRetryDelayMillis: 100,
            maxRetryDelayMillis: 1000,
            retryDelayMultiplier: 1.3,
          },
        },
      });
      
      clearTimeout(timeoutId);
      
      const sentiment = result.documentSentiment;
      
      return {
        score: sentiment?.score || 0, // Range from -1.0 to 1.0
        magnitude: sentiment?.magnitude || 0, // Non-negative number
      };
    } catch (apiError) {
      clearTimeout(timeoutId);
      throw apiError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    // Return neutral sentiment on error - keeps the app running smoothly
    return {
      score: 0,
      magnitude: 0,
    };
  }
}

// Heuristic to detect if text is likely English (mostly ASCII)
function isLikelyEnglish(text: string) {
  if (!text) return false;
  const sample = text.slice(0, 200);
  const asciiCount = (sample.match(/[\x00-\x7F]/g) || []).length;
  return asciiCount / Math.max(sample.length, 1) > 0.9; // >90% ASCII
}

// Batch processes articles for sentiment analysis - parallel processing FTW!
// Inspired by: javascript.info/promise-api#promise-all
async function processArticles(articles: any[]) {
  if (!articles || !Array.isArray(articles)) {
    return [];
  }
  
  // Process all articles in parallel using Promise.all - much faster than sequential!
  const processedArticles = await Promise.all(
    articles.map(async (article, index) => {
      try {
        if (!article.title) {
          return {
            ...article,
            sentiment: { score: 0, magnitude: 0 },
          };
        }

        // Combine title + description for better context - tip from Google's best practices
        const textToAnalyze = `${article.title}. ${article.description || ''}`.substring(0, 5000);
        
        const sentiment = await analyzeSentiment(textToAnalyze);
        
        return {
          ...article,
          sentiment,
        };
      } catch (error) {
        // Fail gracefully with neutral sentiment - never break the feed!
        return {
          ...article,
          sentiment: {
            score: 0,
            magnitude: 0,
          },
        };
      }
    })
  );

  return processedArticles;
}

// Next.js API route for fetching news - learned from nextjs.org/docs/app/building-your-application/routing/route-handlers
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'general';
  
  try {
    // NewsAPI.org - free tier gives us 100 requests/day, perfect for this project!
    const newsApiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
    
    if (!newsApiKey) {
      throw new Error('News API key not configured');
    }

    // Get articles from last 24 hours - keeps content fresh
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // NewsAPI endpoint - using 'everything' for better category coverage
    const apiUrl = `https://newsapi.org/v2/everything?q=${category}&from=${fromDate}&sortBy=publishedAt&pageSize=30&language=en`;
    
    try {
      const newsResponse = await axios.get(
        apiUrl,
        {
          headers: {
            'X-Api-Key': newsApiKey,
          },
        }
      );
      
      if (!newsResponse.data.articles || newsResponse.data.articles.length === 0) {
        // Fallback to top-headlines endpoint if no results - smart retry pattern!
        const backupUrl = `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=30&country=us`;
        
        const backupResponse = await axios.get(backupUrl, {
          headers: { 'X-Api-Key': newsApiKey }
        });
        
        if (!backupResponse.data.articles || backupResponse.data.articles.length === 0) {
          return NextResponse.json({
            status: 'ok',
            totalResults: 0,
            articles: [],
            message: 'No articles found for this category'
          });
        }

        // De-duplicate and filter English-only for backup as well
        const backupDeduped = [] as any[];
        const backupSeen = new Set<string>();
        for (const a of backupResponse.data.articles) {
          if (!a.title) continue;
          const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (backupSeen.has(key)) continue;
          backupSeen.add(key);
          backupDeduped.push(a);
        }

        const backupEnglish = backupDeduped.filter((a) =>
          isLikelyEnglish(`${a.title || ''} ${a.description || ''}`)
        );

        const backupWithSentiment = await processArticles(backupEnglish);

        return NextResponse.json({
          ...backupResponse.data,
          totalResults: backupWithSentiment.length,
          articles: backupWithSentiment,
          message: 'Fetched from backup endpoint'
        });
      }
      
      // De-duplicate articles by normalized title
      const deduped = [] as any[];
      const seenKeys = new Set<string>();
      for (const a of newsResponse.data.articles) {
        if (!a.title) continue;
        const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        deduped.push(a);
      }

      // Filter out likely non-English articles
      const englishOnly = deduped.filter((a) =>
        isLikelyEnglish(`${a.title || ''} ${a.description || ''}`)
      );

      // Process articles with sentiment analysis
      const articlesWithSentiment = await processArticles(englishOnly);
      
      return NextResponse.json({
        ...newsResponse.data,
        totalResults: articlesWithSentiment.length,
        articles: articlesWithSentiment,
      });
      
    } catch (error: any) {
      // Re-throw to be caught by outer catch
      throw error;
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
