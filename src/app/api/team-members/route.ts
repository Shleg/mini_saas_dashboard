import { NextResponse } from 'next/server';
import { getTeamMembers } from '@/lib/db';

export async function GET() {
  try {
    const teamMembers = await getTeamMembers();
    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
