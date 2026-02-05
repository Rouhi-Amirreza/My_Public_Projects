import GoogleMapsService from './GoogleMapsService';

export interface PlacePhotoInfo {
  place_id: string;
  photo_name: string;
  photo_url: string;
  cached_at: number;
  width: number;
  height: number;
}

export interface PlacePhotoDetails {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export class GooglePlacesImageService {
  private static readonly CACHE_EXPIRY_HOURS = 24;
  private static readonly DEFAULT_IMAGE_SIZE = 400;
  private static IMAGE_SERVER_URL = 'http://10.250.69.41:3001'; // Local image server accessible from iPhone
  
  private static photoCache: Map<string, PlacePhotoInfo> = new Map();
  private static photoDetailsCache: Map<string, PlacePhotoDetails[]> = new Map();
  private static initialized = false;

  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.cleanupExpiredCache();
    
    // Auto-detect image server URL
    await this.detectImageServerUrl();
    
    // Check if image server is running
    await this.checkImageServerHealth();
    
    this.initialized = true;
    console.log('✅ GooglePlacesImageService initialized');
  }

  /**
   * Auto-detect the correct image server URL
   */
  private static async detectImageServerUrl(): Promise<void> {
    const possibleUrls = [
      'http://localhost:3001',
      'http://10.250.69.41:3001',
      'http://10.250.69.41:3001',
      'http://10.250.69.41:3001',
      'http://10.250.69.41:3001',
      'http://10.250.69.41:3001'
    ];

    for (const url of possibleUrls) {
      try {
        const response = await fetch(`${url}/api/health`, { timeout: 1000 });
        if (response.ok) {
          this.IMAGE_SERVER_URL = url;
          console.log(`✅ Detected image server at: ${url}`);
          return;
        }
      } catch (error) {
        // Continue to next URL
      }
    }
    
    console.warn('⚠️ Could not auto-detect image server URL, using default');
  }

