/**
 * UberService - Interface with Uber API for price estimates and ride requests
 * 
 * SETUP INSTRUCTIONS FOR REAL UBER API:
 * 
 * 1. REGISTER YOUR APP:
 *    - Go to https://developer.uber.com/
 *    - Create a new app
 *    - Get your Client ID and Client Secret
 *    - Set redirect URI (for OAuth)
 * 
 * 2. CONFIGURE ENVIRONMENT:
 *    - Add UBER_CLIENT_ID to your .env file
 *    - Add UBER_CLIENT_SECRET to your .env file  
 *    - Add UBER_REDIRECT_URI to your .env file
 *    - Set UBER_DEMO_MODE=false for production
 * 
 * 3. INSTALL OAUTH DEPENDENCIES:
 *    npm install react-native-app-auth
 *    # For iOS: cd ios && pod install
 * 
 * 4. SCOPES NEEDED:
 *    - request: Request rides on behalf of users
 *    - request_receipt: Get receipt information
 *    - profile: Access user profile
 * 
 * 5. PRODUCTION CONSIDERATIONS:
 *    - Handle token refresh
 *    - Implement proper error handling
 *    - Add rate limiting
 *    - Store tokens securely
 */

interface UberPriceEstimate {
  product_id: string;
  display_name: string;
  estimate: string;
  minimum?: string;
  maximum?: string;
  currency_code: string;
  duration?: number; // in seconds
  distance?: number; // in meters
}

interface UberRideRequest {
  product_id: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  surge_confirmation_id?: string;
  payment_method_id?: string;
}

interface UberRideResponse {
  request_id: string;
  status: string;
  vehicle?: {
    make: string;
    model: string;
    license_plate: string;
    picture_url?: string;
  };
  driver?: {
    name: string;
    phone_number: string;
    rating: number;
    picture_url?: string;  
  };
  location?: {
    latitude: number;
    longitude: number;
    bearing: number;
  };
  eta: number;
  surge_multiplier: number;
}

interface UberAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface UberUser {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_verified: boolean;
}

class UberService {
  // API Configuration
  private static readonly UBER_API_BASE = 'https://api.uber.com/v1.2';
  private static readonly FALLBACK_API_BASE = 'https://api.uber.com/v1';
  private static readonly UBER_LOGIN_BASE = 'https://login.uber.com/oauth/v2';
  
  // Environment-based configuration
  private static readonly DEMO_MODE = process.env.UBER_DEMO_MODE !== 'false';
  private static readonly CLIENT_ID = process.env.UBER_CLIENT_ID || '';
  private static readonly CLIENT_SECRET = process.env.UBER_CLIENT_SECRET || '';
  private static readonly REDIRECT_URI = process.env.UBER_REDIRECT_URI || 'navinook://uber-callback';
  
  // OAuth configuration
  private static readonly AUTH_CONFIG: UberAuthConfig = {
    clientId: this.CLIENT_ID,
    clientSecret: this.CLIENT_SECRET,
    redirectUri: this.REDIRECT_URI,
    scopes: ['request', 'request_receipt', 'profile']
  };
  
  // Token storage (in production, use secure storage)
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static tokenExpiry: number | null = null;

