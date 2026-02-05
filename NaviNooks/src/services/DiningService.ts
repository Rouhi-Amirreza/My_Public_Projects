/**
 * DiningService - Find dining options between two locations
 * Provides contextual meal recommendations based on time and location
 */

import GoogleMapsService from './GoogleMapsService';
import DistanceMatrixService from './DistanceMatrixService';

export interface DiningOption {
  place_id: string;
  name: string;
  vicinity: string;
  rating: number;
  user_ratings_total: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  distance_from_route?: number; // meters
  detour_time?: number; // additional minutes
}

export interface DiningRecommendation {
  meal_type: 'breakfast' | 'brunch' | 'coffee' | 'lunch' | 'dinner' | 'drinks';
  meal_label: string;
  emoji: string;
  search_types: string[];
  options: DiningOption[];
}

class DiningService {
  // Meal type configurations
  private static readonly MEAL_CONFIGS = {
    breakfast: {
      label: 'Breakfast',
      emoji: '🥐',
      types: ['restaurant', 'cafe', 'bakery'],
      time_range: [6, 11],
      keywords: 'breakfast cafe bakery',
      default_duration: 45 // minutes
    },
    brunch: {
      label: 'Brunch', 
      emoji: '🥞',
      types: ['restaurant', 'cafe'],
      time_range: [10, 14],
      keywords: 'brunch restaurant',
      default_duration: 75 // minutes
    },
    coffee: {
      label: 'Coffee Break',
      emoji: '☕',
      types: ['cafe', 'bakery'],
      time_range: [7, 18],
      keywords: 'coffee cafe',
      default_duration: 20 // minutes
    },
    lunch: {
      label: 'Lunch',
      emoji: '🍽️',
      types: ['restaurant', 'food'],
      time_range: [11, 16],
      keywords: 'lunch restaurant',
      default_duration: 60 // minutes
    },
    dinner: {
      label: 'Dinner',
      emoji: '🍷',
      types: ['restaurant', 'bar'],
      time_range: [17, 23],
      keywords: 'dinner restaurant',
      default_duration: 90 // minutes
    },
    drinks: {
      label: 'Drinks',
      emoji: '🍸',
      types: ['bar', 'night_club'],
      time_range: [17, 2],
      keywords: 'bar drinks',
      default_duration: 120 // minutes
    }
  };

  /**
   * Get appropriate meal type based on arrival time
   */
  static getMealTypeForTime(timeString: string): string[] {
    const hour = parseInt(timeString.split(':')[0], 10);
    const mealTypes: string[] = [];

    // Check which meal types are appropriate for this hour
    Object.entries(this.MEAL_CONFIGS).forEach(([type, config]) => {
      const [startHour, endHour] = config.time_range;
      
      // Handle overnight ranges (like drinks: 17-2)
      if (startHour > endHour) {
        if (hour >= startHour || hour <= endHour) {
          mealTypes.push(type);
        }
      } else {
        if (hour >= startHour && hour <= endHour) {
          mealTypes.push(type);
        }
      }
    });

    // Always include coffee as an option during daytime
    if (hour >= 7 && hour <= 18 && !mealTypes.includes('coffee')) {
      mealTypes.push('coffee');
    }

    return mealTypes.length > 0 ? mealTypes : ['coffee'];
  }

