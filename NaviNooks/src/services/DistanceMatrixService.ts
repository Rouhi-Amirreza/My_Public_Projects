import { GOOGLE_API_KEY } from '../utils/constants';
import GoogleAPICallCounter from './GoogleAPICallCounter';

export interface TravelTimeResult {
  duration: number; // in minutes
  distance: number; // in meters
  mode: 'driving' | 'walking' | 'transit';
  status: string;
  durationInTraffic?: number; // in minutes (for driving mode)
  icon: string; // emoji icon for travel mode
}

export interface DistanceMatrixResponse {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: Array<{
    elements: Array<{
      distance?: {
        text: string;
        value: number; // meters
      };
      duration?: {
        text: string;
        value: number; // seconds
      };
      duration_in_traffic?: {
        text: string;
        value: number; // seconds
      };
      status: string;
    }>;
  }>;
  status: string;
}

class DistanceMatrixService {
  private static readonly API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  private static cache = new Map<string, TravelTimeResult>();

  /**
   * Calculate travel time between places using place names/addresses
   */
  static async calculateTravelTime(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'transit' = 'driving',
    departureTime?: Date
  ): Promise<TravelTimeResult> {
    // Create cache key
    const timestamp = departureTime ? Math.floor(departureTime.getTime() / 1000) : 'now';
    const cacheKey = `${origin}|${destination}|${mode}|${timestamp}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`📍 Using cached travel time: ${origin} → ${destination}`);
      // Record cache hit
      GoogleAPICallCounter.getInstance().recordAPICall(
        'distance_matrix',
        'cached',
        'single',
        1,
        true, // cacheHit
        true  // success
      );
      return this.cache.get(cacheKey)!;
    }

    try {
      const startTime = Date.now();
      const result = await this.callDistanceMatrixAPI([origin], [destination], mode, departureTime);
      const responseTime = Date.now() - startTime;
      
      // Record API call
      GoogleAPICallCounter.getInstance().recordAPICall(
        'distance_matrix',
        this.API_URL,
        'single',
        1,
        false, // not cached
        true,  // success
        undefined,
        responseTime
      );
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      // Record failed API call
      GoogleAPICallCounter.getInstance().recordAPICall(
        'distance_matrix',
        this.API_URL,
        'single',
        1,
        false, // not cached
        false, // failed
        error instanceof Error ? error.message : String(error)
      );
      console.error(`❌ Travel time calculation failed: ${origin} → ${destination}`, error);
      throw error;
    }
  }

  /**
   * Calculate travel times from one origin to multiple destinations
   */
  static async calculateMultipleDestinations(
    origin: string,
    destinations: string[],
    mode: 'driving' | 'walking' | 'transit' = 'driving',
    departureTime?: Date
  ): Promise<TravelTimeResult[]> {
    try {
      console.log(`🔍 Calculating travel times from "${origin}" to ${destinations.length} destinations`);
      
      const startTime = Date.now();
      const url = this.buildURL([origin], destinations, mode, departureTime);
      const response = await fetch(url);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        // Record failed API call
        GoogleAPICallCounter.getInstance().recordAPICall(
          'distance_matrix',
          this.API_URL,
          'batch',
          destinations.length,
          false, // not cached
          false, // failed
          `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        );
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: DistanceMatrixResponse = await response.json();
      
      if (data.status !== 'OK') {
        // Record failed API call
        GoogleAPICallCounter.getInstance().recordAPICall(
          'distance_matrix',
          this.API_URL,
          'batch',
          destinations.length,
          false, // not cached
          false, // failed
          `Distance Matrix API error: ${data.status}`,
          responseTime
        );
        throw new Error(`Distance Matrix API error: ${data.status}`);
      }

      // Record successful batch API call
      GoogleAPICallCounter.getInstance().recordAPICall(
        'distance_matrix',
        this.API_URL,
        'batch',
        destinations.length,
        false, // not cached
        true,  // success
        undefined,
        responseTime
      );

      const results: TravelTimeResult[] = [];
      const row = data.rows[0];

      for (let i = 0; i < destinations.length; i++) {
        const element = row.elements[i];
        
        if (element.status === 'OK' && element.duration && element.distance) {
          const durationMinutes = Math.round(element.duration.value / 60);
          const durationInTrafficMinutes = element.duration_in_traffic 
            ? Math.round(element.duration_in_traffic.value / 60) 
            : undefined;

          const result: TravelTimeResult = {
            duration: durationMinutes,
            distance: element.distance.value,
            mode,
            status: element.status,
            durationInTraffic: durationInTrafficMinutes,
            icon: mode === 'walking' ? '🚶' : mode === 'transit' ? '🚌' : '🚗'
          };

          results.push(result);
          
          // Cache individual result
          const timestamp = departureTime ? Math.floor(departureTime.getTime() / 1000) : 'now';
          const cacheKey = `${origin}|${destinations[i]}|${mode}|${timestamp}`;
          this.cache.set(cacheKey, result);
          
          console.log(`✅ ${origin} → ${destinations[i]}: ${durationMinutes}min (${element.distance.text})`);
        } else {
          console.warn(`⚠️ Failed to get travel time: ${origin} → ${destinations[i]} (Status: ${element.status})`);
          // Throw error instead of using hardcoded fallback
          throw new Error(`Failed to calculate travel time to destination ${destinations[i]}: ${element.status || 'UNKNOWN_ERROR'}`);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Multiple destinations calculation failed:', error);
      throw error;
    }
  }

