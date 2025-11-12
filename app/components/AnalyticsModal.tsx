"use client";

import { useState, useEffect } from "react";
// Using styled divs instead of Card component

interface AnalyticsData {
  totalReads: number;
  totalClicks: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  categoryPreferences: Array<{
    category: string;
    count: number;
  }>;
  feedbackStats: Array<{
    sentiment: string;
    count: number;
  }>;
  recentActivity: Array<{
    articleUrl: string;
    sourceName: string;
    category: string;
    sentiment: number;
    action: string;
    createdAt: string;
  }>;
}

export function AnalyticsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics/user');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getSentimentPercentage = (type: 'positive' | 'negative' | 'neutral') => {
    if (!analytics) return 0;
    const total = analytics.sentimentBreakdown.positive + 
                   analytics.sentimentBreakdown.negative + 
                   analytics.sentimentBreakdown.neutral;
    if (total === 0) return 0;
    return Math.round((analytics.sentimentBreakdown[type] / total) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-purple-600 dark:text-purple-400">Your Reading Analytics</h2>
        
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}
        
        {analytics && !loading && (
          <div className="space-y-6">
            {/* Reading Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-white dark:bg-zinc-800">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Articles Read</h3>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.totalReads}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white dark:bg-zinc-800">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Clicks</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalClicks}</p>
              </div>
            </div>

            {/* Sentiment Distribution */}
            <div className="p-4 border rounded-lg bg-white dark:bg-zinc-800">
              <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Positive</span>
                    <span className="text-sm font-semibold">{getSentimentPercentage('positive')}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getSentimentPercentage('positive')}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Negative</span>
                    <span className="text-sm font-semibold">{getSentimentPercentage('negative')}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getSentimentPercentage('negative')}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Neutral</span>
                    <span className="text-sm font-semibold">{getSentimentPercentage('neutral')}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getSentimentPercentage('neutral')}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Preferences */}
            {analytics.categoryPreferences.length > 0 && (
              <div className="p-4 border rounded-lg bg-white dark:bg-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
                <div className="space-y-2">
                  {analytics.categoryPreferences.slice(0, 5).map((cat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize">{cat.category}</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {cat.count} articles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {analytics.recentActivity.length > 0 && (
              <div className="p-4 border rounded-lg bg-white dark:bg-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 border-b dark:border-gray-700">
                      <div className="flex-1">
                        <span className="font-medium">{activity.action === 'read' ? '📖' : '👆'}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{activity.category || 'uncategorized'}</span>
                        {activity.sourceName && (
                          <span className="ml-2 text-xs text-gray-500">({activity.sourceName})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <h3 className="text-lg font-semibold mb-2">📊 Your Reading Insights</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {analytics.sentimentBreakdown.positive > analytics.sentimentBreakdown.negative 
                  ? "You tend to read more positive news! Great for maintaining an optimistic outlook. 🌟"
                  : analytics.sentimentBreakdown.negative > analytics.sentimentBreakdown.positive
                  ? "You lean towards reading critical or analytical content. Stay informed but don't forget the good news too! 💭"
                  : "You have a balanced reading diet between positive and negative news. Well done! ⚖️"}
              </p>
            </div>
          </div>
        )}

        {!analytics && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No analytics data available yet. Start reading articles to see your stats!</p>
          </div>
        )}
      </div>
    </div>
  );
}
