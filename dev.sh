#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
DB_URL="postgresql://eventis:eventis@localhost:5433/eventis"
API_PORT=3000

# --- Postgres ---
if ! docker ps --format '{{.Names}}' | grep -q '^eventis-postgres$'; then
  if docker ps -a --format '{{.Names}}' | grep -q '^eventis-postgres$'; then
    echo "▶ Starting existing postgres container..."
    docker start eventis-postgres
  else
    echo "▶ Creating postgres container..."
    docker run -d \
      --name eventis-postgres \
      -e POSTGRES_USER=eventis \
      -e POSTGRES_PASSWORD=eventis \
      -e POSTGRES_DB=eventis \
      -p 5433:5432 \
      postgres:16-alpine
  fi
  echo "⏳ Waiting for postgres..."
  until docker exec eventis-postgres pg_isready -U eventis -q; do sleep 1; done
else
  echo "✅ Postgres already running"
fi

# --- Push schema ---
echo "▶ Pushing DB schema..."
cd "$ROOT/lib/db"
DATABASE_URL=$DB_URL pnpm run push

# --- API server ---
echo "▶ Starting API server on port $API_PORT..."
cd "$ROOT/artifacts/api-server"
DATABASE_URL=$DB_URL PORT=$API_PORT pnpm run dev &
API_PID=$!

# Wait for API to be ready
echo "⏳ Waiting for API..."
until curl -sf http://localhost:$API_PORT/healthz > /dev/null 2>&1; do sleep 1; done
echo "✅ API ready at http://localhost:$API_PORT"

# --- Mobile ---
echo "▶ Starting Expo (mobile)..."
cd "$ROOT/artifacts/mobile"
EXPO_PUBLIC_API_URL=http://localhost:$API_PORT pnpm run dev:local &
MOBILE_PID=$!

echo ""
echo "🚀 All services running:"
echo "   API    → http://localhost:$API_PORT"
echo "   Mobile → Expo DevTools (scan QR or press w for web)"
echo ""
echo "Press Ctrl+C to stop all"

trap "echo ''; echo 'Stopping...'; kill $API_PID $MOBILE_PID 2>/dev/null; exit 0" INT TERM
wait
