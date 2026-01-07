# Mini SaaS Dashboard

A full-stack project management dashboard built with Next.js, PostgreSQL, and Docker. This application allows you to manage projects with features like filtering, searching, and CRUD operations.

## Features

- **Project Management**: List, create, edit, and delete projects
- **Filtering**: Filter projects by status (active, on_hold, completed)
- **Search**: Search projects by team member name
- **Authentication**: JWT-based authentication with HttpOnly cookies
- **Responsive UI**: Clean and modern interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16
- **Authentication**: JWT (jose library)
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (for cloning the repository)

## Quick Start

### One-Command Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mini_saas_dashboard
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

   **Note**: The `.env` file should contain:
   - `DATABASE_URL=postgresql://app:app@db:5432/app` (for Docker)
   - `JWT_SECRET` - A long random string (minimum 32 characters) for JWT signing

3. Start the application:
   ```bash
   docker compose up --build
   ```

   This single command will:
   - Build the Next.js application
   - Start PostgreSQL database
   - Automatically create the database schema
   - Seed the database with team members from JSONPlaceholder API and sample projects
   - Start the Next.js server

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Demo Credentials

- **Email**: `admin@example.com`
- **Password**: `admin12345`

## Database Seeding

The seed script automatically:
- Fetches 10 team members from [JSONPlaceholder](https://jsonplaceholder.typicode.com/users)
- Creates 30-50 random projects with:
  - Random status (active, on_hold, completed)
  - Random deadlines (between -30 and +90 days from today)
  - Random budgets (between $500 and $20,000)
  - Random team member assignments
- Creates a demo user for authentication

The seed script is **idempotent** - it's safe to run multiple times. It will:
- Upsert team members by email
- Delete and recreate all projects
- Upsert the demo user

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout (clears session cookie)

### Team Members
- `GET /api/team-members` - Get all team members (public)

### Projects (Protected - requires authentication)
- `GET /api/projects?status=&q=` - List projects with optional filters
  - `status`: Filter by status (active, on_hold, completed)
  - `q`: Search by team member name (case-insensitive)
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

## Project Schema

Each project has the following fields:
- **status**: `'active' | 'on_hold' | 'completed'`
- **deadline**: Date (YYYY-MM-DD format)
- **team_member_id**: Foreign key to team_members table
- **budget**: Integer (non-negative)

## Development

### Running Locally (without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL locally or use Docker for DB only:
   ```bash
   docker compose up db
   ```

3. Set up environment variables in `.env`:
   ```
   DATABASE_URL=postgresql://app:app@localhost:5432/app
   JWT_SECRET=your-secret-key-here
   ```

4. Run the seed script:
   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
mini_saas_dashboard/
├── db/
│   └── init/
│       └── 001_schema.sql          # Database schema
├── docker/
│   └── entrypoint.sh               # Docker entrypoint script
├── scripts/
│   └── seed.ts                    # Database seeding script
├── src/
│   ├── app/
│   │   ├── api/                   # API routes
│   │   │   ├── auth/              # Authentication endpoints
│   │   │   ├── projects/          # Project CRUD endpoints
│   │   │   └── team-members/     # Team members endpoint
│   │   ├── login/                 # Login page
│   │   └── page.tsx               # Dashboard page
│   ├── lib/
│   │   ├── auth.ts                # JWT helpers
│   │   └── db.ts                  # Database access layer
│   └── middleware.ts              # Auth middleware
├── docker-compose.yml               # Docker Compose configuration
├── Dockerfile                      # Docker image definition
└── package.json
```

## Assumptions & Notes

- Search functionality searches by team member name (case-insensitive, partial match)
- All project endpoints require authentication (except team-members endpoint)
- Authentication uses HttpOnly cookies for security
- JWT tokens expire after 7 days
- The seed script uses JSONPlaceholder API for team member data
- Database schema is automatically created on first PostgreSQL startup via init scripts

## Troubleshooting

### Port already in use
If port 3000 or 5432 is already in use, you can modify the ports in `docker-compose.yml`.

### Database connection errors
Make sure the `DATABASE_URL` in `.env` uses `db` as the hostname (for Docker) or `localhost` (for local development).

### Seed script fails
Check that:
- PostgreSQL is running and healthy
- The database URL is correct
- Network connectivity to JSONPlaceholder API is available

## License

This project is created as a demonstration project.
