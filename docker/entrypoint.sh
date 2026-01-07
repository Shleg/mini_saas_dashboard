#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for postgres to be ready
until pg_isready -h db -U app -d app; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing seed script..."

# Run seed script (now JavaScript, no tsx needed)
npm run seed

echo "Starting Next.js application..."

# Start Next.js in standalone mode
# In standalone mode, .next/standalone contains server.js
# We copy .next/standalone to /app, so server.js should be at /app/server.js
cd /app

# Check if server.js exists in current directory (should be there after copying standalone)
if [ -f server.js ]; then
  echo "Found server.js in /app"
  exec node server.js
else
  echo "Error: server.js not found in /app"
  echo "This means .next/standalone was not copied correctly or Next.js standalone build failed"
  echo "Contents of /app:"
  ls -la /app
  echo ""
  echo "Checking if .next/standalone exists:"
  if [ -d .next/standalone ]; then
    echo ".next/standalone directory exists"
    ls -la .next/standalone | head -10
  else
    echo ".next/standalone directory not found"
  fi
  exit 1
fi
