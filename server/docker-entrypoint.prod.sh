#!/bin/sh
set -e

echo "=== PersianPages Production Startup ==="

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
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

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed database (only if needed)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "Seeding database..."
    npm run db:seed
fi

echo "Starting server..."
exec npm start
