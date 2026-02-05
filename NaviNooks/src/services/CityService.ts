export interface CityInfo {
  id: string;
  name: string;
  displayName: string;
  fileName: string;
  isAvailable: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phrase?: string;
  backgroundImage?: string;
}

export class CityService {
  private static availableCities: CityInfo[] = [];
  private static initialized = false;

  /**
   * Initialize and scan for available cities
   * Note: In production, this will be replaced with server-side API calls
   */
  static async initializeCities(): Promise<void> {
    if (this.initialized) return;

    // Define all available cities from Cities_Json folder
    this.availableCities = [
      {
        id: 'philadelphia',
        name: 'philadelphia',
        displayName: 'Philadelphia',
        fileName: 'Philadelphia_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 39.9526, longitude: -75.1652 },
        phrase: 'City of Brotherly Love',
        backgroundImage: 'https://images.unsplash.com/photo-1539650116574-75c0c6d00a48?w=1200&h=800&fit=crop'
      },
      {
        id: 'anaheim',
        name: 'anaheim',
        displayName: 'Anaheim',
        fileName: 'Anaheim_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 33.8366, longitude: -117.9143 },
        phrase: 'The Happiest Place on Earth',
        backgroundImage: 'https://images.unsplash.com/photo-1539021080036-f76ad2f01682?w=1200&h=800&fit=crop'
      },
      {
        id: 'atlanta',
        name: 'atlanta',
        displayName: 'Atlanta',
        fileName: 'Atlanta_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 33.7490, longitude: -84.3880 },
        phrase: 'The Heart of the South',
        backgroundImage: 'https://images.unsplash.com/photo-1554815301-b54e99d00fe9?w=1200&h=800&fit=crop'
      },
      {
        id: 'austin',
        name: 'austin',
        displayName: 'Austin',
        fileName: 'Austin_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 30.2672, longitude: -97.7431 },
        phrase: 'Keep Austin Weird',
        backgroundImage: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1200&h=800&fit=crop'
      },
      {
        id: 'boston',
        name: 'boston',
        displayName: 'Boston',
        fileName: 'Boston_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 42.3601, longitude: -71.0589 },
        phrase: 'The Cradle of Liberty',
        backgroundImage: 'https://images.unsplash.com/photo-1554488891-8d6f2c54d29d?w=1200&h=800&fit=crop'
      },
      {
        id: 'charlotte',
        name: 'charlotte',
        displayName: 'Charlotte',
        fileName: 'Charlotte_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 35.2271, longitude: -80.8431 },
        phrase: 'The Queen City',
        backgroundImage: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1200&h=800&fit=crop'
      },
      {
        id: 'chicago',
        name: 'chicago',
        displayName: 'Chicago',
        fileName: 'Chicago_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        phrase: 'The Windy City',
        backgroundImage: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200&h=800&fit=crop'
      },
      {
        id: 'dallas',
        name: 'dallas',
        displayName: 'Dallas',
        fileName: 'Dallas_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 32.7767, longitude: -96.7970 },
        phrase: 'Big D',
        backgroundImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=800&fit=crop'
      },
      {
        id: 'denver',
        name: 'denver',
        displayName: 'Denver',
        fileName: 'Denver_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 39.7392, longitude: -104.9903 },
        phrase: 'Mile High City',
        backgroundImage: 'https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=1200&h=800&fit=crop'
      },
      {
        id: 'honolulu',
        name: 'honolulu',
        displayName: 'Honolulu',
        fileName: 'Honolulu_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 21.3099, longitude: -157.8581 },
        phrase: 'Paradise of the Pacific',
        backgroundImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=800&fit=crop'
      },
      {
        id: 'houston',
        name: 'houston',
        displayName: 'Houston',
        fileName: 'Houston_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 29.7604, longitude: -95.3698 },
        phrase: 'Space City',
        backgroundImage: 'https://images.unsplash.com/photo-1571709720844-8ad1e40aa78d?w=1200&h=800&fit=crop'
      },
      {
        id: 'las_vegas',
        name: 'las_vegas',
        displayName: 'Las Vegas',
        fileName: 'Las_Vegas_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 36.1699, longitude: -115.1398 },
        phrase: 'What Happens in Vegas...',
        backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop'
      },
      {
        id: 'los_angeles',
        name: 'los_angeles',
        displayName: 'Los Angeles',
        fileName: 'Los_Angeles_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        phrase: 'City of Angels',
        backgroundImage: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&h=800&fit=crop'
      },
      {
        id: 'miami',
        name: 'miami',
        displayName: 'Miami',
        fileName: 'Miami_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 25.7617, longitude: -80.1918 },
        phrase: 'Magic City',
        backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop'
      },
      {
        id: 'nashville',
        name: 'nashville',
        displayName: 'Nashville',
        fileName: 'Nashville_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 36.1627, longitude: -86.7816 },
        phrase: 'Music City',
        backgroundImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=800&fit=crop'
      },
      {
        id: 'new_orleans',
        name: 'new_orleans',
        displayName: 'New Orleans',
        fileName: 'New_Orleans_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 29.9511, longitude: -90.0715 },
        phrase: 'The Big Easy',
        backgroundImage: 'https://images.unsplash.com/photo-1518388684923-8ea362ba6df1?w=1200&h=800&fit=crop'
      },
      {
        id: 'new_york_city',
        name: 'new_york_city',
        displayName: 'New York City',
        fileName: 'New_York_City_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        phrase: 'The Big Apple',
        backgroundImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=800&fit=crop'
      },
      {
        id: 'orlando',
        name: 'orlando',
        displayName: 'Orlando',
        fileName: 'Orlando_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 28.5383, longitude: -81.3792 },
        phrase: 'The Theme Park Capital',
        backgroundImage: 'https://images.unsplash.com/photo-1565345290231-39ff2c6ee76c?w=1200&h=800&fit=crop'
      },
      {
        id: 'phoenix',
        name: 'phoenix',
        displayName: 'Phoenix',
        fileName: 'Phoenix_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 33.4484, longitude: -112.0740 },
        phrase: 'Valley of the Sun',
        backgroundImage: 'https://images.unsplash.com/photo-1544966503-7cc4ac882665?w=1200&h=800&fit=crop'
      },
      {
        id: 'portland',
        name: 'portland',
        displayName: 'Portland',
        fileName: 'Portland_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 45.5152, longitude: -122.6784 },
        phrase: 'Keep Portland Weird',
        backgroundImage: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=1200&h=800&fit=crop'
      },
      {
        id: 'san_antonio',
        name: 'san_antonio',
        displayName: 'San Antonio',
        fileName: 'San_Antonio_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 29.4241, longitude: -98.4936 },
        phrase: 'Remember the Alamo',
        backgroundImage: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=1200&h=800&fit=crop'
      },
      {
        id: 'san_diego',
        name: 'san_diego',
        displayName: 'San Diego',
        fileName: 'San_Diego_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 32.7157, longitude: -117.1611 },
        phrase: 'America\'s Finest City',
        backgroundImage: 'https://images.unsplash.com/photo-1567034543334-be77b0fb7516?w=1200&h=800&fit=crop'
      },
      {
        id: 'san_francisco',
        name: 'san_francisco',
        displayName: 'San Francisco',
        fileName: 'San_Francisco_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        phrase: 'Golden Gate City',
        backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop'
      },
      {
        id: 'san_jose',
        name: 'san_jose',
        displayName: 'San Jose',
        fileName: 'San_Jose_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 37.3382, longitude: -121.8863 },
        phrase: 'Heart of Silicon Valley',
        backgroundImage: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=1200&h=800&fit=crop'
      },
      {
        id: 'savannah',
        name: 'savannah',
        displayName: 'Savannah',
        fileName: 'Savannah_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 32.0835, longitude: -81.0998 },
        phrase: 'Southern Belle',
        backgroundImage: 'https://images.unsplash.com/photo-1544907547-4b9d2f8c7e4e?w=1200&h=800&fit=crop'
      },
      {
        id: 'seattle',
        name: 'seattle',
        displayName: 'Seattle',
        fileName: 'Seattle_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 47.6062, longitude: -122.3321 },
        phrase: 'Emerald City',
        backgroundImage: 'https://images.unsplash.com/photo-1541738140292-38bb7009c63a?w=1200&h=800&fit=crop'
      },
      {
        id: 'tampa',
        name: 'tampa',
        displayName: 'Tampa',
        fileName: 'Tampa_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 27.9506, longitude: -82.4572 },
        phrase: 'Gulf Coast Gem',
        backgroundImage: 'https://images.unsplash.com/photo-1580089595293-c8e19e5b1b13?w=1200&h=800&fit=crop'
      },
      {
        id: 'washington_dc',
        name: 'washington_dc',
        displayName: 'Washington D.C.',
        fileName: 'Washington_DC_consolidated_places_data.json',
        isAvailable: true,
        coordinates: { latitude: 38.9072, longitude: -77.0369 },
        phrase: 'The Nation\'s Capital',
        backgroundImage: 'https://images.unsplash.com/photo-1565345290231-39ff2c6ee76c?w=1200&h=800&fit=crop'
      }
    ];

    // TODO: When implementing server-side support, add API call here:
    // this.availableCities = await this.fetchAvailableCitiesFromServer();

    this.initialized = true;
    console.log(`🏙️ CityService initialized with ${this.availableCities.length} cities:`, 
                this.availableCities.map(c => c.displayName).join(', '));
  }

