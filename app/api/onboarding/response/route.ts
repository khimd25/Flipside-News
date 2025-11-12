import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { recordOnboardingResponse } from '@/lib/onboarding';
import { OnboardingStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { assignmentId, status } = await request.json();
    
    if (!assignmentId || !Object.values(OnboardingStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const updatedAssignment = await recordOnboardingResponse(
      session.user.id,
      assignmentId,
      status as OnboardingStatus
    );

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error: any) {
    console.error('Error recording onboarding response:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record response' },
      { status: 500 }
    );
  }
}