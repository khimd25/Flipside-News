import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { assignOnboardingArticlesToUser, getUserOnboardingAssignments } from '@/lib/onboarding';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to get existing assignments first
    let assignments = await getUserOnboardingAssignments(session.user.id);
    
    // If no assignments, create new ones
    if (assignments.length === 0) {
      assignments = await assignOnboardingArticlesToUser(session.user.id);
    }

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching onboarding articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding articles' },
      { status: 500 }
    );
  }
}