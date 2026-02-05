/**
 * UnifiedTravelTimeService - Single source of truth for all travel time calculations
 * Uses Google Routes API consistently across the entire app
 */

import { GOOGLE_API_KEY } from '../utils/constants';

export interface TravelTimeResult {
  duration: number; // minutes
  distance: number; // meters
  mode: 'driving' | 'walking';
  icon: string;
  polyline?: string; // encoded polyline for route display
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInput {
  // Can be coordinates object
  coordinates?: Coordinates;
  // Can be coordinates directly
  latitude?: number;
  longitude?: number;
  // Can be address string
  address?: string;
  // Can be place name (will be geocoded)
  name?: string;
}

export class UnifiedTravelTimeService {
  private static readonly BASE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  private static readonly GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  // Cache to store results and ensure consistency
  private static cache = new Map<string, TravelTimeResult>();
  private static geocodeCache = new Map<string, Coordinates>();

  /**
   * Main function to calculate travel time between any two locations
   * Handles all coordinate formats and address types consistently
   */
  static async calculateTravelTime(
    origin: LocationInput,
    destination: LocationInput,
    preferredMode?: 'driving' | 'walking',
    allowFallback?: boolean  // NEW: Allow emergency fallback for critical errors
  ): Promise<TravelTimeResult> {
    try {
      // 1. Convert both locations to standardized coordinates
      const originCoords = await this.standardizeLocation(origin);
      const destinationCoords = await this.standardizeLocation(destination);

      // 2. Create cache key for consistency
      const cacheKey = this.createCacheKey(originCoords, destinationCoords, preferredMode);
      
      // 3. Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        console.log('🔄 Using cached travel time:', cacheKey, '→', cached.duration, 'min');
        return cached;
      }

      // 4. Determine optimal travel mode
      const distance = this.calculateStraightLineDistance(originCoords, destinationCoords);
      const optimalMode = preferredMode || (distance < 800 ? 'walking' : 'driving');

      // 5. Call Google Routes API
      const result = await this.callGoogleRoutesAPI(originCoords, destinationCoords, optimalMode);

      // 6. Cache result for consistency
      this.cache.set(cacheKey, result);
      
      console.log('✅ Calculated travel time:', {
        from: `${originCoords.latitude.toFixed(4)},${originCoords.longitude.toFixed(4)}`,
        to: `${destinationCoords.latitude.toFixed(4)},${destinationCoords.longitude.toFixed(4)}`,
        mode: result.mode,
        duration: result.duration,
        distance: result.distance
      });

      return result;
    } catch (error) {
      console.error('❌ Travel time calculation failed:', error);
      
      if (allowFallback) {
        console.warn('🔄 Using emergency fallback due to critical error');
        return this.getEmergencyFallback(origin, destination, error.message);
      }
      
      // Throw error instead of returning fallback values
      throw new Error(`Travel time calculation failed: ${error.message}`);
    }
  }

  /**
   * Convert any location input to standardized coordinates
   */
  private static async standardizeLocation(location: LocationInput): Promise<Coordinates> {
    // Priority: coordinates > lat/lng > address > name
    
    // 1. Direct coordinates object
    if (location.coordinates) {
      return {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude
      };
    }

    // 2. Direct lat/lng properties
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }

    // 3. Address string - geocode it with fallback
    if (location.address) {
      try {
        return await this.geocodeAddress(location.address);
      } catch (error) {
        console.warn(`⚠️ Geocoding failed for address "${location.address}": ${error.message}`);
        console.warn(`🔄 Using Philadelphia center coordinates as fallback`);
        // Use Philadelphia center as fallback
        return {
          latitude: 39.9526,
          longitude: -75.1652
        };
      }
    }

    // 4. Name string - geocode it with fallback
    if (location.name) {
      try {
        return await this.geocodeAddress(location.name);
      } catch (error) {
        console.warn(`⚠️ Geocoding failed for name "${location.name}": ${error.message}`);
        console.warn(`🔄 Using Philadelphia center coordinates as fallback`);
        // Use Philadelphia center as fallback
        return {
          latitude: 39.9526,
          longitude: -75.1652
        };
      }
    }

