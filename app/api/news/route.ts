import { NextResponse } from 'next/server';
import axios from 'axios';
import { LanguageServiceClient } from '@google-cloud/language';
import { auth } from 'google-auth-library';

// Initialize the Google Cloud Language client
let languageClient;

try {
  // Try to load credentials from environment variable
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : null;

  if (credentials) {
    // Create a client with explicit credentials
    languageClient = new LanguageServiceClient({
      projectId: credentials.project_id,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n') // Ensure proper line breaks
      }
    });
    console.log('Google Cloud Language client initialized with explicit credentials');
  } else {
    // Fall back to default credentials if available
    languageClient = new LanguageServiceClient();
    console.log('Google Cloud Language client initialized with default credentials');
  }
} catch (error) {
  console.error('Error initializing Google Cloud Language client:', error);
  // Don't throw an error, we'll handle missing client in the analyzeSentiment function
  languageClient = null;
}

// Function to analyze sentiment of a text
async function analyzeSentiment(text: string) {
  if (!text || !text.trim()) {
    console.log('Empty or invalid text provided for sentiment analysis');
    return { score: 0, magnitude: 0 };
  }

  // If language client failed to initialize, return neutral sentiment
  if (!languageClient) {
    console.warn('Google Cloud Language client not initialized, returning neutral sentiment');
    return { score: 0, magnitude: 0 };
  }

  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    console.log('Sending text for sentiment analysis:', text.substring(0, 100) + '...');
    
    // Add a timeout to prevent hanging
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
      
      console.log('Received sentiment analysis:', {
        score: sentiment?.score,
        magnitude: sentiment?.magnitude,
        language: result.language
      });
      
      return {
        score: sentiment?.score || 0, // Range from -1.0 to 1.0
        magnitude: sentiment?.magnitude || 0, // Non-negative number
      };
    } catch (apiError) {
      clearTimeout(timeoutId);
      throw apiError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Error in analyzeSentiment:', {
      error: error.message,
      errorStack: error.stack,
      textLength: text?.length,
      textStart: text?.substring(0, 100)
    });
    
    // Return neutral sentiment if analysis fails
    return {
      score: 0,
      magnitude: 0,
    };
  }
}

// Function to process articles and add sentiment analysis
async function processArticles(articles: any[]) {
  if (!articles || !Array.isArray(articles)) {
    console.error('Invalid articles array provided to processArticles');
    return [];
  }

  console.log(`Processing ${articles.length} articles for sentiment analysis`);
  
  // Process articles in parallel with a limit to avoid rate limiting
  const processedArticles = await Promise.all(
    articles.map(async (article, index) => {
      const articleId = article.url || `article-${index}`;
      console.log(`Processing article [${index + 1}/${articles.length}]:`, article.title);
      
      try {
        if (!article.title) {
          console.warn(`Article ${articleId} has no title, skipping sentiment analysis`);
          return {
            ...article,
            sentiment: { score: 0, magnitude: 0 },
          };
        }

        // Combine title and description for better sentiment analysis
        const textToAnalyze = `${article.title}. ${article.description || ''}`.substring(0, 5000);
        console.log(`Analyzing sentiment for: ${textToAnalyze.substring(0, 100)}...`);
        
        // Get sentiment analysis
        const sentiment = await analyzeSentiment(textToAnalyze);
        
        console.log(`Processed article [${index + 1}/${articles.length}]:`, {
          title: article.title.substring(0, 50) + '...',
          sentiment
        });
        
        return {
          ...article,
          sentiment,
        };
      } catch (error) {
        console.error(`Error processing article [${index + 1}/${articles.length}]:`, {
          title: article.title,
          error: error.message,
          errorStack: error.stack
        });
        // Return article with neutral sentiment if processing fails
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

  console.log(`Successfully processed ${processedArticles.length} articles`);
  return processedArticles;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'general';
  
  console.log('Fetching news for category:', category);
  
  try {
    // Fetch news from NewsAPI
    const newsApiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
    console.log('Using News API key:', newsApiKey ? '***' + newsApiKey.slice(-4) : 'Not found');
    
    if (!newsApiKey) {
      console.error('Error: News API key not found in environment variables');
      throw new Error('News API key not configured');
    }

    // Calculate date for 24 hours ago
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    console.log('Making request to NewsAPI...');
    const apiUrl = `https://newsapi.org/v2/everything?q=${category}&from=${fromDate}&sortBy=publishedAt&pageSize=30&language=en`;
    console.log('NewsAPI URL:', apiUrl);
    
    try {
      const newsResponse = await axios.get(
        apiUrl,
        {
          headers: {
            'X-Api-Key': newsApiKey,
          },
        }
      );
      
      console.log('NewsAPI response status:', newsResponse.status);
      console.log('NewsAPI response data:', {
        status: newsResponse.data.status,
        totalResults: newsResponse.data.totalResults,
        articlesCount: newsResponse.data.articles?.length || 0,
        firstArticle: newsResponse.data.articles?.[0]?.title || 'No articles'
      });
      
      if (!newsResponse.data.articles || newsResponse.data.articles.length === 0) {
        console.warn('No articles found for category:', category);
        // Try with a broader search if no articles found
        const backupUrl = `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=30&country=us`;
        console.log('Trying backup URL:', backupUrl);
        
        const backupResponse = await axios.get(backupUrl, {
          headers: { 'X-Api-Key': newsApiKey }
        });
        
        if (!backupResponse.data.articles || backupResponse.data.articles.length === 0) {
          console.warn('No articles found in backup request');
          return NextResponse.json({
            status: 'ok',
            totalResults: 0,
            articles: [],
            message: 'No articles found for this category'
          });
        }
        
        return NextResponse.json({
          ...backupResponse.data,
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

      // Process articles with sentiment analysis
      const articlesWithSentiment = await processArticles(deduped);
      
      return NextResponse.json({
        ...newsResponse.data,
        totalResults: articlesWithSentiment.length,
        articles: articlesWithSentiment,
      });
      
    } catch (error: any) {
      console.error('Error fetching news:', error.message);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw error;
    }

  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
