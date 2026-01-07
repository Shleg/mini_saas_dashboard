import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/app';

const sql = postgres(DATABASE_URL);

export type ProjectStatus = 'active' | 'on_hold' | 'completed';

export interface TeamMember {
  id: number;
  name: string;
}

export interface ProjectRow {
  id: number;
  status: ProjectStatus;
  deadline: string; // ISO date string
  budget: number;
  team_member_id: number;
  team_member_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDTO {
  id: number;
  status: ProjectStatus;
  deadline: string;
  budget: number;
  teamMember: {
    id: number;
    name: string;
  };
}

export interface CreateProjectInput {
  status: ProjectStatus;
  deadline: string;
  budget: number;
  teamMemberId: number;
}

export interface UpdateProjectInput {
  status?: ProjectStatus;
  deadline?: string;
  budget?: number;
  teamMemberId?: number;
}

// Team members
export async function getTeamMembers(): Promise<TeamMember[]> {
  const result = await sql<TeamMember[]>`
    SELECT id, name
    FROM team_members
    ORDER BY name ASC
  `;
  return result;
}

// Projects
export async function listProjects(params: { status?: string; q?: string }): Promise<ProjectRow[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.status) {
    conditions.push(`p.status = $${paramIndex++}`);
    values.push(params.status);
  }

  if (params.q) {
    conditions.push(`tm.name ILIKE $${paramIndex++}`);
    values.push(`%${params.q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT 
      p.id,
      p.status,
      p.deadline,
      p.budget,
      p.team_member_id,
      tm.name as team_member_name,
      p.created_at,
      p.updated_at
    FROM projects p
    INNER JOIN team_members tm ON p.team_member_id = tm.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `;

  const result = await sql.unsafe<ProjectRow[]>(query, values);
  return result;
}

export async function getProjectById(id: number): Promise<ProjectRow | null> {
  const result = await sql<ProjectRow[]>`
    SELECT 
      p.id,
      p.status,
      p.deadline,
      p.budget,
      p.team_member_id,
      tm.name as team_member_name,
      p.created_at,
      p.updated_at
    FROM projects p
    INNER JOIN team_members tm ON p.team_member_id = tm.id
    WHERE p.id = ${id}
    LIMIT 1
  `;
  return (result.length > 0 ? result[0] : null) as ProjectRow | null;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const result = await sql<Array<{
    id: number;
    status: ProjectStatus;
    deadline: string;
    budget: number;
    team_member_id: number;
    created_at: string;
    updated_at: string;
  }>>`
    INSERT INTO projects (status, deadline, budget, team_member_id, created_at, updated_at)
    VALUES (${input.status}, ${input.deadline}, ${input.budget}, ${input.teamMemberId}, now(), now())
    RETURNING 
      id,
      status,
      deadline,
      budget,
      team_member_id,
      created_at,
      updated_at
  `;

  const project = result[0];
  
  // Get team member name
  const teamMember = await sql<Array<{ name: string }>>`
    SELECT name FROM team_members WHERE id = ${input.teamMemberId}
  `;

  return {
    ...project,
    team_member_name: teamMember[0].name,
  } as ProjectRow;
}

export async function updateProject(id: number, input: UpdateProjectInput): Promise<ProjectRow | null> {
  if (Object.keys(input).length === 0) {
    return getProjectById(id);
  }

  // Build update query dynamically
  const setParts: string[] = [];
  const values: any[] = [];
  
  if (input.status !== undefined) {
    setParts.push(`status = $${values.length + 1}`);
    values.push(input.status);
  }
  if (input.deadline !== undefined) {
    setParts.push(`deadline = $${values.length + 1}`);
    values.push(input.deadline);
  }
  if (input.budget !== undefined) {
    setParts.push(`budget = $${values.length + 1}`);
    values.push(input.budget);
  }
  if (input.teamMemberId !== undefined) {
    setParts.push(`team_member_id = $${values.length + 1}`);
    values.push(input.teamMemberId);
  }

  setParts.push(`updated_at = now()`);
  values.push(id);

  const query = `
    UPDATE projects
    SET ${setParts.join(', ')}
    WHERE id = $${values.length}
    RETURNING 
      id,
      status,
      deadline,
      budget,
      team_member_id,
      created_at,
      updated_at
  `;

  const result = await sql.unsafe<Array<{
    id: number;
    status: ProjectStatus;
    deadline: string;
    budget: number;
    team_member_id: number;
    created_at: string;
    updated_at: string;
  }>>(query, values);
  
  if (result.length === 0) {
    return null;
  }

  const project = result[0];
  const teamMemberId = input.teamMemberId !== undefined ? input.teamMemberId : project.team_member_id;
  
  // Get team member name
  const teamMember = await sql<Array<{ name: string }>>`
    SELECT name FROM team_members WHERE id = ${teamMemberId}
  `;

  return {
    ...project,
    team_member_name: teamMember[0].name,
  } as ProjectRow;
}

export async function deleteProject(id: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM projects
    WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

// Users (for auth)
export interface User {
  id: number;
  email: string;
  password_hash: string;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql<User[]>`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}