  /**
   * Check if image server is running and healthy
   */
  private static async checkImageServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.IMAGE_SERVER_URL}/api/health`, {
        timeout: 3000
      });
      
      if (response.ok) {
        const health = await response.json();
        console.log('✅ Image server is healthy:', health);
        return true;
      } else {
        console.warn('⚠️ Image server health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('❌ Image server is not available:', error.message);
      console.warn('💡 Start the image server: ./start-image-server.sh');
      return false;
    }
  }

  /**
   * Get photo URL for a place using Google Places API (New)
   */
  static async getPlacePhotoUrl(
    place_id: string,
    placeName: string,
    width: number = this.DEFAULT_IMAGE_SIZE,
    height: number = this.DEFAULT_IMAGE_SIZE
  ): Promise<string | null> {
    this.initialize();

    try {
      // Check cache first
      const cacheKey = `${place_id}_${width}x${height}`;
      const cached = this.photoCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        console.log(`📸 Using cached photo URL for ${placeName}`);
        return cached.photo_url;
      }

      // Get photo details from Google Places API
      const photoDetails = await this.getPlacePhotoDetails(place_id, placeName);
      
      if (!photoDetails || photoDetails.length === 0) {
        console.log(`❌ No photos found for ${placeName} (${place_id})`);
        return null;
      }

      // Use the first (best) photo
      const bestPhoto = photoDetails[0];
      
      // Generate Google Places Photo URL
      const googlePhotoUrl = GoogleMapsService.getPlacePhotoUrl(bestPhoto.name, width, height);
      
      // Use Google's direct API for now (local server disabled)
      let finalUrl = googlePhotoUrl;
      
      console.log(`📸 Using Google direct API for ${placeName}`);

      // Cache the result
      const cacheEntry: PlacePhotoInfo = {
        place_id,
        photo_name: bestPhoto.name,
        photo_url: finalUrl,
        cached_at: Date.now(),
        width: bestPhoto.widthPx,
        height: bestPhoto.heightPx
      };

      this.photoCache.set(cacheKey, cacheEntry);
      console.log(`✅ Generated photo URL for ${placeName}: ${finalUrl.substring(0, 80)}...`);
      
      return finalUrl;
    } catch (error) {
      console.error(`❌ Error getting photo for ${placeName}:`, error);
      return null;
    }
  }

  /**
   * Get photo details for a place
   */
  private static async getPlacePhotoDetails(
    place_id: string,
    placeName: string
  ): Promise<PlacePhotoDetails[] | null> {
    try {
      // Check cache first
      const cached = this.photoDetailsCache.get(place_id);
      if (cached) {
        console.log(`📸 Using cached photo details for ${placeName}`);
        return cached;
      }

      // If we have a Google Place ID, use Place Details API
      if (place_id && place_id.startsWith('ChIJ')) {
        console.log(`🔍 Fetching photos from Google Places API for ${placeName}`);
        
        const placeDetails = await GoogleMapsService.getPlaceDetailsWithPhotos(place_id);
        
        if (placeDetails && placeDetails.photos && placeDetails.photos.length > 0) {
          this.photoDetailsCache.set(place_id, placeDetails.photos);
          console.log(`✅ Found ${placeDetails.photos.length} photos for ${placeName}`);
          return placeDetails.photos;
        }
      }

      // Fallback: Search by place name
      console.log(`🔍 Searching for photos by place name: ${placeName}`);
      
      const searchResults = await GoogleMapsService.searchPlacesByText(placeName);
      
      if (searchResults.length > 0) {
        const bestMatch = searchResults[0];
        
        if (bestMatch.photos && bestMatch.photos.length > 0) {
          this.photoDetailsCache.set(place_id, bestMatch.photos);
          console.log(`✅ Found ${bestMatch.photos.length} photos via search for ${placeName}`);
          return bestMatch.photos;
        }
      }

      console.log(`❌ No photos found for ${placeName}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching photo details for ${placeName}:`, error);
      return null;
    }
  }

  /**
   * Check if cached data is still valid
   */
  private static isCacheValid(cached: PlacePhotoInfo): boolean {
    const ageInHours = (Date.now() - cached.cached_at) / (1000 * 60 * 60);
    return ageInHours < this.CACHE_EXPIRY_HOURS;
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupExpiredCache(): void {
    const toRemove: string[] = [];
    
    for (const [cacheKey, cached] of this.photoCache.entries()) {
      if (!this.isCacheValid(cached)) {
        toRemove.push(cacheKey);
      }
    }

    toRemove.forEach(key => this.photoCache.delete(key));
    
    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} expired photo cache entries`);
    }
  }

  /**
   * Preload photos for multiple places
   */
  static async preloadPlacePhotos(places: Array<{ 
    place_id: string; 
    name: string; 
  }>): Promise<void> {
    const promises = places.map(place => 
      this.getPlacePhotoUrl(place.place_id, place.name)
        .catch(error => {
          console.warn(`Failed to preload photo for ${place.name}:`, error);
          return null;
        })
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      console.log(`📸 Preloaded photos: ${successful}/${places.length} successful`);
    } catch (error) {
      console.error('Error preloading place photos:', error);
    }
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.photoCache.clear();
    this.photoDetailsCache.clear();
    console.log('🧹 Cleared all photo caches');
  }

  /**
   * Get cache statistics (both client and server)
   */
  static async getCacheStats(): Promise<{
    client: {
      photoUrlCache: number;
      photoDetailsCache: number;
      oldestEntry: Date | null;
      newestEntry: Date | null;
    };
    server?: {
      total_images: number;
      total_size_mb: number;
      oldest_image: string | null;
      newest_image: string | null;
    };
  }> {
    this.initialize();
    
    let oldestTime: number | null = null;
    let newestTime: number | null = null;
    
    for (const cached of this.photoCache.values()) {
      if (oldestTime === null || cached.cached_at < oldestTime) {
        oldestTime = cached.cached_at;
      }
      if (newestTime === null || cached.cached_at > newestTime) {
        newestTime = cached.cached_at;
      }
    }

    const clientStats = {
      photoUrlCache: this.photoCache.size,
      photoDetailsCache: this.photoDetailsCache.size,
      oldestEntry: oldestTime ? new Date(oldestTime) : null,
      newestEntry: newestTime ? new Date(newestTime) : null,
    };

    // Try to get server stats
    let serverStats;
    try {
      const response = await fetch(`${this.IMAGE_SERVER_URL}/api/cache/stats`);
      if (response.ok) {
        serverStats = await response.json();
      }
    } catch (error) {
      console.warn('Could not fetch server cache stats:', error);
    }

    return {
      client: clientStats,
      server: serverStats
    };
  }

  /**
   * Clear server cache
   */
  static async clearServerCache(): Promise<boolean> {
    try {
      const response = await fetch(`${this.IMAGE_SERVER_URL}/api/cache/clear`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error clearing server cache:', error);
      return false;
    }
  }
}

export default GooglePlacesImageService;