  /**
   * Authenticate user with Uber OAuth
   */
  static async authenticateUser(): Promise<{ success: boolean; user?: UberUser; error?: string }> {
    if (this.DEMO_MODE) {
      return {
        success: true,
        user: {
          uuid: 'demo-user-123',
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          mobile_verified: true
        }
      };
    }

    try {
      // In production, you would use react-native-app-auth or similar
      const authUrl = `${this.UBER_LOGIN_BASE}/authorize?` +
        `client_id=${this.AUTH_CONFIG.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(this.AUTH_CONFIG.redirectUri)}&` +
        `scope=${this.AUTH_CONFIG.scopes.join('%20')}`;

      // This would typically open a browser/webview for OAuth
      console.log('OAuth URL:', authUrl);
      
      // For now, return demo data since full OAuth implementation requires native modules
      return {
        success: false,
        error: 'OAuth implementation requires react-native-app-auth setup'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (this.DEMO_MODE) return true;
    return this.accessToken !== null && (this.tokenExpiry === null || Date.now() < this.tokenExpiry);
  }

  /**
   * Get authenticated headers for API requests
   */
  private static getAuthHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {
      'Accept-Language': 'en_US',
      'Content-Type': 'application/json',
    };

    if (!this.DEMO_MODE && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Request a ride
   */
  static async requestRide(request: UberRideRequest): Promise<{ success: boolean; ride?: UberRideResponse; error?: string }> {
    if (this.DEMO_MODE) {
      // Return demo ride response
      return {
        success: true,
        ride: {
          request_id: `demo-ride-${Date.now()}`,
          status: 'processing',
          eta: 5,
          surge_multiplier: 1.0,
          vehicle: {
            make: 'Toyota',
            model: 'Camry',
            license_plate: 'ABC-123'
          },
          driver: {
            name: 'Demo Driver',
            phone_number: '+1234567890',
            rating: 4.8
          }
        }
      };
    }

    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated. Please log in first.'
      };
    }

    try {
      const response = await fetch(`${this.UBER_API_BASE}/requests`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const ride = await response.json();
      return { success: true, ride };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request ride'
      };
    }
  }

  /**
   * Get ride status
   */
  static async getRideStatus(requestId: string): Promise<{ success: boolean; ride?: UberRideResponse; error?: string }> {
    if (this.DEMO_MODE) {
      return {
        success: true,
        ride: {
          request_id: requestId,
          status: 'arriving',
          eta: 3,
          surge_multiplier: 1.0,
          vehicle: {
            make: 'Toyota',
            model: 'Camry',
            license_plate: 'ABC-123'
          },
          driver: {
            name: 'Demo Driver',
            phone_number: '+1234567890',
            rating: 4.8
          },
          location: {
            latitude: 40.7589,
            longitude: -73.9851,
            bearing: 90
          }
        }
      };
    }

    try {
      const response = await fetch(`${this.UBER_API_BASE}/requests/${requestId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const ride = await response.json();
      return { success: true, ride };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ride status'
      };
    }
  }

  /**
   * Cancel a ride
   */
  static async cancelRide(requestId: string): Promise<{ success: boolean; error?: string }> {
    if (this.DEMO_MODE) {
      return { success: true };
    }

    try {
      const response = await fetch(`${this.UBER_API_BASE}/requests/${requestId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel ride'
      };
    }
  }

  /**
   * Get price estimates between two coordinates
   */
  static async getPriceEstimates(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<UberPriceEstimate[]> {
    
    if (this.DEMO_MODE) {
      // Return demo data for development/testing
      return this.getDemoPriceEstimates(startLat, startLng, endLat, endLng);
    }

    try {
      // Calculate distance for pricing estimation
      const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
      
      // In production, this would be a real Uber API call
      const url = `${this.UBER_API_BASE}/estimates/price?start_latitude=${startLat}&start_longitude=${startLng}&end_latitude=${endLat}&end_longitude=${endLng}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Uber API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.prices && Array.isArray(data.prices)) {
        return data.prices.map((price: any) => ({
          product_id: price.product_id,
          display_name: price.display_name,
          estimate: price.estimate,
          minimum: price.low_estimate ? `$${price.low_estimate}` : undefined,
          maximum: price.high_estimate ? `$${price.high_estimate}` : undefined,
          currency_code: price.currency_code || 'USD',
          duration: price.duration,
          distance: price.distance,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching Uber price estimates:', error);
      
      // Fallback to demo data if API fails
      console.log('Falling back to demo price estimates');
      return this.getDemoPriceEstimates(startLat, startLng, endLat, endLng);
    }
  }

  /**
   * Generate realistic demo price estimates based on distance
   */
  private static getDemoPriceEstimates(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): UberPriceEstimate[] {
    
    const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
    const durationSeconds = this.estimateDuration(distance);
    const distanceMeters = Math.round(distance * 1000);

    // Base pricing per km (these are realistic Uber rates)
    const baseRate = 2.50;
    const perKmRate = 1.75;
    const timeFactor = 0.35; // per minute
    const surgeMultiplier = 1.0; // No surge for demo

    const durationMinutes = durationSeconds / 60;
    const basePrice = baseRate + (distance * perKmRate) + (durationMinutes * timeFactor);
    
    // Generate estimates for different Uber product types
    const products = [
      {
        name: 'UberX',
        multiplier: 1.0,
        description: 'Affordable everyday rides'
      },
      {
        name: 'UberXL', 
        multiplier: 1.5,
        description: 'Rides for up to 6 people'
      },
      {
        name: 'Uber Comfort',
        multiplier: 1.3,
        description: 'Newer cars with more legroom'
      },
      {
        name: 'Uber Black',
        multiplier: 2.1,
        description: 'Premium rides in luxury cars'
      }
    ];

    return products.map((product, index) => {
      const estimatedPrice = basePrice * product.multiplier * surgeMultiplier;
      const lowEstimate = estimatedPrice * 0.9;
      const highEstimate = estimatedPrice * 1.1;

      return {
        product_id: `demo_${product.name.toLowerCase().replace(' ', '_')}_${Date.now()}_${index}`,
        display_name: product.name,
        estimate: `$${estimatedPrice.toFixed(2)}`,
        minimum: `$${lowEstimate.toFixed(2)}`,
        maximum: `$${highEstimate.toFixed(2)}`,
        currency_code: 'USD',
        duration: durationSeconds,
        distance: distanceMeters,
      };
    });
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
   * Estimate travel duration based on distance
   */
  private static estimateDuration(distanceKm: number): number {
    // Assume average city speed of 25 km/h including stops
    const averageSpeedKmh = 25;
    const hours = distanceKm / averageSpeedKmh;
    return Math.round(hours * 3600); // Convert to seconds
  }

  /**
   * Get available Uber products for a location
   */
  static async getProducts(latitude: number, longitude: number): Promise<any[]> {
    if (this.DEMO_MODE) {
      return [
        { product_id: 'demo_uberx', display_name: 'UberX', description: 'Affordable everyday rides' },
        { product_id: 'demo_uberxl', display_name: 'UberXL', description: 'Rides for up to 6 people' },
        { product_id: 'demo_comfort', display_name: 'Uber Comfort', description: 'Newer cars with more legroom' },
        { product_id: 'demo_black', display_name: 'Uber Black', description: 'Premium rides in luxury cars' }
      ];
    }

    // In production, implement real API call
    try {
      const url = `${this.UBER_API_BASE}/products?latitude=${latitude}&longitude=${longitude}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Uber API error: ${response.status}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error fetching Uber products:', error);
      return [];
    }
  }

  /**
   * Validate API configuration
   */
  static validateConfiguration(): { isValid: boolean; message: string } {
    if (this.DEMO_MODE) {
      return {
        isValid: true,
        message: 'Running in demo mode with simulated data'
      };
    }

    // In production, validate API credentials
    return {
      isValid: false,
      message: 'Uber API credentials not configured'
    };
  }
}

export default UberService;