  /**
   * Get all available cities
   */
  static async getAvailableCities(): Promise<CityInfo[]> {
    await this.initializeCities();
    return this.availableCities.filter(city => city.isAvailable);
  }

  /**
   * Search cities by name (case-insensitive, partial matching)
   */
  static async searchCities(query: string): Promise<CityInfo[]> {
    await this.initializeCities();
    
    if (!query.trim()) {
      return this.getAvailableCities();
    }

    const searchTerm = query.toLowerCase().trim();
    return this.availableCities.filter(city => 
      city.isAvailable && (
        city.name.toLowerCase().includes(searchTerm) ||
        city.displayName.toLowerCase().includes(searchTerm)
      )
    );
  }

  /**
   * Get city info by ID
   */
  static async getCityById(cityId: string): Promise<CityInfo | null> {
    await this.initializeCities();
    return this.availableCities.find(city => city.id === cityId && city.isAvailable) || null;
  }

  /**
   * Get the file path for a city's data
   */
  static getCityDataPath(city: CityInfo): string {
    // For Philadelphia (legacy), use the existing path
    if (city.id === 'philadelphia') {
      return '../data/consolidated_places_data_v7.json';
    }
    
    // For other cities, use Cities_Json folder
    // Note: This will be replaced with server URLs later
    return `../Cities_Json/${city.fileName}`;
  }

  /**
   * Future server-side implementation placeholder
   */
  private static async fetchAvailableCitiesFromServer(): Promise<CityInfo[]> {
    // TODO: Implement server-side API call
    // Example:
    // const response = await fetch('/api/cities');
    // return await response.json();
    
    throw new Error('Server-side implementation not yet available');
  }

  /**
   * Reset initialization (useful for testing)
   */
  static reset(): void {
    this.initialized = false;
    this.availableCities = [];
  }
}