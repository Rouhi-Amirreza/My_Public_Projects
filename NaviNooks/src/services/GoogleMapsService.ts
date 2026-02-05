import { GOOGLE_API_KEY } from '../utils/constants';
import GoogleAPICallCounter from './GoogleAPICallCounter';
import DistanceMatrixService from './DistanceMatrixService';

interface GooglePlacesAutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface DistanceMatrixElement {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  status: string;
}

interface DistanceMatrixResponse {
  rows: Array<{
    elements: DistanceMatrixElement[];
  }>;
  status: string;
}

class GoogleMapsService {
  private apiKey: string;

  constructor() {
    this.apiKey = GOOGLE_API_KEY;
  }

  /**
   * Get autocomplete suggestions for address input
   */
  async getPlaceAutocomplete(
    input: string, 
    location?: { lat: number; lng: number },
    options?: { types?: string }
  ): Promise<GooglePlacesAutocompleteResult[]> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
      const params = new URLSearchParams({
        input,
        key: this.apiKey,
        components: 'country:us'
      });
      
      // Only add types if explicitly provided
      if (options?.types) {
        params.append('types', options.types);
      }

      if (location) {
        params.append('location', `${location.lat},${location.lng}`);
        params.append('radius', '25000'); // 25km radius for city-specific search
        params.append('strictbounds', 'true'); // Enforce strict bounds
      }

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions || [];
      } else {
        console.warn('Places Autocomplete API error:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        fields: 'place_id,name,formatted_address,geometry'
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.result;
      } else {
        console.warn('Place Details API error:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = new URLSearchParams({
        address,
        key: this.apiKey
      });

      const startTime = Date.now();
      const response = await fetch(`${baseUrl}?${params}`);
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        // Record successful API call
        GoogleAPICallCounter.getInstance().recordAPICall(
          'geocoding',
          baseUrl,
          'single',
          1,
          false, // not cached
          true,  // success
          undefined,
          responseTime
        );
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      } else {
        // Record failed API call
        GoogleAPICallCounter.getInstance().recordAPICall(
          'geocoding',
          baseUrl,
          'single',
          1,
          false, // not cached
          false, // failed
          `Geocoding API error: ${data.status}`,
          responseTime
        );
        console.warn('Geocoding API error:', data.status);
        return null;
      }
    } catch (error) {
      // Record failed API call
      GoogleAPICallCounter.getInstance().recordAPICall(
        'geocoding',
        'https://maps.googleapis.com/maps/api/geocode/json',
        'single',
        1,
        false, // not cached
        false, // failed
        error instanceof Error ? error.message : String(error)
      );
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Get travel times and distances between multiple locations with travel mode
   */
  async getDistanceMatrix(
    origins: string[],
    destinations: string[],
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<{ duration: number; distance: number; mode: string }[][]> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = new URLSearchParams({
        origins: origins.join('|'),
        destinations: destinations.join('|'),
        mode,
        units: 'metric',
        key: this.apiKey
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data: DistanceMatrixResponse = await response.json();

      if (data.status === 'OK') {
        return data.rows.map(row =>
          row.elements.map(element => ({
            duration: element.status === 'OK' ? element.duration.value : 0,
            distance: element.status === 'OK' ? element.distance.value : 0,
            mode: element.status === 'OK' ? mode : 'driving'
          }))
        );
      } else {
        console.warn('Distance Matrix API error:', data.status);
        return this.createFallbackMatrix(origins, destinations, mode);
      }
    } catch (error) {
      console.error('Error fetching distance matrix:', error);
      return this.createFallbackMatrix(origins, destinations, mode);
    }
  }

  /**
   * Get optimized route using Google Directions API
   */
  async getOptimizedRoute(
    origin: string,
    destination: string,
    waypoints: string[],
    optimize: boolean = true
  ): Promise<any> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
      const params = new URLSearchParams({
        origin,
        destination,
        waypoints: waypoints.join('|'),
        optimize_waypoints: optimize.toString(),
        key: this.apiKey
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return data;
      } else {
        console.warn('Directions API error:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching optimized route:', error);
      return null;
    }
  }

  /**
   * Nearby search for places
   */
  async nearbySearch(params: {
    location: { lat: number; lng: number };
    radius: number;
    type?: string;
    keyword?: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams({
        location: `${params.location.lat},${params.location.lng}`,
        radius: params.radius.toString(),
        key: this.apiKey,
      });

      if (params.type) {
        queryParams.append('type', params.type);
      }

      if (params.keyword) {
        queryParams.append('keyword', params.keyword);
      }

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${queryParams}`;
      
      console.log('🔍 Nearby search request:', {
        location: `${params.location.lat},${params.location.lng}`,
        radius: params.radius,
        type: params.type,
        keyword: params.keyword,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        url: url.replace(this.apiKey, 'API_KEY_HIDDEN')
      });
      
      const response = await fetch(url);
      const data = await response.json();

      console.log('📍 Nearby search response:', {
        status: data.status,
        resultsCount: data.results?.length || 0,
        errorMessage: data.error_message,
        nextPageToken: data.next_page_token
      });

      if (data.status === 'OK') {
        return data.results || [];
      } else {
        console.warn('Nearby search API error:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Error in nearby search:', error);
      return [];
    }
  }

  /**
   * Get photo URL for a place (legacy API)
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }

  /**
   * Get place details with photos using the new Places API
   */
  async getPlaceDetailsWithPhotos(placeId: string): Promise<{
    displayName?: string;
    photos?: Array<{
      name: string;
      widthPx: number;
      heightPx: number;
      authorAttributions?: Array<{
        displayName: string;
        uri?: string;
        photoUri?: string;
      }>;
    }>;
  } | null> {
    try {
      const baseUrl = 'https://places.googleapis.com/v1/places/' + placeId;
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,displayName,photos'
        }
      });

      const data = await response.json();

      if (response.ok && data) {
        return {
          displayName: data.displayName,
          photos: data.photos || []
        };
      } else {
        console.warn('Places API (New) error:', data.error || response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching place details with photos:', error);
      return null;
    }
  }

  /**
   * Get photo URL using the new Places Photos API
   */
  getPlacePhotoUrl(photoName: string, maxWidth: number = 400, maxHeight: number = 400): string {
    const baseUrl = `https://places.googleapis.com/v1/${photoName}/media`;
    const params = new URLSearchParams({
      key: this.apiKey,
      maxWidthPx: maxWidth.toString(),
      maxHeightPx: maxHeight.toString()
    });
    
    return `${baseUrl}?${params}`;
  }

  /**
   * Search for places by text query using the new Places API
   */
  async searchPlacesByText(textQuery: string, location?: { lat: number; lng: number }): Promise<Array<{
    id: string;
    displayName?: string;
    photos?: Array<{
      name: string;
      widthPx: number;
      heightPx: number;
    }>;
  }>> {
    try {
      const baseUrl = 'https://places.googleapis.com/v1/places:searchText';
      
      const requestBody: any = {
        textQuery,
        maxResultCount: 5
      };

      if (location) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: 50000 // 50km radius
          }
        };
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.places) {
        return data.places;
      } else {
        console.warn('Places Text Search API error:', data.error || response.status);
        return [];
      }
    } catch (error) {
      console.error('Error searching places by text:', error);
      return [];
    }
  }

  /**
   * Get precise travel time using Google Directions API for most accurate routing
   */
  async getPreciseTravelTime(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking'
  ): Promise<{ duration: number; distance: number; mode: 'walking' | 'driving'; icon: string }> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
      const params = new URLSearchParams({
        origin,
        destination,
        mode,
        key: this.apiKey,
        units: 'metric',
        alternatives: 'false'
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        console.log(`📍 Using Google Directions API for ${mode}: ${Math.round(leg.duration.value / 60)}min, ${leg.distance.value}m`);
        
        return {
          duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
          distance: leg.distance.value, // meters
          mode,
          icon: mode === 'walking' ? '🚶' : '🚗'
        };
      } else {
        console.warn('📍 Directions API response:', data.status);
        throw new Error(`Directions API error: ${data.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Precise travel time calculation failed (will try fallback):', error.message || error);
      // Re-throw the error so that getTravelTimeByNames can try different formats
      throw error;
    }
  }

  /**
   * Get ultra-precise travel time using Google Routes API v2 (most advanced)
   */
  async getUltraPreciseTravelTime(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking'
  ): Promise<{ duration: number; distance: number; mode: 'walking' | 'driving'; icon: string }> {
    try {
      const baseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      
      // Parse coordinates
      const [originLat, originLng] = origin.split(',').map(Number);
      const [destLat, destLng] = destination.split(',').map(Number);
      
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: originLat,
              longitude: originLng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destLat,
              longitude: destLng
            }
          }
        },
        travelMode: mode.toUpperCase(),
        routingPreference: mode === 'driving' ? 'TRAFFIC_AWARE' : 'SHORTEST',
        computeAlternativeRoutes: false,
        units: 'METRIC'
      };

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
        const distanceMeters = route.distanceMeters || 0;
        const durationMinutes = Math.round(durationSeconds / 60);
        
        console.log(`✅ Using Google Routes API v2 for ${mode}: ${durationMinutes}min, ${distanceMeters}m`);
        
        return {
          duration: Math.round(durationSeconds / 60), // Convert to minutes
          distance: distanceMeters,
          mode,
          icon: mode === 'walking' ? '🚶' : '🚗'
        };
      } else {
        throw new Error('No routes found in Routes API v2 response');
      }
    } catch (error) {
      console.warn('Routes API v2 failed, falling back to Directions API:', error);
      // Fallback to regular Directions API
      return this.getPreciseTravelTime(origin, destination, mode);
    }
  }

  /**
   * Get travel time using place names when coordinates are not available
   */
  async getTravelTimeByNames(
    originName: string,
    destinationName: string,
    city: string = 'Philadelphia, PA'
  ): Promise<{ duration: number; distance: number; mode: 'walking' | 'driving'; icon: string }> {
    console.log(`🔍 Getting travel time by place names: "${originName}" → "${destinationName}"`);
    
    // Try multiple formatting approaches for better success rate
    const formatOptions = [
      // Option 1: Just the place names with city
      [`${originName}, ${city}`, `${destinationName}, ${city}`],
      // Option 2: Place names without city (sometimes works better)
      [originName, destinationName],
      // Option 3: Simplified names (remove common words that might confuse the API)
      [this.simplifyPlaceName(originName), this.simplifyPlaceName(destinationName)],
      // Option 4: With state only
      [`${originName}, PA`, `${destinationName}, PA`]
    ];
    
    for (let i = 0; i < formatOptions.length; i++) {
      const [origin, destination] = formatOptions[i];
      
      try {
        console.log(`🔄 Trying format ${i + 1}: "${origin}" → "${destination}"`);
        
        // Try driving first
        const drivingResult = await this.getPreciseTravelTime(origin, destination, 'driving');
        console.log(`✅ Success with format ${i + 1}: ${drivingResult.duration}min driving`);
        return drivingResult;
        
      } catch (error) {
        console.log(`⚠️ Format ${i + 1} failed (trying next):`, error.message || 'API limitation');
        continue; // Try next format
      }
    }
    
    // If all formats fail, throw error to show the user
    console.warn('⚠️ All place name formats failed - Google Maps API limitations');
    throw new Error(`Could not find travel route between "${originName}" and "${destinationName}". API limitations.`);
  }

  /**
   * Simplify place names by removing common words that might confuse the API
   */
  private simplifyPlaceName(name: string): string {
    return name
      .replace(/\b(the|of|and|&|at|in|on)\b/gi, '') // Remove common words
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Smart travel time calculator using place names/addresses
   */
  async getSmartTravelTime(
    originPlace: any,
    destinationPlace: any,
    city: string = 'Philadelphia, PA'
  ): Promise<{ duration: number; distance: number; mode: 'walking' | 'driving'; icon: string }> {
    try {
      // Get place identifiers (names/addresses) for Distance Matrix API
      const originIdentifier = DistanceMatrixService.getPlaceIdentifier(originPlace);
      const destinationIdentifier = DistanceMatrixService.getPlaceIdentifier(destinationPlace);
      
      console.log(`🔍 Smart travel time: "${originIdentifier}" → "${destinationIdentifier}"`);
      
      // Calculate travel time using Distance Matrix API
      const result = await DistanceMatrixService.calculateTravelTime(
        originIdentifier,
        destinationIdentifier,
        'driving' // Default to driving, could be made intelligent
      );
      
      return {
        duration: result.duration,
        distance: result.distance,
        mode: result.mode,
        icon: result.mode === 'walking' ? '🚶' : '🚗'
      };
    } catch (error) {
      console.error('Error in getSmartTravelTime:', error);
      throw new Error(`Smart travel time calculation failed: ${error.message}`);
    }
  }

  /**
   * Helper to extract coordinates from place objects - ONLY uses basic_info.latitude and basic_info.longitude
   */
  private extractCoordinates(place: any): { latitude: number; longitude: number } {
    // ONLY look for latitude and longitude fields directly in basic_info
    if (place.basic_info?.latitude && place.basic_info?.longitude) {
      const lat = parseFloat(place.basic_info.latitude);
      const lng = parseFloat(place.basic_info.longitude);
      
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        console.log(`📍 Found coordinates in basic_info for ${place.basic_info?.name || 'unknown place'}: ${lat}, ${lng}`);
        return { latitude: lat, longitude: lng };
      }
    }
    
    // No latitude/longitude found in basic_info - let geocoding handle it
    const placeName = place.basic_info?.name || place.name || 'unknown place';
    const address = place.basic_info?.address || place.address;
    
    console.warn(`⚠️ No latitude/longitude in basic_info for "${placeName}", will use geocoding`);
    
    if (address) {
      throw new Error(`No coordinates found for "${placeName}". Will geocode address: ${address}`);
    } else {
      throw new Error(`No coordinates found for "${placeName}". Will geocode place name.`);
    }
  }

  /**
   * Get intelligent travel mode and time for two specific locations using coordinates
   */
  async getIntelligentTravelTime(
    origin: string,
    destination: string
  ): Promise<{ duration: number; distance: number; mode: 'walking' | 'driving'; icon: string }> {
    try {
      // Use coordinate strings directly with Distance Matrix API
      console.log(`🔍 Intelligent travel time: "${origin}" → "${destination}"`);
      
      const result = await DistanceMatrixService.calculateTravelTime(
        origin,
        destination,
        'driving' // Default to driving
      );
      
      return {
        duration: result.duration,
        distance: result.distance,
        mode: result.mode,
        icon: result.mode === 'walking' ? '🚶' : '🚗'
      };
    } catch (error) {
      console.error('Error getting intelligent travel time:', error);
      throw new Error(`Intelligent travel time calculation failed: ${error.message}`);
    }
  }

  /**
   * Create fallback distance matrix when API fails
   */
  private createFallbackMatrix(
    origins: string[],
    destinations: string[],
    mode: string = 'driving'
  ): { duration: number; distance: number; mode: string }[][] {
    const matrix: { duration: number; distance: number; mode: string }[][] = [];
    for (let i = 0; i < origins.length; i++) {
      const [lat1, lon1] = origins[i].split(',').map(Number);
      matrix[i] = [];
      for (let j = 0; j < destinations.length; j++) {
        const [lat2, lon2] = destinations[j].split(',').map(Number);
        const distanceKm = this.calculateCoordinateDistance(lat1, lon1, lat2, lon2);
        
        let duration: number;
        if (mode === 'walking') {
          duration = Math.round((distanceKm / 5) * 3600); // 5 km/h walking speed
        } else {
          duration = Math.round((distanceKm / 40) * 3600); // 40 km/h driving speed
        }
        
        matrix[i][j] = {
          duration,
          distance: distanceKm * 1000,
          mode
        };
      }
    }
    return matrix;
  }

  /**
   * Calculate coordinate-based distance as fallback
   */
  calculateCoordinateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.geocodeAddress('Philadelphia, PA');
      return response !== null;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }
}

export default new GoogleMapsService();

