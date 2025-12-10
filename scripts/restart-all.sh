#!/bin/bash
# Kill both frontend and backend processes, then restart all

# Source PATH for npm/node
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/*/bin:$PATH"
source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

FRONTEND_PORT=5173
BACKEND_PORT=3001

echo "🛑 Stopping all services..."

# Kill frontend
FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
  echo "   Killing frontend on port $FRONTEND_PORT (PID: $FRONTEND_PID)"
  kill -9 $FRONTEND_PID 2>/dev/null
fi

# Kill backend
BACKEND_PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
  echo "   Killing backend on port $BACKEND_PORT (PID: $BACKEND_PID)"
  kill -9 $BACKEND_PID 2>/dev/null
fi

sleep 1

echo "🚀 Starting all services..."
echo ""

# Start backend in background
echo "Starting backend..."
node server/index.js &
sleep 2

# Start frontend in foreground
echo "Starting frontend..."
npm run dev
