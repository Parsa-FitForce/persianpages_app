#!/bin/sh
set -e

echo "=== PersianPages Production Startup ==="

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Could not connect to database after $max_attempts attempts"
    exit 1
fi

# Sync database schema
echo "Syncing database schema..."
npx prisma db push --skip-generate

# Seed database (idempotent - uses upsert)
echo "Seeding database..."
node prisma/seed.js

echo "Starting server..."
exec npm start
