import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import NewsFeed from './components/NewsFeed';
import CategoryPage from './pages/CategoryPage';
import './App.css';

const API_URL = 'http://localhost:5000/api/news';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipSentiment, setFlipSentiment] = useState(false);

  const fetchNews = async (category = 'general') => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}?category=${category}`);
      setArticles(response.data.articles);
      setError(null);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFlipSentiment = () => {
    setFlipSentiment(!flipSentiment);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredArticles = flipSentiment
    ? [...articles].sort((a, b) => (a.sentiment?.score || 0) - (b.sentiment?.score || 0))
    : articles;

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar onCategorySelect={fetchNews} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {flipSentiment ? 'Alternative Perspective' : 'Top Headlines'}
            </h1>
            <button
              onClick={handleFlipSentiment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {flipSentiment ? 'Show Original' : 'FLIP Sentiment'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <Routes>
            <Route
              path="/"
              element={
                <NewsFeed
                  articles={filteredArticles}
                  loading={loading}
                />
              }
            />
            <Route
              path="/category/:category"
              element={
                <CategoryPage
                  onLoadCategory={fetchNews}
                  articles={filteredArticles}
                  loading={loading}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
