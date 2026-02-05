/**
 * CityImageService - Optimized with lazy loading for fast app startup
 */

// Only load default background at startup
const defaultBackground = require('../../Cities_Images/Back.png');

export class CityImageService {
  // Cache for loaded images
  private static imageCache: Record<string, any> = {};

  // Lazy loading function for city images
  private static loadCityImage(cityId: string): any {
    // Return cached image if already loaded
    if (this.imageCache[cityId]) {
      return this.imageCache[cityId];
    }

    // Load image on demand
    try {
      let image;
      switch (cityId) {
        case 'philadelphia':
          image = require('../../Cities_Images/Philadelphia.jpg');
          break;
        case 'anaheim':
          image = require('../../Cities_Images/Anaheim.jpg');
          break;
        case 'atlanta':
          image = require('../../Cities_Images/Atlanta.jpg');
          break;
        case 'austin':
          image = require('../../Cities_Images/Austin.jpg');
          break;
        case 'boston':
          image = require('../../Cities_Images/Boston.jpg');
          break;
        case 'charlotte':
          image = require('../../Cities_Images/Charlotte.jpg');
          break;
        case 'chicago':
          image = require('../../Cities_Images/Chicago.jpg');
          break;
        case 'dallas':
          image = require('../../Cities_Images/Dallas.jpg');
          break;
        case 'honolulu':
          image = require('../../Cities_Images/Honolulu.jpg');
          break;
        case 'houston':
          image = require('../../Cities_Images/Houston.jpg');
          break;
        case 'las_vegas':
          image = require('../../Cities_Images/Las_Vegas.jpg');
          break;
        case 'los_angeles':
          image = require('../../Cities_Images/Los_Angeles.jpg');
          break;
        case 'miami':
          image = require('../../Cities_Images/Miami.jpg');
          break;
        case 'nashville':
          image = require('../../Cities_Images/Nashville.jpg');
          break;
        case 'new_orleans':
          image = require('../../Cities_Images/New_Orleans.jpg');
          break;
        case 'new_york_city':
          image = require('../../Cities_Images/New_York_City.jpg');
          break;
        case 'orlando':
          image = require('../../Cities_Images/Orlando.jpg');
          break;
        case 'phoenix':
          image = require('../../Cities_Images/Phoenix.jpg');
          break;
        case 'san_antonio':
          image = require('../../Cities_Images/San_Antonio.jpg');
          break;
        case 'san_diego':
          image = require('../../Cities_Images/San_Diego.jpg');
          break;
        case 'san_francisco':
          image = require('../../Cities_Images/San_Francisco.jpg');
          break;
        case 'san_jose':
          image = require('../../Cities_Images/San_Jose.jpg');
          break;
        case 'seattle':
          image = require('../../Cities_Images/Seattle.jpg');
          break;
        case 'tampa':
          image = require('../../Cities_Images/Tampa.jpg');
          break;
        case 'washington_dc':
          image = require('../../Cities_Images/Washington,_DC.jpg');
          break;
        default:
          return defaultBackground;
      }

      // Cache the loaded image
      this.imageCache[cityId] = image;
      return image;
    } catch (error) {
      console.log(`⚠️ Failed to load image for ${cityId}, using default`);
      return defaultBackground;
    }
  }

  /**
   * Get image source for React Native Image component
   */
  static getCityImageSource(cityId: string): any {
    return this.loadCityImage(cityId);
  }

  /**
   * Get the default app background
   */
  static getDefaultBackground(): any {
    return defaultBackground;
  }

  /**
   * Clear image cache (useful for memory management)
   */
  static clearCache(): void {
    this.imageCache = {};
  }
}

export default CityImageService;