  /**
   * Call the Distance Matrix API
   */
  private static async callDistanceMatrixAPI(
    origins: string[],
    destinations: string[],
    mode: 'driving' | 'walking' | 'transit',
    departureTime?: Date
  ): Promise<TravelTimeResult> {
    const url = this.buildURL(origins, destinations, mode, departureTime);
    
    console.log(`🔍 Distance Matrix API call: ${origins[0]} → ${destinations[0]} (${mode})`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: DistanceMatrixResponse = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Distance Matrix API error:', data);
      throw new Error(`Distance Matrix API error: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK' || !element.duration || !element.distance) {
      console.error('Invalid element data:', element);
      throw new Error(`No valid route found: ${element?.status || 'UNKNOWN_ERROR'}`);
    }

    const durationMinutes = Math.round(element.duration.value / 60);
    const durationInTrafficMinutes = element.duration_in_traffic 
      ? Math.round(element.duration_in_traffic.value / 60) 
      : undefined;

    console.log(`✅ Travel time: ${durationMinutes}min (${element.distance.text})`);

    return {
      duration: durationMinutes,
      distance: element.distance.value,
      mode,
      status: element.status,
      durationInTraffic: durationInTrafficMinutes,
      icon: mode === 'walking' ? '🚶' : mode === 'transit' ? '🚌' : '🚗'
    };
  }

  /**
   * Build the Distance Matrix API URL
   */
  private static buildURL(
    origins: string[],
    destinations: string[],
    mode: 'driving' | 'walking' | 'transit',
    departureTime?: Date
  ): string {
    const params = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode: mode,
      key: GOOGLE_API_KEY,
      units: 'metric'
    });

    // Add departure time for driving mode to get traffic data
    if (mode === 'driving' && departureTime) {
      const timestamp = Math.floor(departureTime.getTime() / 1000);
      params.append('departure_time', timestamp.toString());
      params.append('traffic_model', 'best_guess');
    }

    return `${this.API_URL}?${params.toString()}`;
  }

  /**
   * Calculate Unix timestamp for a specific time
   * @param targetDate - The target date/time
   * @returns Unix timestamp
   */
  static calculateTimestamp(targetDate: Date): number {
    return Math.floor(targetDate.getTime() / 1000);
  }

  /**
   * Create a departure time for tomorrow morning (8 AM)
   */
  static getTomorrowMorning(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8:00 AM
    return tomorrow;
  }

  /**
   * Get place identifier (name or address) for travel time calculation
   */
  static getPlaceIdentifier(place: any, currentCityInfo?: { name: string; displayName: string }): string {
    // Priority: address > name
    if (place.address || place.basic_info?.address) {
      return place.address || place.basic_info.address;
    }
    
    if (place.name || place.basic_info?.name) {
      const name = place.name || place.basic_info.name;
      
      // Get current city info for proper geographic context
      const cityName = currentCityInfo?.displayName || 'Philadelphia';
      const stateName = this.getStateForCity(currentCityInfo?.name || 'philadelphia');
      const cityContext = `${cityName}, ${stateName}`;
      
      // Add city context if not already included
      if (!name.toLowerCase().includes(cityName.toLowerCase()) && 
          !name.toLowerCase().includes(stateName.toLowerCase())) {
        return `${name}, ${cityContext}`;
      }
      return name;
    }
    
    throw new Error('Place has no name or address for travel calculation');
  }

  /**
   * Get state abbreviation for city
   */
  private static getStateForCity(cityId: string): string {
    switch (cityId?.toLowerCase()) {
      case 'chicago':
        return 'IL';
      case 'philadelphia':
        return 'PA';
      case 'boston':
        return 'MA';
      case 'atlanta':
        return 'GA';
      case 'charlotte':
        return 'NC';
      case 'dallas':
        return 'TX';
      case 'denver':
        return 'CO';
      case 'detroit':
        return 'MI';
      case 'houston':
        return 'TX';
      case 'las_vegas':
        return 'NV';
      case 'los_angeles':
        return 'CA';
      case 'miami':
        return 'FL';
      case 'minneapolis':
        return 'MN';
      case 'new_orleans':
        return 'LA';
      case 'new_york':
        return 'NY';
      case 'portland':
        return 'OR';
      case 'san_antonio':
        return 'TX';
      case 'san_diego':
        return 'CA';
      case 'san_francisco':
        return 'CA';
      case 'seattle':
        return 'WA';
      case 'washington_dc':
        return 'DC';
      default:
        return 'PA'; // Default to Pennsylvania
    }
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 Distance Matrix cache cleared');
  }
}

export default DistanceMatrixService;