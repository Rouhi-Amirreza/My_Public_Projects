#!/bin/bash

# NaviNook Image Server Stop Script

echo "🛑 Stopping NaviNook Image Server..."

# Check if server is running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔍 Found server running on port 3001"
    
    # Try graceful shutdown first
    echo "📨 Sending SIGTERM to server process..."
    pkill -f "node server.js" 2>/dev/null || true
    
    # Wait a moment for graceful shutdown
    sleep 3
    
    # Force kill if still running
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo "🔨 Force stopping server..."
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Verify it's stopped
    if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ NaviNook Image Server stopped successfully"
    else
        echo "❌ Failed to stop server"
        exit 1
    fi
else
    echo "ℹ️  NaviNook Image Server is not running"
fi