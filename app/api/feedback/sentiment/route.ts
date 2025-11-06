import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const urlsParam = searchParams.get('urls');
    if (!urlsParam) {
      return NextResponse.json({ feedback: {} }, { status: 200 });
    }
    const urls = Array.from(new Set(urlsParam.split(',').map(decodeURIComponent))).slice(0, 100);

    const rows = await prisma.sentimentFeedback.findMany({
      where: { userId: session.user.id, articleUrl: { in: urls } },
      select: { articleUrl: true, userSentiment: true },
    });

    const feedback: Record<string, 'POSITIVE'|'NEUTRAL'|'NEGATIVE'> = {};
    for (const r of rows) feedback[r.articleUrl] = r.userSentiment;

    return NextResponse.json({ feedback }, { status: 200 });
  } catch (e) {
    console.error('GET /api/feedback/sentiment error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, sourceName, sentiment } = body as { url?: string; sourceName?: string; sentiment?: 'POSITIVE'|'NEUTRAL'|'NEGATIVE' };

    if (!url || !sentiment || !['POSITIVE','NEUTRAL','NEGATIVE'].includes(sentiment)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const saved = await prisma.sentimentFeedback.upsert({
      where: { userId_articleUrl: { userId: session.user.id, articleUrl: url } },
      update: { userSentiment: sentiment as any, sourceName },
      create: { userId: session.user.id, articleUrl: url, sourceName, userSentiment: sentiment as any },
      select: { articleUrl: true, userSentiment: true },
    });

    return NextResponse.json({ feedback: saved }, { status: 200 });
  } catch (e) {
    console.error('POST /api/feedback/sentiment error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
