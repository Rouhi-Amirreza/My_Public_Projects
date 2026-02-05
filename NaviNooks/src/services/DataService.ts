import { ConsolidatedPlacesData, PlaceData } from '../types';
import { CityInfo, CityService } from './CityService';
import philadelphiaData from '../data/consolidated_places_data_v7.json';

// Lazy loading function for city data
const loadCityData = async (cityId: string): Promise<any> => {
  try {
    let cityData;
    switch (cityId) {
      case 'anaheim':
        cityData = (await import('../../Cities_Json/Anaheim_consolidated_places_data.json')).default;
        break;
      case 'atlanta':
        cityData = (await import('../../Cities_Json/Atlanta_consolidated_places_data.json')).default;
        break;
      case 'austin':
        cityData = (await import('../../Cities_Json/Austin_consolidated_places_data.json')).default;
        break;
      case 'boston':
        cityData = (await import('../../Cities_Json/Boston_consolidated_places_data.json')).default;
        break;
      case 'charlotte':
        cityData = (await import('../../Cities_Json/Charlotte_consolidated_places_data.json')).default;
        break;
      case 'chicago':
        cityData = (await import('../../Cities_Json/Chicago_consolidated_places_data.json')).default;
        break;
      case 'dallas':
        cityData = (await import('../../Cities_Json/Dallas_consolidated_places_data.json')).default;
        break;
      case 'denver':
        cityData = (await import('../../Cities_Json/Denver_consolidated_places_data.json')).default;
        break;
      case 'honolulu':
        cityData = (await import('../../Cities_Json/Honolulu_consolidated_places_data.json')).default;
        break;
      case 'houston':
        cityData = (await import('../../Cities_Json/Houston_consolidated_places_data.json')).default;
        break;
      case 'las_vegas':
        cityData = (await import('../../Cities_Json/Las_Vegas_consolidated_places_data.json')).default;
        break;
      case 'los_angeles':
        cityData = (await import('../../Cities_Json/Los_Angeles_consolidated_places_data.json')).default;
        break;
      case 'miami':
        cityData = (await import('../../Cities_Json/Miami_consolidated_places_data.json')).default;
        break;
      case 'nashville':
        cityData = (await import('../../Cities_Json/Nashville_consolidated_places_data.json')).default;
        break;
      case 'new_orleans':
        cityData = (await import('../../Cities_Json/New_Orleans_consolidated_places_data.json')).default;
        break;
      case 'new_york_city':
        cityData = (await import('../../Cities_Json/New_York_City_consolidated_places_data.json')).default;
        break;
      case 'orlando':
        cityData = (await import('../../Cities_Json/Orlando_consolidated_places_data.json')).default;
        break;
      case 'phoenix':
        cityData = (await import('../../Cities_Json/Phoenix_consolidated_places_data.json')).default;
        break;
      case 'portland':
        cityData = (await import('../../Cities_Json/Portland_consolidated_places_data.json')).default;
        break;
      case 'san_antonio':
        cityData = (await import('../../Cities_Json/San_Antonio_consolidated_places_data.json')).default;
        break;
      case 'san_diego':
        cityData = (await import('../../Cities_Json/San_Diego_consolidated_places_data.json')).default;
        break;
      case 'san_francisco':
        cityData = (await import('../../Cities_Json/San_Francisco_consolidated_places_data.json')).default;
        break;
      case 'san_jose':
        cityData = (await import('../../Cities_Json/San_Jose_consolidated_places_data.json')).default;
        break;
      case 'savannah':
        cityData = (await import('../../Cities_Json/Savannah_consolidated_places_data.json')).default;
        break;
      case 'seattle':
        cityData = (await import('../../Cities_Json/Seattle_consolidated_places_data.json')).default;
        break;
      case 'tampa':
        cityData = (await import('../../Cities_Json/Tampa_consolidated_places_data.json')).default;
        break;
      case 'washington_dc':
        cityData = (await import('../../Cities_Json/Washington_DC_consolidated_places_data.json')).default;
        break;
      case 'philadelphia':
        cityData = (await import('../../Cities_Json/Philadelphia_consolidated_places_data.json')).default;
        break;
      default:
        throw new Error(`Unknown city: ${cityId}`);
    }
    return cityData;
  } catch (error) {
    console.error(`Failed to load data for city: ${cityId}`, error);
    throw error;
  }
};

