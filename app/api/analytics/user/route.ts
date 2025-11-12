import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get total interactions
    const totalReads = await prisma.userArticleInteraction.count({
      where: { userId, action: 'read' }
    });

    const totalClicks = await prisma.userArticleInteraction.count({
      where: { userId, action: 'click' }
    });

    // Get sentiment distribution from interactions
    const sentimentStats = await prisma.userArticleInteraction.groupBy({
      by: ['sentiment'],
      where: {
        userId,
        sentiment: { not: null },
        action: 'read'
      },
      _count: { sentiment: true },
      orderBy: { sentiment: 'asc' }
    });

    // Calculate positive/negative ratios
    const positiveCount = sentimentStats.filter(s => s.sentiment && s.sentiment > 0).reduce((sum, s) => sum + s._count.sentiment, 0);
    const negativeCount = sentimentStats.filter(s => s.sentiment && s.sentiment < 0).reduce((sum, s) => sum + s._count.sentiment, 0);
    const neutralCount = sentimentStats.filter(s => s.sentiment === 0).reduce((sum, s) => sum + s._count.sentiment, 0);

    // Get category preferences
    const categoryStats = await prisma.userArticleInteraction.groupBy({
      by: ['category'],
      where: {
        userId,
        category: { not: null },
        action: 'read'
      },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    });

    // Get sentiment feedback stats
    const feedbackStats = await prisma.sentimentFeedback.groupBy({
      by: ['userSentiment'],
      where: { userId },
      _count: { userSentiment: true }
    });

    // Get recent activity (last 10 interactions)
    const recentActivity = await prisma.userArticleInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        articleUrl: true,
        sourceName: true,
        category: true,
        sentiment: true,
        action: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      totalReads,
      totalClicks,
      sentimentBreakdown: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount
      },
      categoryPreferences: categoryStats.map(cat => ({
        category: cat.category,
        count: cat._count.category
      })),
      feedbackStats: feedbackStats.map(f => ({
        sentiment: f.userSentiment,
        count: f._count.userSentiment
      })),
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