    throw new Error('Invalid location input - no coordinates or address provided');
  }

  /**
   * Geocode an address to coordinates with caching
   */
  private static async geocodeAddress(address: string): Promise<Coordinates> {
    // Check cache first
    if (this.geocodeCache.has(address)) {
      console.log(`📍 Using cached geocoding for: ${address}`);
      return this.geocodeCache.get(address)!;
    }

    try {
      const url = `${this.GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
      
      console.log(`🔍 Geocoding address: ${address}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`📍 Geocoding response status: ${data.status} for address: ${address}`);

      if (data.status !== 'OK') {
        console.error(`❌ Geocoding API error: ${data.status}`, data.error_message || 'No error message');
        throw new Error(`Geocoding API returned status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
      }

      if (!data.results || data.results.length === 0) {
        console.error(`❌ No geocoding results found for address: ${address}`);
        throw new Error(`No geocoding results found for address: ${address}`);
      }

      const location = data.results[0].geometry.location;
      const coordinates: Coordinates = {
        latitude: location.lat,
        longitude: location.lng
      };

      console.log(`✅ Successfully geocoded "${address}" to: ${coordinates.latitude}, ${coordinates.longitude}`);

      // Cache the result
      this.geocodeCache.set(address, coordinates);
      
      return coordinates;
    } catch (error) {
      console.error(`❌ Geocoding failed for address "${address}":`, error.message);
      throw new Error(`Geocoding failed for address "${address}": ${error.message}`);
    }
  }

  /**
   * Call Google Routes API with standardized parameters
   */
  private static async callGoogleRoutesAPI(
    origin: Coordinates,
    destination: Coordinates,
    travelMode: 'driving' | 'walking'
  ): Promise<TravelTimeResult> {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude
          }
        }
      },
      travelMode: travelMode.toUpperCase(),
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'IMPERIAL'
    };

    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google Routes API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.routes?.[0]) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
    const distanceMeters = route.distanceMeters || 0;

    return {
      duration: Math.round(durationSeconds / 60), // Convert to minutes
      distance: distanceMeters,
      mode: travelMode,
      icon: travelMode === 'walking' ? '🚶‍♂️' : '🚗',
      polyline: route.polyline?.encodedPolyline
    };
  }

  /**
   * Calculate straight-line distance to determine optimal travel mode
   */
  private static calculateStraightLineDistance(
    origin: Coordinates,
    destination: Coordinates
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.latitude)) * Math.cos(this.toRadians(destination.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create consistent cache key for travel time results
   */
  private static createCacheKey(
    origin: Coordinates,
    destination: Coordinates,
    mode?: string
  ): string {
    // Round coordinates to 4 decimal places for consistent caching
    const originKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
    const destKey = `${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
    return `${originKey}->${destKey}:${mode || 'auto'}`;
  }

  /**
   * Emergency fallback travel time - only for critical system failures
   * Should only be used when throwing an error would crash the app
   */
  private static getEmergencyFallback(
    origin: LocationInput,
    destination: LocationInput,
    reason: string
  ): TravelTimeResult {
    console.error('🚨 EMERGENCY FALLBACK USED:', reason);
    console.error('This should not happen in production - please fix the underlying issue');
    
    // Instead of using hardcoded estimates, throw error for professional error handling
    throw new Error(`Travel time calculation failed completely: ${reason}. Origin: ${JSON.stringify(origin)}, Destination: ${JSON.stringify(destination)}`);
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.cache.clear();
    this.geocodeCache.clear();
    console.log('🧹 Cleared travel time and geocoding caches');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { travelTime: number; geocoding: number } {
    return {
      travelTime: this.cache.size,
      geocoding: this.geocodeCache.size
    };
  }

  /**
   * Batch calculate travel times for multiple destinations
   */
  static async batchCalculate(
    origin: LocationInput,
    destinations: LocationInput[],
    preferredMode?: 'driving' | 'walking'
  ): Promise<TravelTimeResult[]> {
    const promises = destinations.map(dest => 
      this.calculateTravelTime(origin, dest, preferredMode)
    );
    
    return Promise.all(promises);
  }
}

export default UnifiedTravelTimeService;