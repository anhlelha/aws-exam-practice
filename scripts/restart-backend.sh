#!/bin/bash
# Kill any process running on port 3001 (backend)

PORT=3001
PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
  echo "🛑 Killing process on port $PORT (PID: $PID)"
  kill -9 $PID
  sleep 1
fi

echo "🚀 Starting backend server..."
npm run server
