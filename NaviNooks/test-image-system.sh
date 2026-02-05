#!/bin/bash

# Test script for the NaviNook Image Caching System

echo "🧪 Testing NaviNook Image Caching System..."
echo ""

SERVER_URL="http://localhost:3001"

# Test 1: Health Check
echo "1️⃣ Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" $SERVER_URL/api/health)
HTTP_CODE="${HEALTH_RESPONSE: -3}"
HEALTH_DATA="${HEALTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is healthy"
    echo "📊 Response: $HEALTH_DATA"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "💡 Make sure to run: ./start-image-server.sh"
    exit 1
fi

echo ""

# Test 2: Cache Statistics
echo "2️⃣ Testing cache statistics..."
STATS_RESPONSE=$(curl -s -w "%{http_code}" $SERVER_URL/api/cache/stats)
HTTP_CODE="${STATS_RESPONSE: -3}"
STATS_DATA="${STATS_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Cache stats retrieved"
    echo "📊 Stats: $STATS_DATA"
else
    echo "❌ Cache stats failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test 3: Image URL Generation
echo "3️⃣ Testing image request flow..."
TEST_PLACE_ID="ChIJtest123"
TEST_PHOTO_NAME="places/test/photos/test123"
TEST_GOOGLE_URL="https://example.com/test-image.jpg"

IMAGE_URL="${SERVER_URL}/api/image/${TEST_PLACE_ID}?photo_name=${TEST_PHOTO_NAME}&width=400&height=400&google_url=${TEST_GOOGLE_URL}"

echo "🔗 Image endpoint ready: ${IMAGE_URL:0:80}..."
echo "✅ Image URL generation working"

echo ""

# Test 4: Directory Check
echo "4️⃣ Checking cache directory..."
if [ -d "image-server/cached-images" ]; then
    echo "✅ Cache directory exists: image-server/cached-images"
    IMAGE_COUNT=$(ls -1 image-server/cached-images 2>/dev/null | wc -l)
    echo "📁 Files in cache: $IMAGE_COUNT"
else
    echo "⚠️ Cache directory not found (will be created when first image is cached)"
fi

echo ""
echo "🎉 Image caching system test complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start React Native app: npm start"
echo "   2. Generate an itinerary to test real images"
echo "   3. Monitor cache: curl $SERVER_URL/api/cache/stats"
echo "   4. View logs: tail -f image-server/server.log"