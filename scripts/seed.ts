import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/app';

const sql = postgres(DATABASE_URL);

interface JSONPlaceholderUser {
  id: number;
  name: string;
  email: string;
}

async function seed() {
  try {
    console.log('Starting seed...');

    // 1. Fetch team members from JSONPlaceholder
    console.log('Fetching team members from JSONPlaceholder...');
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    const users: JSONPlaceholderUser[] = await response.json();

    // 2. Upsert team members by email
    console.log('Upserting team members...');
    for (const user of users) {
      await sql`
        INSERT INTO team_members (name, email, created_at, updated_at)
        VALUES (${user.name}, ${user.email}, now(), now())
        ON CONFLICT (email) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          updated_at = now()
      `;
    }

    // Get all team member IDs
    const teamMembers = await sql`
      SELECT id FROM team_members
    `;

    if (teamMembers.length === 0) {
      throw new Error('No team members found');
    }

    // 3. Delete all existing projects (for idempotency)
    console.log('Clearing existing projects...');
    await sql`DELETE FROM projects`;

    // 4. Insert 30-50 projects
    const projectCount = Math.floor(Math.random() * 21) + 30; // 30-50
    const statuses = ['active', 'on_hold', 'completed'] as const;
    
    console.log(`Creating ${projectCount} projects...`);
    const today = new Date();
    
    for (let i = 0; i < projectCount; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const randomTeamMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];
      
      // Random deadline between -30 days and +90 days
      const daysOffset = Math.floor(Math.random() * 121) - 30; // -30 to +90
      const deadline = new Date(today);
      deadline.setDate(today.getDate() + daysOffset);
      
      // Random budget between 500 and 20000
      const budget = Math.floor(Math.random() * 19501) + 500;
      
      await sql`
        INSERT INTO projects (status, deadline, budget, team_member_id, created_at, updated_at)
        VALUES (${status}, ${deadline.toISOString().split('T')[0]}, ${budget}, ${randomTeamMember.id}, now(), now())
      `;
    }

    // 5. Create/Upsert demo user
    console.log('Creating demo user...');
    const demoEmail = 'admin@example.com';
    const demoPassword = 'admin12345';
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    
    await sql`
      INSERT INTO users (email, password_hash, created_at, updated_at)
      VALUES (${demoEmail}, ${passwordHash}, now(), now())
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = now()
    `;

    console.log('Seed completed successfully!');
    console.log(`- ${users.length} team members`);
    console.log(`- ${projectCount} projects`);
    console.log(`- Demo user: ${demoEmail} / ${demoPassword}`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seed()
  .then(() => {
    console.log('Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script error:', error);
    process.exit(1);
  });
