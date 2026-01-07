#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for postgres to be ready
until pg_isready -h db -U app -d app; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing seed script..."

# Run seed script
npm run seed

echo "Starting Next.js application..."

# Start Next.js in standalone mode
# In standalone mode, server.js should be in /app after copying .next/standalone
cd /app
exec node server.js
