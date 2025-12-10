#!/bin/bash
# Stop all services (kill frontend and backend)

FRONTEND_PORT=5173
BACKEND_PORT=3001

echo "🛑 Stopping all services..."

# Kill frontend
FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT)
if [ -n "$FRONTEND_PID" ]; then
  echo "   Killing frontend on port $FRONTEND_PORT (PID: $FRONTEND_PID)"
  kill -9 $FRONTEND_PID
  echo "   ✅ Frontend stopped"
else
  echo "   ℹ️  Frontend not running"
fi

# Kill backend
BACKEND_PID=$(lsof -ti:$BACKEND_PORT)
if [ -n "$BACKEND_PID" ]; then
  echo "   Killing backend on port $BACKEND_PORT (PID: $BACKEND_PID)"
  kill -9 $BACKEND_PID
  echo "   ✅ Backend stopped"
else
  echo "   ℹ️  Backend not running"
fi

echo ""
echo "✅ All services stopped"
