#!/bin/bash
# Kill any process running on port 5173 (frontend)

PORT=5173
PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
  echo "🛑 Killing process on port $PORT (PID: $PID)"
  kill -9 $PID
  sleep 1
fi

echo "🚀 Starting frontend dev server..."
npm run dev
