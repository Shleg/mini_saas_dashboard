import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listProjects, createProject } from '@/lib/db';

const createProjectSchema = z.object({
  status: z.enum(['active', 'on_hold', 'completed']),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().int().min(0),
  teamMemberId: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;

    if (status && !['active', 'on_hold', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const projects = await listProjects({ status, q });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    const project = await createProject({
      status: validated.status,
      deadline: validated.deadline,
      budget: validated.budget,
      teamMemberId: validated.teamMemberId,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
