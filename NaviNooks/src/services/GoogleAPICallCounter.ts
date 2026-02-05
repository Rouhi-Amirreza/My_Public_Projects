/**
 * GoogleAPICallCounter - Comprehensive tracking of all Google API calls
 * during itinerary generation with cost calculation and reporting
 */

export interface APICallRecord {
  timestamp: Date;
  apiType: 'geocoding' | 'distance_matrix' | 'directions' | 'places' | 'routes_v2';
  endpoint: string;
  requestType: 'single' | 'batch';
  itemCount: number; // For batch requests, how many items were processed
  cacheHit: boolean;
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
  costUSD: number;
}

export interface ItineraryAPIUsage {
  sessionId: string;
  itineraryType: 'single_day' | 'multi_day';
  numberOfDays: number;
  numberOfPlaces: number;
  startTime: Date;
  endTime?: Date;
  totalCalls: number;
  totalCost: number;
  callsByType: Record<string, number>;
  costsByType: Record<string, number>;
  cacheHitRate: number;
  calls: APICallRecord[];
}

export class GoogleAPICallCounter {
  private static instance: GoogleAPICallCounter;
  private currentSession: ItineraryAPIUsage | null = null;
  private allSessions: ItineraryAPIUsage[] = [];

  // Google API Pricing (USD per 1,000 requests) - 2024 rates
  private static readonly API_COSTS = {
    geocoding: 0.005,          // $5 per 1,000 requests
    distance_matrix: 0.005,    // $5 per 1,000 requests  
    directions: 0.005,         // $5 per 1,000 requests
    places: 0.017,             // $17 per 1,000 requests (Place Details)
    routes_v2: 0.005,          // $5 per 1,000 requests
    places_autocomplete: 0.00283, // $2.83 per 1,000 requests
    places_photos: 0.007       // $7 per 1,000 requests
  };

  private constructor() {}

  static getInstance(): GoogleAPICallCounter {
    if (!GoogleAPICallCounter.instance) {
      GoogleAPICallCounter.instance = new GoogleAPICallCounter();
    }
    return GoogleAPICallCounter.instance;
  }

