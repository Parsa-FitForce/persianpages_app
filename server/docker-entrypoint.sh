#!/bin/sh
set -e

echo "Waiting for database..."
sleep 3

echo "Running database migrations..."
npx prisma db push

echo "Seeding database..."
npm run db:seed

echo "Starting server..."
exec npm run dev