  /**
   * Find dining options between two locations
   */
  static async findDiningOptionsBetween(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    arrivalTime: string,
    maxDetourKm: number = 2
  ): Promise<DiningRecommendation[]> {
    
    try {
      // Get appropriate meal types for the time
      const mealTypes = this.getMealTypeForTime(arrivalTime);
      const recommendations: DiningRecommendation[] = [];

      // Calculate midpoint between locations for search center
      const midLat = (fromLat + toLat) / 2;
      const midLng = (fromLng + toLng) / 2;
      
      // Calculate search radius based on distance between points
      const distance = this.calculateDistance(fromLat, fromLng, toLat, toLng);
      const searchRadius = Math.min(Math.max(distance * 1000 / 2, 500), 2000); // 500m to 2km
      
      console.log('🍽️ Dining search parameters:', {
        fromLocation: `${fromLat},${fromLng}`,
        toLocation: `${toLat},${toLng}`,
        midpoint: `${midLat},${midLng}`,
        distance: distance,
        searchRadius: searchRadius,
        mealTypes: mealTypes,
        arrivalTime: arrivalTime
      });

      for (const mealType of mealTypes) {
        const config = this.MEAL_CONFIGS[mealType as keyof typeof this.MEAL_CONFIGS];
        
        // Search for places of each type
        const allOptions: DiningOption[] = [];
        
        for (const placeType of config.types) {
          try {
            console.log(`🔍 Searching for ${mealType} - ${placeType}:`, {
              location: { lat: midLat, lng: midLng },
              radius: searchRadius,
              type: placeType,
              keyword: config.keywords
            });
            
            const results = await GoogleMapsService.nearbySearch({
              location: { lat: midLat, lng: midLng },
              radius: searchRadius,
              type: placeType,
              keyword: config.keywords
            });
            
            console.log(`📍 Search results for ${mealType} - ${placeType}:`, {
              resultsCount: results.length,
              firstResult: results[0] ? results[0].name : 'none'
            });

            // Filter and enhance results
            const filteredOptions = results
              .filter((place: any) => 
                place.rating >= 3.5 && 
                place.user_ratings_total >= 10 &&
                this.isValidDiningPlace(place, config.types)
              )
              .map((place: any) => ({
                ...place,
                distance_from_route: this.calculateDistanceFromRoute(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                ),
                detour_time: this.estimateDetourTime(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                )
              }))
              .filter((place: DiningOption) => 
                (place.distance_from_route || 0) <= maxDetourKm * 1000
              );

            allOptions.push(...filteredOptions);
          } catch (error) {
            console.error(`Error searching for ${placeType}:`, error);
          }
        }
        
        // If no results found, try a broader search without type restriction
        if (allOptions.length === 0) {
          console.log(`🔍 No results found for ${mealType}, trying broader search...`);
          try {
            const broadResults = await GoogleMapsService.nearbySearch({
              location: { lat: midLat, lng: midLng },
              radius: searchRadius,
              keyword: config.keywords
            });
            
            console.log(`📍 Broad search results for ${mealType}:`, {
              resultsCount: broadResults.length,
              firstResult: broadResults[0] ? broadResults[0].name : 'none'
            });
            
            // Filter and enhance broader results
            const filteredBroadOptions = broadResults
              .filter((place: any) => 
                place.rating >= 3.0 && // Lower rating threshold for broader search
                place.user_ratings_total >= 5 && // Lower rating count threshold
                this.isValidDiningPlace(place, config.types)
              )
              .map((place: any) => ({
                ...place,
                distance_from_route: this.calculateDistanceFromRoute(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                ),
                detour_time: this.estimateDetourTime(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                )
              }))
              .filter((place: DiningOption) => 
                (place.distance_from_route || 0) <= maxDetourKm * 1000
              );
            
            allOptions.push(...filteredBroadOptions);
          } catch (error) {
            console.error(`Error in broad search for ${mealType}:`, error);
          }
        }
        
        // If still no results, try a last resort search with larger radius
        if (allOptions.length === 0) {
          console.log(`🔍 Still no results for ${mealType}, trying last resort search with larger radius...`);
          try {
            const lastResortResults = await GoogleMapsService.nearbySearch({
              location: { lat: midLat, lng: midLng },
              radius: Math.min(searchRadius * 2, 5000), // Double the radius, max 5km
              type: 'restaurant'
            });
            
            console.log(`📍 Last resort search results for ${mealType}:`, {
              resultsCount: lastResortResults.length,
              firstResult: lastResortResults[0] ? lastResortResults[0].name : 'none'
            });
            
            // Filter and enhance last resort results
            const filteredLastResortOptions = lastResortResults
              .filter((place: any) => 
                place.rating >= 2.5 && // Even lower rating threshold
                place.user_ratings_total >= 1 // Very low rating count threshold
              )
              .map((place: any) => ({
                ...place,
                distance_from_route: this.calculateDistanceFromRoute(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                ),
                detour_time: this.estimateDetourTime(
                  place.geometry.location.lat,
                  place.geometry.location.lng,
                  fromLat, fromLng, toLat, toLng
                )
              }))
              .filter((place: DiningOption) => 
                (place.distance_from_route || 0) <= maxDetourKm * 2000 // Double the detour distance
              );
            
            allOptions.push(...filteredLastResortOptions);
          } catch (error) {
            console.error(`Error in last resort search for ${mealType}:`, error);
          }
        }

        // Remove duplicates and sort by rating and proximity
        const uniqueOptions = this.removeDuplicates(allOptions);
        const sortedOptions = uniqueOptions
          .sort((a, b) => {
            // Prioritize by rating, then by minimal detour
            const ratingDiff = (b.rating * Math.log(b.user_ratings_total + 1)) - 
                              (a.rating * Math.log(a.user_ratings_total + 1));
            if (Math.abs(ratingDiff) > 0.3) return ratingDiff;
            return (a.distance_from_route || 0) - (b.distance_from_route || 0);
          })
          .slice(0, 5); // Top 5 options per meal type

        if (sortedOptions.length > 0) {
          recommendations.push({
            meal_type: mealType as any,
            meal_label: config.label,
            emoji: config.emoji,
            search_types: config.types,
            options: sortedOptions
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error finding dining options:', error);
      return [];
    }
  }

  /**
   * Check if place is a valid dining establishment
   */
  private static isValidDiningPlace(place: any, allowedTypes: string[]): boolean {
    if (!place.types || !Array.isArray(place.types)) return false;
    
    // Must have at least one of the allowed types
    const hasValidType = place.types.some((type: string) => 
      allowedTypes.includes(type)
    );
    
    // Exclude certain irrelevant places
    const excludeTypes = ['gas_station', 'hospital', 'pharmacy', 'school'];
    const hasExcludedType = place.types.some((type: string) => 
      excludeTypes.includes(type)
    );
    
    return hasValidType && !hasExcludedType;
  }

  /**
   * Remove duplicate places based on place_id and location
   */
  private static removeDuplicates(options: DiningOption[]): DiningOption[] {
    const seen = new Set<string>();
    return options.filter(option => {
      const key = option.place_id || `${option.geometry.location.lat}_${option.geometry.location.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate distance from a point to a route (line between two points)
   */
  private static calculateDistanceFromRoute(
    pointLat: number,
    pointLng: number,
    routeStartLat: number,
    routeStartLng: number,
    routeEndLat: number,
    routeEndLng: number
  ): number {
    // Calculate distance from point to line segment
    const A = pointLat - routeStartLat;
    const B = pointLng - routeStartLng;
    const C = routeEndLat - routeStartLat;
    const D = routeEndLng - routeStartLng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = routeStartLat;
      yy = routeStartLng;
    } else if (param > 1) {
      xx = routeEndLat;
      yy = routeEndLng;
    } else {
      xx = routeStartLat + param * C;
      yy = routeStartLng + param * D;
    }

    return this.calculateDistance(pointLat, pointLng, xx, yy) * 1000; // Convert to meters
  }

  /**
   * Calculate complete travel time breakdown for dining stop using Google Routes API
   */
  static async calculateTravelTimeBreakdown(
    pointLat: number,
    pointLng: number,
    routeStartLat: number,
    routeStartLng: number,
    routeEndLat: number,
    routeEndLng: number
  ): Promise<{
    travelToRestaurant: number; // minutes
    travelFromRestaurant: number; // minutes
    totalExtraTravel: number; // minutes
    directRouteTime: number; // minutes for comparison
    travelToMode: 'walking' | 'driving';
    travelFromMode: 'walking' | 'driving';
    travelToIcon: string;
    travelFromIcon: string;
  }> {
    // Validate input coordinates
    if (isNaN(pointLat) || isNaN(pointLng) || isNaN(routeStartLat) || 
        isNaN(routeStartLng) || isNaN(routeEndLat) || isNaN(routeEndLng)) {
      console.error('Invalid coordinates provided to calculateTravelTimeBreakdown - cannot calculate travel time');
      throw new Error('Invalid coordinates provided for travel time calculation');
    }

    try {
      // Create coordinate strings for Distance Matrix API
      const startCoords = `${routeStartLat},${routeStartLng}`;
      const restaurantCoords = `${pointLat},${pointLng}`;
      const endCoords = `${routeEndLat},${routeEndLng}`;
      
      console.log('🍽️ Calculating travel time breakdown:', {
        startCoords,
        restaurantCoords,
        endCoords
      });
      
      // Force fresh calculations with unique timestamps to bypass cache
      // This ensures we get both walking and driving options for dining stops
      const forceRefresh = new Date(Date.now() + Math.random() * 1000);
      
      console.log('🍽️ Starting fresh travel time calculations (cache bypassed):', {
        startCoords,
        restaurantCoords, 
        endCoords,
        timestamp: forceRefresh.toISOString()
      });
      
      // Get both walking and driving options for each segment to determine best mode
      const [
        travelToWalking, travelToDriving,
        travelFromWalking, travelFromDriving,
        directRouteResult
      ] = await Promise.all([
        DistanceMatrixService.calculateTravelTime(startCoords, restaurantCoords, 'walking', forceRefresh),
        DistanceMatrixService.calculateTravelTime(startCoords, restaurantCoords, 'driving', forceRefresh),
        DistanceMatrixService.calculateTravelTime(restaurantCoords, endCoords, 'walking', forceRefresh),
        DistanceMatrixService.calculateTravelTime(restaurantCoords, endCoords, 'driving', forceRefresh),
        DistanceMatrixService.calculateTravelTime(startCoords, endCoords, 'driving', forceRefresh)
      ]);
      
      // FIXED: Default to driving mode unless explicitly chosen otherwise
      // This prevents auto-selection of walking mode for short distances
      // Users can manually switch to walking mode if they prefer
      const travelToResult = travelToDriving;
      const travelFromResult = travelFromDriving;
      
      console.log('🍽️ Travel time results:', {
        travelTo: `${travelToResult.duration}min (driving - default)`,
        travelFrom: `${travelFromResult.duration}min (driving - default)`,
        directRoute: directRouteResult.duration,
        walkingToTime: travelToWalking.duration,
        drivingToTime: travelToDriving.duration,
        walkingFromTime: travelFromWalking.duration,
        drivingFromTime: travelFromDriving.duration
      });

      // Total detour time vs direct route
      const totalDetourTime = travelToResult.duration + travelFromResult.duration;
      const totalExtraTravel = Math.max(0, totalDetourTime - directRouteResult.duration);
      
      return {
        travelToRestaurant: travelToResult.duration,
        travelFromRestaurant: travelFromResult.duration,
        totalExtraTravel,
        directRouteTime: directRouteResult.duration,
        travelToMode: travelToResult.mode,
        travelFromMode: travelFromResult.mode,
        travelToIcon: travelToResult.icon,
        travelFromIcon: travelFromResult.icon,
        // Add both walking and driving options for UI
        travelToOptions: {
          walking: { duration: travelToWalking.duration, icon: travelToWalking.icon },
          driving: { duration: travelToDriving.duration, icon: travelToDriving.icon }
        },
        travelFromOptions: {
          walking: { duration: travelFromWalking.duration, icon: travelFromWalking.icon },
          driving: { duration: travelFromDriving.duration, icon: travelFromDriving.icon }
        }
      };
    } catch (error) {
      console.error('❌ Error calculating travel time breakdown:', error);
      console.error('Failed coordinates:', {
        pointLat,
        pointLng,
        routeStartLat,
        routeStartLng,
        routeEndLat,
        routeEndLng
      });
      throw new Error(`Failed to calculate travel time breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate additional time for detour (in minutes) - Legacy method for initial search
   */
  private static estimateDetourTime(
    pointLat: number,
    pointLng: number,
    routeStartLat: number,
    routeStartLng: number,
    routeEndLat: number,
    routeEndLng: number
  ): number {
    // Use simple calculation for initial search to avoid too many API calls
    const directDistance = this.calculateDistance(routeStartLat, routeStartLng, routeEndLat, routeEndLng);
    const distanceToRestaurant = this.calculateDistance(routeStartLat, routeStartLng, pointLat, pointLng);
    const distanceFromRestaurant = this.calculateDistance(pointLat, pointLng, routeEndLat, routeEndLng);
    
    // Simple time estimates
    const directTime = Math.round((directDistance / 30) * 60); // 30 km/h driving
    const detourTime = Math.round(((distanceToRestaurant + distanceFromRestaurant) / 30) * 60);
    
    return Math.max(0, detourTime - directTime);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get photo URL for a place
   */
  static getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return GoogleMapsService.getPhotoUrl(photoReference, maxWidth);
  }

  /**
   * Format price level for display
   */
  static formatPriceLevel(priceLevel?: number): string {
    if (!priceLevel) return '💰';
    return '💰'.repeat(Math.min(priceLevel, 4));
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m detour`;
    }
    return `${(meters / 1000).toFixed(1)}km detour`;
  }

  /**
   * Format detour time for display
   */
  static formatDetourTime(minutes: number): string {
    if (minutes < 60) {
      return `+${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `+${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  }

  /**
   * Calculate appropriate dining duration
   */
  static calculateDiningDuration(
    mealType: string,
    typicalTimeSpent?: string
  ): number {
    try {
      // If typical_time_spent is provided, parse it
      if (typicalTimeSpent && typeof typicalTimeSpent === 'string') {
        const duration = this.parseTypicalTimeSpent(typicalTimeSpent);
        if (duration > 0 && duration <= 300) { // Max 5 hours
          return duration;
        }
      }

      // Use default duration based on meal type
      const config = this.MEAL_CONFIGS[mealType as keyof typeof this.MEAL_CONFIGS];
      const defaultDuration = config?.default_duration || 45;
      
      // Ensure duration is within reasonable bounds
      return Math.max(10, Math.min(300, defaultDuration));
    } catch (error) {
      console.warn('Error calculating dining duration:', error);
      return 45; // Safe fallback
    }
  }

  /**
   * Parse typical_time_spent string from Google Places
   */
  private static parseTypicalTimeSpent(timeSpent: string): number {
    // Handle formats like "45 minutes", "1 hour", "1.5 hours", "90 min"
    const hourMatch = timeSpent.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)/i);
    if (hourMatch) {
      return Math.round(parseFloat(hourMatch[1]) * 60);
    }

    const minuteMatch = timeSpent.match(/(\d+)\s*(?:minute|min)/i);
    if (minuteMatch) {
      return parseInt(minuteMatch[1], 10);
    }

    // Handle "1-2 hours" format
    const rangeMatch = timeSpent.match(/(\d+)-(\d+)\s*(?:hour|hr)/i);
    if (rangeMatch) {
      const avg = (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
      return Math.round(avg * 60);
    }

    return 0;
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Add minutes to a time string (HH:MM format)
   */
  static addMinutesToTime(timeString: string, minutes: number): string {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Calculate time difference in minutes
   */
  static getTimeDifferenceMinutes(startTime: string, endTime: string): number {
    const [startHours, startMins] = startTime.split(':').map(x => parseInt(x, 10));
    const [endHours, endMins] = endTime.split(':').map(x => parseInt(x, 10));
    
    const startMinutes = startHours * 60 + startMins;
    const endMinutes = endHours * 60 + endMins;
    
    return endMinutes - startMinutes;
  }
}

export default DiningService;