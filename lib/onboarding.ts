import { OnboardingStatus } from '@prisma/client';
import axios from 'axios';

import { prisma } from './prisma';

// --- Constants and Types ---

const DAILY_BATCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ASSIGNMENT_COUNT = 7;
const NEWS_CATEGORIES = ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'];

interface NewsApiArticle {
  title: string;
  url: string;
  description?: string;
  urlToImage?: string;
  source?: { name?: string };
  author?: string;
  content?: string;
  publishedAt?: string;
  category?: string; // Added during fetch
}

// --- Reusable Prisma Includes ---

// Define the include for OnboardingArticle with its related Article and Category
const onboardingArticleInclude = {
  include: {
    article: {
      include: {
        category: true
      }
    }
  }
};

// Define the include for OnboardingAssignment with its related OnboardingArticle and Batch
const onboardingAssignmentInclude = {
  include: {
    article: {
      include: {
        article: {
          include: {
            category: true
          }
        }
      }
    },
    batch: true,
  },
};

function pickRandomCategories(count: number) {
  const shuffled = [...NEWS_CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchCandidateArticles(limit = 30): Promise<NewsApiArticle[]> {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('News API key missing. Set NEWS_API_KEY or NEXT_PUBLIC_NEWS_API_KEY.');
  }

  const categories = pickRandomCategories(3);
  const results: NewsApiArticle[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=${Math.ceil(
      limit / categories.length
    )}&apiKey=${apiKey}`;
    const { data } = await axios.get<{ articles: NewsApiArticle[] }>(url);
    const articles = Array.isArray(data.articles) ? data.articles : [];

    for (const article of articles) {
      if (!article?.url || seen.has(article.url)) continue;
      seen.add(article.url);
      results.push({ ...article, category });
    }
  }

  return results.slice(0, limit);
}

export async function getActiveOnboardingBatch() {
  return prisma.onboardingBatch.findFirst({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { generatedAt: 'desc' },
    include: {
      articles: onboardingArticleInclude,
    },
  });
}

export async function generateOnboardingBatch(force = false) {
  const currentBatch = await getActiveOnboardingBatch();
  if (currentBatch && !force) {
    return { created: false, batch: currentBatch };
  }

  const articles = await fetchCandidateArticles(30);
  if (articles.length < DEFAULT_ASSIGNMENT_COUNT) {
    throw new Error('Not enough articles returned to build onboarding batch.');
  }

  const onboardingArticleData = [] as {
    articleId: string;
    title: string;
    description?: string;
    url: string;
    sourceName?: string;
    category?: string;
    urlToImage?: string;
    publishedAt?: Date;
  }[];

  for (const article of articles) {
    const dbArticle = await prisma.article.upsert({
  where: { url: article.url },
  update: {
    title: article.title || article.url,
    description: article.description || '',
    urlToImage: article.urlToImage || null,
    sourceName: article.source?.name || 'Unknown',
    author: article.author || null,
    content: article.content || null,
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
  },
  create: {
    title: article.title || article.url,
    description: article.description || '',
    url: article.url,
    urlToImage: article.urlToImage || null,
    sourceName: article.source?.name || 'Unknown',
    author: article.author || null,
    content: article.content || null,
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    sentiment: 0,
    magnitude: 0,
  },
});

    let categoryName: string | undefined;
    if (dbArticle.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: dbArticle.categoryId } });
      categoryName = cat?.name;
    }

    onboardingArticleData.push({
      articleId: dbArticle.id,
      title: article.title || dbArticle.title,
      description: article.description || '',
      url: article.url,
      sourceName: article.source?.name || dbArticle.sourceName || 'Unknown',
      category: article.category || categoryName || undefined,
      urlToImage: article.urlToImage || dbArticle.urlToImage || undefined,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : dbArticle.publishedAt,
    });
  }

  const batch = await prisma.onboardingBatch.create({
    data: {
      expiresAt: new Date(Date.now() + DAILY_BATCH_INTERVAL_MS),
      articles: {
        create: onboardingArticleData.map((article) => ({
          title: article.title,
          description: article.description,
          url: article.url,
          sourceName: article.sourceName,
          category: article.category,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          article: {
            connect: { id: article.articleId },
          },
        })),
      },
    },
    include: {
      articles: {
        include: {
          article: true,
        },
      },
    },
  });

  return { created: true, batch };
}

async function ensureActiveBatch() {
  const current = await getActiveOnboardingBatch();
  if (current) return current;
  const { batch } = await generateOnboardingBatch(true);
  return batch;
}

export async function getUserOnboardingAssignments(userId: string) {
  return prisma.onboardingAssignment.findMany({
    where: { userId },
    ...onboardingAssignmentInclude,
    orderBy: [{ createdAt: 'asc' }],
  });
}

export async function assignOnboardingArticlesToUser(userId: string, desiredCount = DEFAULT_ASSIGNMENT_COUNT) {
  const batch = await ensureActiveBatch();

  const existingAssignments = await prisma.onboardingAssignment.findMany({
    where: { userId, batchId: batch.id },
    include: {
      article: {
        include: {
          article: {
            include: {
              category: true
            }
          }
        }
      }
    },
  });

  const missingCount = Math.max(0, desiredCount - existingAssignments.length);
  if (missingCount > 0) {
    const alreadyAssigned = new Set(existingAssignments.map((assignment) => assignment.articleId));
    const available = batch.articles.filter((article) => !alreadyAssigned.has(article.id));
    const selected = shuffleArray(available).slice(0, missingCount);

    await Promise.all(
      selected.map((article) =>
        prisma.onboardingAssignment.create({
          data: {
            userId,
            batchId: batch.id,
            articleId: article.id,
          },
        })
      )
    );
  }

  return prisma.onboardingAssignment.findMany({
    where: { userId, batchId: batch.id },
    ...onboardingAssignmentInclude,
    orderBy: [{ createdAt: 'asc' }],
  });
}

function interestDelta(status: OnboardingStatus) {
  if (status === OnboardingStatus.LIKED) return 1;
  if (status === OnboardingStatus.DISLIKED) return -1;
  return 0;
}

export async function recordOnboardingResponse(userId: string, assignmentId: string, status: OnboardingStatus) {
  const assignment = await prisma.onboardingAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      article: {
        include: {
          article: {
            include: {
              category: true
            }
          }
        }
      }
    },
  });

  if (!assignment || assignment.userId !== userId) {
    throw new Error('Assignment not found');
  }

  if (assignment.status === status) {
    return assignment;
  }

  const updatedAssignment = await prisma.onboardingAssignment.update({
    where: { id: assignmentId },
    data: { status },
    include: {
      article: {
        include: {
          article: {
            include: {
              category: true
            }
          }
        }
      }
    },
  });

  const delta = interestDelta(status);
const topic = updatedAssignment.article.category || 
             (updatedAssignment.article.article?.category?.name ?? null);

  if (delta !== 0 && topic) {
    await prisma.userInterest.upsert({
      where: {
        userId_topic: {
          userId,
          topic,
        },
      },
      update: {
        score: { increment: delta },
      },
      create: {
        userId,
        topic,
        score: delta,
      },
    });
  }

  const pendingCount = await prisma.onboardingAssignment.count({
    where: {
      userId,
      status: OnboardingStatus.PENDING,
    },
  });

  if (pendingCount === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });
  }

  return updatedAssignment;
}  
