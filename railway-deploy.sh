#!/bin/bash
# Railway deploy script
echo "Installing server deps..."
cd server && npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Running migrations..."
npx prisma db push

echo "Seeding database (only if empty)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { if(c === 0) { require('./prisma/seed'); } else { console.log('DB ya tiene datos, skip seed'); process.exit(0); } });
"

echo "Starting server..."
node src/index.js
