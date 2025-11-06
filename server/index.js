require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
const language = require('@google-cloud/language');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Natural Language client
const languageClient = new language.LanguageServiceClient();

// News API endpoint
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';

// Get top headlines
app.get('/api/news', async (req, res) => {
  try {
    const { category = 'general', country = 'us', pageSize = 10 } = req.query;
    const url = `${NEWS_API_URL}?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Add sentiment analysis to articles
    const articlesWithSentiment = await Promise.all(
      data.articles.map(async (article) => {
        const sentiment = await analyzeSentiment(article.description || article.title);
        return {
          ...article,
          sentiment
        };
      })
    );
    
    res.json({ articles: articlesWithSentiment });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Analyze text sentiment using Google Cloud Natural Language API
async function analyzeSentiment(text) {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    const [result] = await languageClient.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;
    
    return {
      score: sentiment.score,
      magnitude: sentiment.magnitude,
      label: sentiment.score >= 0 ? 'positive' : 'negative'
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return { score: 0, magnitude: 0, label: 'neutral' };
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