class DataService {
  private data: ConsolidatedPlacesData | null = null;
  private currentCity: CityInfo | null = null;
  private cityDataCache: Map<string, ConsolidatedPlacesData> = new Map();

  constructor() {
    // Initialize with Philadelphia data for backward compatibility
    this.loadDefaultCity();
  }

  /**
   * Load default city (Philadelphia) for backward compatibility
   */
  private loadDefaultCity(): void {
    const philadelphiaCity: CityInfo = {
      id: 'philadelphia',
      name: 'philadelphia',
      displayName: 'Philadelphia',
      fileName: 'consolidated_places_data_v7.json',
      isAvailable: true,
      coordinates: {
        latitude: 39.9526,
        longitude: -75.1652
      }
    };
    
    this.currentCity = philadelphiaCity;
    this.data = this.normalizeData(philadelphiaData as any);
    this.cityDataCache.set('philadelphia', this.data);
    console.log('🏙️ DataService initialized with default city: Philadelphia');
  }

  /**
   * Load data for a specific city
   */
  async loadCityData(cityId: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.cityDataCache.has(cityId)) {
        this.data = this.cityDataCache.get(cityId)!;
        this.currentCity = await CityService.getCityById(cityId);
        console.log(`🏙️ Loaded cached data for ${this.currentCity?.displayName}`);
        return true;
      }

      const city = await CityService.getCityById(cityId);
      if (!city) {
        console.error(`City with ID "${cityId}" not found`);
        return false;
      }

      // Load city data lazily
      const cityData = await loadCityData(cityId);

      const normalizedData = this.normalizeData(cityData);
      
      this.data = normalizedData;
      this.currentCity = city;
      this.cityDataCache.set(cityId, normalizedData);
      
