#!/bin/bash

# Update Image Server IP Configuration
# This script automatically detects your current IP and updates the GooglePlacesImageService

echo "🔍 Detecting current IP address..."

# Get current IP address (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    exit 1
fi

echo "📍 Current IP address: $CURRENT_IP"

# Path to the service file
SERVICE_FILE="src/services/GooglePlacesImageService.ts"

if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ GooglePlacesImageService.ts not found"
    exit 1
fi

# Update the IP in the service file
echo "🔧 Updating GooglePlacesImageService.ts..."

# Use sed to replace the IP address in the IMAGE_SERVER_URL line
sed -i '' "s|http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3001|http://$CURRENT_IP:3001|g" "$SERVICE_FILE"

echo "✅ Updated image server URL to: http://$CURRENT_IP:3001"

# Test if the server is running
echo "🧪 Testing server accessibility..."
if curl -s "http://$CURRENT_IP:3001/api/health" > /dev/null; then
    echo "✅ Image server is accessible at http://$CURRENT_IP:3001"
else
    echo "⚠️  Image server is not running or not accessible"
    echo "💡 Start the server with: ./start-image-server.sh"
fi

echo ""
echo "🎯 Image server configuration updated!"
echo "📱 Your React Native app can now access images from: http://$CURRENT_IP:3001"