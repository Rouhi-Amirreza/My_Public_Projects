#!/bin/bash

# NaviNook Image Server Startup Script

echo "🚀 Starting NaviNook Image Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if port 3001 is already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔍 Checking if server is already running..."
    # Test if our server is responding
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ NaviNook Image Server is already running on port 3001!"
        echo "🌐 Health check: http://localhost:3001/api/health"
        echo "📊 Cache stats: http://localhost:3001/api/cache/stats"
        exit 0
    else
        echo "⚠️  Port 3001 is in use by another service. Stopping it..."
        # Kill the process using port 3001
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
fi

# Navigate to image server directory
cd "$(dirname "$0")/image-server"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🔧 Starting image server on port 3001..."
echo "📁 Cache directory: $(pwd)/cached-images"
echo "🌐 Server will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
npm start
