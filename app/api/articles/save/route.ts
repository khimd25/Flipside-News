import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { article } = await request.json();
    
    if (!article || !article.url || !article.title) {
      return NextResponse.json({ error: 'Invalid article data' }, { status: 400 });
    }

    // Check if article already exists
    let dbArticle = await prisma.article.findUnique({
      where: { url: article.url }
    });

    // Create article if it doesn't exist
    if (!dbArticle) {
      dbArticle = await prisma.article.create({
        data: {
          title: article.title,
          description: article.description || '',
          url: article.url,
          urlToImage: article.urlToImage || '',
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
          sourceName: typeof article.source === 'object' ? article.source.name : article.source || 'Unknown',
          author: article.author || '',
          content: article.content || '',
          sentiment: article.sentiment?.score || 0,
          magnitude: article.sentiment?.magnitude || 0,
        }
      });
    }

    // Save article for user
    const savedArticle = await prisma.savedArticle.upsert({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId: dbArticle.id
        }
      },
      update: {
        isFavorite: true
      },
      create: {
        userId: session.user.id,
        articleId: dbArticle.id,
        isFavorite: true
      },
      include: {
        article: true
      }
    });

    return NextResponse.json({ savedArticle });
  } catch (error) {
    console.error('Error saving article:', error);
    return NextResponse.json(
      { error: 'Failed to save article' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const savedArticles = await prisma.savedArticle.findMany({
      where: {
        userId: session.user.id,
        isFavorite: true
      },
      include: {
        article: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ savedArticles });
  } catch (error) {
    console.error('Error fetching saved articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved articles' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId } = await request.json();
    
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    // Try to find by ID first (if articleId is a Prisma ID)
    let savedArticle = await prisma.savedArticle.findFirst({
      where: {
        id: articleId,
        userId: session.user.id
      }
    });

    // If not found by ID, try to find by article URL
    if (!savedArticle) {
      savedArticle = await prisma.savedArticle.findFirst({
        where: {
          OR: [
            { articleId: articleId, userId: session.user.id },
            { 
              article: {
                url: articleId
              },
              userId: session.user.id
            }
          ]
        }
      });
    }

    if (!savedArticle) {
      return NextResponse.json({ error: 'Saved article not found' }, { status: 404 });
    }

    // Delete the saved article
    await prisma.savedArticle.delete({
      where: {
        id: savedArticle.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing saved article:', error);
    return NextResponse.json(
      { error: 'Failed to remove saved article' },
      { status: 500 }
    );
  }
}