      console.log(`🏙️ Loaded data for ${city.displayName}: ${Object.keys(normalizedData.places).length} places`);
      return true;
    } catch (error) {
      console.error(`Error loading data for city ${cityId}:`, error);
      return false;
    }
  }

  /**
   * Get current city info
   */
  getCurrentCity(): CityInfo | null {
    return this.currentCity;
  }

  /**
   * Get current city display name
   */
  getCurrentCityName(): string {
    return this.currentCity?.displayName || 'Unknown City';
  }

  /**
   * Convert raw JSON structure into simplified data model
   */
  private normalizeData(raw: any): ConsolidatedPlacesData {
    const places: Record<string, PlaceData> = {};
    for (const [name, info] of Object.entries(raw.places || {})) {
      const basic = (info as any).basic_info || {};
      const kg = (info as any).complete_search_results?.knowledge_graph || {};
      const coords = kg.local_map?.gps_coordinates || {};

      // Get coordinates from knowledge graph first, then fallback to basic.latitude/longitude, then basic.coordinates string
      let latitude = coords.latitude || 0;
      let longitude = coords.longitude || 0;
      
      // If no coordinates from knowledge graph, try basic.latitude/longitude (direct numbers)
      if ((latitude === 0 && longitude === 0) && (basic.latitude || basic.longitude)) {
        latitude = basic.latitude || 0;
        longitude = basic.longitude || 0;
      }
      
      // If still no coordinates, try to parse from basic.coordinates string
      if ((latitude === 0 && longitude === 0) && basic.coordinates) {
        const parsedCoords = this.parseCoordinatesString(basic.coordinates);
        latitude = parsedCoords.latitude;
        longitude = parsedCoords.longitude;
      }

      // Debug coordinate extraction for high-profile places and coordinate issues
      const isHighProfile = basic.user_ratings_total >= 10000 || name.toLowerCase().includes('millennium') || name.toLowerCase().includes('central park');
      const hasCoordinateIssue = (latitude === 0 && longitude === 0) && (basic.latitude || basic.longitude || basic.coordinates);
      
      if (isHighProfile || hasCoordinateIssue) {
        console.log(`🔍 COORDINATE EXTRACTION DEBUG for ${name}:`);
        console.log(`   Name: ${name}`);
        console.log(`   User Ratings: ${basic.user_ratings_total}`);
        console.log(`   KG coords: ${JSON.stringify(coords)}`);
        console.log(`   Basic lat/lng: ${basic.latitude}, ${basic.longitude}`);
        console.log(`   Basic coordinates string: ${basic.coordinates}`);
        console.log(`   Final coordinates: ${latitude}, ${longitude}`);
        
        if (hasCoordinateIssue) {
          console.log(`⚠️ COORDINATE ISSUE DETECTED - attempting automatic fix`);
        }
      }
      
      places[name] = {
        name: basic.name || name,
        place_id: kg.place_id || '',
        types: basic.types || [],
        business_status: basic.business_status || 'OPERATIONAL',
        description: basic.description || '',
        address: basic.address || '',
        coordinates: {
          latitude,
          longitude
        },
        rating: this.extractRating(basic.rating) || 0,
        user_ratings_total: basic.user_ratings_total || 0,
        opening_hours: basic.hours,
        price_level: basic.price_level,
        ticket_info: info.pricing_info,
        phone: basic.phone,
        website: basic.website,
        popular_times: info.popular_times,
        photos: [] // Photos now fetched from Google Places API directly
      } as PlaceData;
    }

    return {
      places,
      summary: raw.summary || {},
      metadata: raw.metadata || {}
    } as ConsolidatedPlacesData;
  }

  /**
   * Get all places data
   */
  getAllPlaces(): PlaceData[] {
    if (!this.data) {
      console.warn('No city data loaded. Please select a city first.');
      return [];
    }
    return Object.values(this.data.places);
  }

  /**
   * Get places by business status
   */
  getOperationalPlaces(): PlaceData[] {
    return this.getAllPlaces().filter(place =>
      place.business_status === 'OPERATIONAL' &&
      !(place.coordinates.latitude === 0 && place.coordinates.longitude === 0)
    );
  }

  /**
   * Get places by rating threshold
   */
  getHighRatedPlaces(minRating: number = 4.0): PlaceData[] {
    return this.getOperationalPlaces().filter(place => {
      const rating = typeof place.rating === 'string' 
        ? parseFloat(place.rating.split(' ')[0]) 
        : place.rating;
      return rating >= minRating;
    });
  }

  /**
   * Get places by price level
   */
  getPlacesByPriceLevel(maxPriceLevel: number): PlaceData[] {
    return this.getOperationalPlaces().filter(place => 
      (place.price_level || 0) <= maxPriceLevel
    );
  }

  /**
   * Search places by name or description
   */
  searchPlaces(query: string): PlaceData[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getOperationalPlaces().filter(place =>
      place.name.toLowerCase().includes(lowercaseQuery) ||
      place.description?.toLowerCase().includes(lowercaseQuery) ||
      place.address.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get places by type
   */
  getPlacesByType(types: string[]): PlaceData[] {
    return this.getOperationalPlaces().filter(place =>
      place.types.some(type => 
        types.some(searchType => 
          type.toLowerCase().includes(searchType.toLowerCase())
        )
      )
    );
  }

  /**
   * Detect and report coordinate extraction issues for debugging
   */
  detectCoordinateIssues(): void {
    if (!this.data) {
      console.log('No city data loaded to check for coordinate issues');
      return;
    }

    const allPlaces = this.getAllPlaces();
    const operationalPlaces = this.getOperationalPlaces();
    const coordinateIssues = allPlaces.filter(place => 
      place.coordinates.latitude === 0 && place.coordinates.longitude === 0
    );
    
    const highProfileCoordinateIssues = coordinateIssues.filter(place => {
      const reviewCount = this.extractReviewCount(place.user_ratings_total?.toString() || '0');
      return reviewCount >= 5000; // High-profile places with coordinate issues
    });

    console.log(`\n🔍 COORDINATE EXTRACTION ANALYSIS:`);
    console.log(`   Total places: ${allPlaces.length}`);
    console.log(`   Operational places: ${operationalPlaces.length}`);
    console.log(`   Places with coordinate issues: ${coordinateIssues.length}`);
    console.log(`   High-profile places with coordinate issues: ${highProfileCoordinateIssues.length}`);

    if (highProfileCoordinateIssues.length > 0) {
      console.log(`\n⚠️ HIGH-PROFILE PLACES WITH COORDINATE ISSUES:`);
      highProfileCoordinateIssues.forEach(place => {
        const reviewCount = this.extractReviewCount(place.user_ratings_total?.toString() || '0');
        console.log(`   - ${place.name} (${reviewCount} reviews, types: ${place.types.join(', ')})`);
      });
      console.log(`\n💡 These places are being filtered out and won't appear in itineraries!`);
    }

    if (coordinateIssues.length > 0) {
      console.log(`\n📊 COORDINATE ISSUE BREAKDOWN:`);
      const issueTypes = coordinateIssues.reduce((acc, place) => {
        const hasTouristAttraction = place.types.some(type => type.includes('tourist_attraction'));
        const reviewCount = this.extractReviewCount(place.user_ratings_total?.toString() || '0');
        
        if (hasTouristAttraction && reviewCount >= 1000) {
          acc.touristAttractions++;
        } else if (reviewCount >= 1000) {
          acc.highProfile++;
        } else {
          acc.other++;
        }
        return acc;
      }, { touristAttractions: 0, highProfile: 0, other: 0 });

      console.log(`   Tourist attractions: ${issueTypes.touristAttractions}`);
      console.log(`   High-profile places: ${issueTypes.highProfile}`);
      console.log(`   Other places: ${issueTypes.other}`);
    }
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return this.data.summary;
  }

  /**
   * Get metadata
   */
  getMetadata() {
    return this.data.metadata;
  }

  /**
   * Extract review count from review string
   */
  extractReviewCount(reviewsString: string): number {
    if (!reviewsString) return 0;
    const match = reviewsString.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }

  /**
   * Extract rating value from rating string
   */
  extractRating(rating: string | number): number {
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') {
      const match = rating.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    }
    return 0;
  }


  /**
   * Parse coordinates from string format like "39°57′15″N 75°09′57″W﻿ / ﻿39.9542°N 75.1657°W"
   */
  private parseCoordinatesString(coordString: string): { latitude: number; longitude: number } {
    if (!coordString || typeof coordString !== 'string') {
      return { latitude: 0, longitude: 0 };
    }
    
    // Extract decimal coordinates from string like "39°57′15″N 75°09′57″W﻿ / ﻿39.9542°N 75.1657°W"
    const match = coordString.match(/(\d+\.\d+)°N\s+(\d+\.\d+)°W/);
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: -parseFloat(match[2]) // West is negative
      };
    }
    
    // Fallback: try to extract any decimal number patterns for lat/lng
    const numbers = coordString.match(/(\d+\.\d+)/g);
    if (numbers && numbers.length >= 2) {
      // Assume first number is latitude, second is longitude
      // For Philadelphia area, latitude should be ~39-40, longitude should be ~75 (make negative)
      const lat = parseFloat(numbers[0]);
      const lng = parseFloat(numbers[1]);
      
      // Validate ranges for Philadelphia area
      if (lat >= 39 && lat <= 41 && lng >= 74 && lng <= 76) {
        return {
          latitude: lat,
          longitude: -lng // Philadelphia is west, so negative
        };
      }
    }
    
    return { latitude: 0, longitude: 0 };
  }

  /**
   * Get places within radius of coordinates
   */
  getPlacesNearLocation(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10
  ): PlaceData[] {
    return this.getOperationalPlaces().filter(place => {
      const coords = this.getPlaceCoordinates(place);
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        coords.latitude, 
        coords.longitude
      );
      return distance <= radiusKm;
    });
  }

  /**
   * Extract coordinates from place object with fallback handling
   */
  private getPlaceCoordinates(place: any): { latitude: number; longitude: number } {
    // Try different coordinate structures
    if (place.coordinates) {
      // Check for latitude/longitude format
      if (typeof place.coordinates.latitude === 'number' && typeof place.coordinates.longitude === 'number') {
        return {
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude
        };
      }
      // Check for lat/lng format  
      if (typeof place.coordinates.lat === 'number' && typeof place.coordinates.lng === 'number') {
        return {
          latitude: place.coordinates.lat,
          longitude: place.coordinates.lng
        };
      }
    }
    
    // Try basic_info.latitude/longitude as fallback
    if (place.basic_info?.latitude && place.basic_info?.longitude) {
      return {
        latitude: parseFloat(place.basic_info.latitude),
        longitude: parseFloat(place.basic_info.longitude)
      };
    }
    
    // If no coordinates found, return Philadelphia center as fallback
    console.warn(`⚠️ No coordinates found for place: ${place.name || 'unknown'}, using Philadelphia center`);
    return {
      latitude: 39.9526,
      longitude: -75.1652
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
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
}

export default new DataService();

