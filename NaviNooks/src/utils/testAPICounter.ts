/**
 * Test script to demonstrate Google API Call Counter functionality
 * Run this to see cost estimates and test the tracking system
 */

import GoogleAPICallCounter from '../services/GoogleAPICallCounter';

export function runAPICounterDemo(): void {
  console.log('🚀 === Google API Call Counter Demo ===\n');

  // Show cost estimates first
  GoogleAPICallCounter.generateCostEstimates();

  // Simulate a 3-day itinerary generation session
  console.log('🎯 Simulating a 3-day itinerary generation...\n');

  const counter = GoogleAPICallCounter.getInstance();
  
  // Start session
  const sessionId = counter.startItinerarySession('multi_day', 3, 15);

  // Simulate API calls for route optimization
  console.log('📍 Simulating geocoding calls...');
  counter.recordAPICall('geocoding', 'https://maps.googleapis.com/maps/api/geocode/json', 'single', 1, false, true, undefined, 250);
  counter.recordAPICall('geocoding', 'https://maps.googleapis.com/maps/api/geocode/json', 'single', 1, false, true, undefined, 180);
  counter.recordAPICall('geocoding', 'https://maps.googleapis.com/maps/api/geocode/json', 'single', 1, false, true, undefined, 320);

  console.log('🗺️  Simulating distance matrix calls...');
  // Day 1: 5 places
  counter.recordAPICall('distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json', 'batch', 5, false, true, undefined, 450);
  counter.recordAPICall('distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json', 'batch', 4, false, true, undefined, 380);
  
  // Day 2: 5 places (some cached)
  counter.recordAPICall('distance_matrix', 'cached', 'single', 1, true, true); // Cache hit
  counter.recordAPICall('distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json', 'batch', 5, false, true, undefined, 420);
  counter.recordAPICall('distance_matrix', 'cached', 'single', 1, true, true); // Cache hit
  
  // Day 3: 5 places
  counter.recordAPICall('distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json', 'batch', 5, false, true, undefined, 390);
  counter.recordAPICall('distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json', 'batch', 3, false, true, undefined, 310);

  // Simulate some fallback calls
  console.log('🔄 Simulating fallback API calls...');
  counter.recordAPICall('directions', 'https://maps.googleapis.com/maps/api/directions/json', 'single', 1, false, true, undefined, 520);
  counter.recordAPICall('routes_v2', 'https://routes.googleapis.com/directions/v2:computeRoutes', 'single', 1, false, true, undefined, 680);

  // End session
  const sessionStats = counter.endItinerarySession();

  // Show aggregated stats
  console.log('📈 === AGGREGATED STATISTICS ===');
  const aggregated = counter.getAggregatedStats();
  console.log(`Total Sessions: ${aggregated.totalSessions}`);
  console.log(`Total API Calls: ${aggregated.totalAPICalls}`);
  console.log(`Total Cost: $${aggregated.totalCost.toFixed(6)}`);
  console.log(`Average Cost per Itinerary: $${aggregated.averageCostPerItinerary.toFixed(6)}`);
  console.log(`Average Cache Hit Rate: ${aggregated.averageCacheHitRate.toFixed(1)}%`);

  // Export data
  console.log('\n📊 Exporting session data...');
  const exportData = counter.exportSessionData();
  console.log(`Export size: ${exportData.length} characters`);

  console.log('\n✅ Demo completed! The API counter is ready for production use.\n');
}

/**
 * Calculate expected API calls for a specific itinerary configuration
 */
export function calculateExpectedAPICalls(
  numberOfDays: number, 
  placesPerDay: number
): {
  geocodingCalls: number;
  distanceMatrixCalls: number;
  totalCalls: number;
  estimatedCost: number;
} {
  // Geocoding: 1 call per day (for starting address)
  const geocodingCalls = numberOfDays;
  
  // Distance Matrix: Complex calculation based on route optimization
  // - Initial matrix calculation: placesPerDay calls per day
  // - Route optimization matrix: placesPerDay * (placesPerDay - 1) / 2 calls per day (simplified)
  // - Fallback calculations: ~10% additional calls
  const baseMatrixCallsPerDay = placesPerDay + Math.floor(placesPerDay * (placesPerDay - 1) / 4);
  const fallbackCalls = Math.floor(baseMatrixCallsPerDay * 0.1);
  const distanceMatrixCalls = (baseMatrixCallsPerDay + fallbackCalls) * numberOfDays;
  
  const totalCalls = geocodingCalls + distanceMatrixCalls;
  
  // Cost calculation (per 1000 requests)
  const estimatedCost = (
    geocodingCalls * 0.005 + // Geocoding: $5 per 1000
    distanceMatrixCalls * 0.005 // Distance Matrix: $5 per 1000
  ) / 1000;
  
  return {
    geocodingCalls,
    distanceMatrixCalls,
    totalCalls,
    estimatedCost
  };
}

/**
 * Print detailed cost breakdown for common scenarios
 */
export function printCostBreakdown(): void {
  console.log('\n💰 === DETAILED API COST BREAKDOWN ===\n');
  
  const scenarios = [
    { name: 'Quick Day Trip', days: 1, places: 3 },
    { name: 'Full Day Adventure', days: 1, places: 6 },
    { name: 'Weekend Getaway', days: 2, places: 4 },
    { name: 'Long Weekend', days: 3, places: 5 },
    { name: 'Week-long Vacation', days: 7, places: 4 }
  ];

  scenarios.forEach(scenario => {
    const calculations = calculateExpectedAPICalls(scenario.days, scenario.places);
    
    console.log(`📊 ${scenario.name} (${scenario.days} days, ${scenario.places} places/day):`);
    console.log(`   • Geocoding calls: ${calculations.geocodingCalls}`);
    console.log(`   • Distance Matrix calls: ${calculations.distanceMatrixCalls}`);
    console.log(`   • Total API calls: ${calculations.totalCalls}`);
    console.log(`   • Cost per itinerary: $${calculations.estimatedCost.toFixed(6)}`);
    console.log(`   • Monthly cost (100 itineraries): $${(calculations.estimatedCost * 100).toFixed(2)}`);
    console.log(`   • Annual cost (1200 itineraries): $${(calculations.estimatedCost * 1200).toFixed(2)}`);
    console.log('');
  });

  console.log('💡 Tips for cost optimization:');
  console.log('   • Implement aggressive caching (can reduce costs by 40-60%)');
  console.log('   • Batch distance matrix calls when possible');
  console.log('   • Use fallback calculations for non-critical routes');
  console.log('   • Consider pre-calculating popular routes');
  console.log('=====================================\n');
}

// Export functions for use in other modules
export default {
  runAPICounterDemo,
  calculateExpectedAPICalls,
  printCostBreakdown
}; 