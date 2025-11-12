import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { articleUrl, sourceName, category, sentiment, action } = body;

    if (!articleUrl || !action) {
      return NextResponse.json({ error: 'articleUrl and action are required' }, { status: 400 });
    }

    if (!['read', 'click'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "read" or "click"' }, { status: 400 });
    }

    await prisma.userArticleInteraction.create({
      data: {
        userId,
        articleUrl,
        sourceName,
        category,
        sentiment,
        action,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging interaction:', error);
    return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 });
  }
}