  /**
   * Start tracking a new itinerary generation session
   */
  startItinerarySession(
    itineraryType: 'single_day' | 'multi_day',
    numberOfDays: number,
    numberOfPlaces: number
  ): string {
    const sessionId = `itinerary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      itineraryType,
      numberOfDays,
      numberOfPlaces,
      startTime: new Date(),
      totalCalls: 0,
      totalCost: 0,
      callsByType: {},
      costsByType: {},
      cacheHitRate: 0,
      calls: []
    };

    console.log(`🎯 Started API tracking session: ${sessionId}`);
    console.log(`📊 Session details: ${itineraryType}, ${numberOfDays} days, ${numberOfPlaces} places`);
    
    return sessionId;
  }

  /**
   * End the current tracking session
   */
  endItinerarySession(): ItineraryAPIUsage | null {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to end');
      return null;
    }

    this.currentSession.endTime = new Date();
    
    // Calculate cache hit rate
    const totalCalls = this.currentSession.calls.length;
    const cacheHits = this.currentSession.calls.filter(call => call.cacheHit).length;
    this.currentSession.cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

    // Store completed session
    this.allSessions.push({ ...this.currentSession });
    
    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    console.log(`✅ Ended API tracking session: ${completedSession.sessionId}`);
    this.printSessionSummary(completedSession);
    
    return completedSession;
  }

  /**
   * Record a Google API call
   */
  recordAPICall(
    apiType: APICallRecord['apiType'],
    endpoint: string,
    requestType: 'single' | 'batch' = 'single',
    itemCount: number = 1,
    cacheHit: boolean = false,
    success: boolean = true,
    errorMessage?: string,
    responseTimeMs?: number
  ): void {
    if (!this.currentSession) {
      console.warn('⚠️ No active session - API call not recorded');
      return;
    }

    // Calculate cost based on API type and item count
    const costPer1000 = GoogleAPICallCounter.API_COSTS[apiType] || 0.005;
    const costUSD = (costPer1000 * itemCount) / 1000;

    const record: APICallRecord = {
      timestamp: new Date(),
      apiType,
      endpoint,
      requestType,
      itemCount,
      cacheHit,
      success,
      errorMessage,
      responseTimeMs,
      costUSD
    };

    // Add to current session
    this.currentSession.calls.push(record);
    this.currentSession.totalCalls++;
    this.currentSession.totalCost += costUSD;

    // Update counters by type
    this.currentSession.callsByType[apiType] = (this.currentSession.callsByType[apiType] || 0) + 1;
    this.currentSession.costsByType[apiType] = (this.currentSession.costsByType[apiType] || 0) + costUSD;

    // Log the call
    const statusIcon = success ? '✅' : '❌';
    const cacheIcon = cacheHit ? '💾' : '🌐';
    console.log(`${statusIcon} ${cacheIcon} API Call: ${apiType} (${itemCount} items) - $${costUSD.toFixed(6)}`);
  }

  /**
   * Get current session statistics
   */
  getCurrentSessionStats(): ItineraryAPIUsage | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Get all session statistics
   */
  getAllSessionStats(): ItineraryAPIUsage[] {
    return [...this.allSessions];
  }

  /**
   * Print detailed session summary
   */
  private printSessionSummary(session: ItineraryAPIUsage): void {
    const duration = session.endTime 
      ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
      : 0;

    console.log('\n📊 === GOOGLE API USAGE SUMMARY ===');
    console.log(`🆔 Session: ${session.sessionId}`);
    console.log(`📅 Type: ${session.itineraryType} (${session.numberOfDays} days, ${session.numberOfPlaces} places)`);
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log(`📞 Total API Calls: ${session.totalCalls}`);
    console.log(`💰 Total Cost: $${session.totalCost.toFixed(6)}`);
    console.log(`💾 Cache Hit Rate: ${session.cacheHitRate.toFixed(1)}%`);
    
    console.log('\n📋 Calls by API Type:');
    Object.entries(session.callsByType).forEach(([type, count]) => {
      const cost = session.costsByType[type] || 0;
      console.log(`  ${type}: ${count} calls ($${cost.toFixed(6)})`);
    });

    console.log('\n🔍 Recent API Calls:');
    session.calls.slice(-10).forEach(call => {
      const time = call.timestamp.toLocaleTimeString();
      const status = call.success ? '✅' : '❌';
      const cache = call.cacheHit ? '💾' : '🌐';
      console.log(`  ${time} ${status} ${cache} ${call.apiType}: ${call.itemCount} items ($${call.costUSD.toFixed(6)})`);
    });

    console.log('=====================================\n');
  }

  /**
   * Generate cost estimates for different itinerary types
   */
  static generateCostEstimates(): void {
    console.log('\n💰 === GOOGLE API COST ESTIMATES ===');
    
    const scenarios = [
      { name: 'Single Day - 5 places', days: 1, places: 5 },
      { name: 'Single Day - 8 places', days: 1, places: 8 },
      { name: '3-Day Trip - 5 places/day', days: 3, places: 15 },
      { name: '7-Day Trip - 4 places/day', days: 7, places: 28 }
    ];

    scenarios.forEach(scenario => {
      // Estimate API calls per scenario
      const geocodingCalls = scenario.days; // 1 per day
      const distanceMatrixCalls = scenario.places + (scenario.places * 0.5); // Matrix calculations
      const directionsCallsIfNeeded = scenario.places * 0.1; // 10% fallback rate
      
      const totalCalls = geocodingCalls + distanceMatrixCalls + directionsCallsIfNeeded;
      const estimatedCost = (
        geocodingCalls * GoogleAPICallCounter.API_COSTS.geocoding +
        distanceMatrixCalls * GoogleAPICallCounter.API_COSTS.distance_matrix +
        directionsCallsIfNeeded * GoogleAPICallCounter.API_COSTS.directions
      ) / 1000;

      console.log(`📊 ${scenario.name}:`);
      console.log(`   • API Calls: ~${Math.ceil(totalCalls)}`);
      console.log(`   • Estimated Cost: $${estimatedCost.toFixed(4)}`);
      console.log(`   • Monthly Cost (100 itineraries): $${(estimatedCost * 100).toFixed(2)}`);
      console.log('');
    });

    console.log('=====================================\n');
  }

  /**
   * Clear all session data
   */
  clearAllSessions(): void {
    this.allSessions = [];
    this.currentSession = null;
    console.log('🧹 All API tracking sessions cleared');
  }

  /**
   * Export session data for analysis
   */
  exportSessionData(): string {
    return JSON.stringify({
      sessions: this.allSessions,
      currentSession: this.currentSession,
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get aggregated statistics across all sessions
   */
  getAggregatedStats(): {
    totalSessions: number;
    totalAPICalls: number;
    totalCost: number;
    averageCostPerItinerary: number;
    averageCallsPerItinerary: number;
    mostExpensiveSession: ItineraryAPIUsage | null;
    averageCacheHitRate: number;
  } {
    if (this.allSessions.length === 0) {
      return {
        totalSessions: 0,
        totalAPICalls: 0,
        totalCost: 0,
        averageCostPerItinerary: 0,
        averageCallsPerItinerary: 0,
        mostExpensiveSession: null,
        averageCacheHitRate: 0
      };
    }

    const totalCost = this.allSessions.reduce((sum, session) => sum + session.totalCost, 0);
    const totalCalls = this.allSessions.reduce((sum, session) => sum + session.totalCalls, 0);
    const averageCacheHitRate = this.allSessions.reduce((sum, session) => sum + session.cacheHitRate, 0) / this.allSessions.length;
    const mostExpensive = this.allSessions.reduce((max, session) => 
      session.totalCost > (max?.totalCost || 0) ? session : max, null as ItineraryAPIUsage | null);

    return {
      totalSessions: this.allSessions.length,
      totalAPICalls: totalCalls,
      totalCost,
      averageCostPerItinerary: totalCost / this.allSessions.length,
      averageCallsPerItinerary: totalCalls / this.allSessions.length,
      mostExpensiveSession: mostExpensive,
      averageCacheHitRate
    };
  }
}

export default GoogleAPICallCounter; 