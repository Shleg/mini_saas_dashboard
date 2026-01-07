#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for postgres to be ready
until pg_isready -h db -U app -d app; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing seed script..."

# Run seed script using npx to find tsx in node_modules
# Use full path to node_modules/.bin/tsx as fallback
if [ -f node_modules/.bin/tsx ]; then
  node_modules/.bin/tsx scripts/seed.ts
elif command -v npx >/dev/null 2>&1; then
  npx tsx scripts/seed.ts
else
  echo "Error: tsx not found. Trying npm run seed..."
  npm run seed
fi

echo "Starting Next.js application..."

# Start Next.js in standalone mode
# In standalone mode, server.js should be in /app after copying .next/standalone
cd /app

# Debug: list files to see structure
echo "Checking for server.js..."
if [ -f server.js ]; then
  echo "Found server.js in /app"
  exec node server.js
elif [ -f .next/standalone/server.js ]; then
  echo "Found server.js in .next/standalone"
  exec node .next/standalone/server.js
else
  echo "Error: server.js not found"
  echo "Contents of /app:"
  ls -la /app | head -20
  echo "Looking for server.js..."
  find /app -name "server.js" -type f 2>/dev/null | head -10
  exit 1
fi
