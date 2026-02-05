import CityImageService from './CityImageService';

export interface CityTheme {
  id: string;
  name: string;
  displayName: string;
  
  // Visual Theme
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    overlay: string; // Can be gradient or solid color
    overlayFallback: string; // Solid color fallback for older devices
    text: string;
    textSecondary: string;
    buttonPrimary: string;
    buttonText: string;
    cardBackground: string;
    inputBackground: string;
    borderColor: string;
  };
  
  // Typography
  fonts: {
    headerWeight: '300' | '400' | '500' | '600' | '700' | '800' | '900';
    bodyWeight: '300' | '400' | '500' | '600' | '700';
  };
  
  // Background & Imagery
  background: {
    uri?: string; // Remote image URL
    source?: any; // Local require() import
    position: 'center' | 'top' | 'bottom';
    overlay: number; // 0-1 opacity
  };
  
  // UI Elements
  ui: {
    borderRadius: number;
    shadowIntensity: number;
    buttonStyle: 'rounded' | 'sharp' | 'pill';
  };
  
  // City-specific elements
  signature: {
    icon: string; // Emoji or symbol
    tagline: string;
    atmosphere: 'vibrant' | 'elegant' | 'modern' | 'classic' | 'tropical' | 'urban';
  };
}

export class CityThemeService {
  private static themes: Record<string, CityTheme> = {
    philadelphia: {
      id: 'philadelphia',
      name: 'philadelphia',
      displayName: 'Philadelphia',
      
      colors: {
        primary: '#1B365D', // Liberty Bell blue
        secondary: '#C41E3A', // Revolutionary red
        accent: '#DAA520', // Independence gold
        background: '#1a1a1a', // Dark background
        overlay: 'linear-gradient(135deg, rgba(27, 54, 93, 0.8), rgba(196, 30, 58, 0.6))', // Patriotic gradient
        overlayFallback: 'rgba(0, 0, 0, 0.6)', // Universal dark overlay for good contrast
        text: '#FFFFFF',
        textSecondary: '#E8E8E8',
        buttonPrimary: '#C41E3A',
        buttonText: '#FFFFFF',
        cardBackground: '#2a2a2a', // Dark cards
        inputBackground: '#333333', // Dark inputs
        borderColor: '#555555', // Dark borders
      },
      
      fonts: {
        headerWeight: '700',
        bodyWeight: '500',
      },
      
      background: {
        ...CityImageService.getCityImageSource('philadelphia', 'Philadelphia'),
        position: 'center',
        overlay: 0.6,
      },
      
      ui: {
        borderRadius: 8,
        shadowIntensity: 0.2,
        buttonStyle: 'rounded',
      },
      
      signature: {
        icon: '🔔',
        tagline: 'Where America Began',
        atmosphere: 'classic',
      },
    },
    
    miami: {
      id: 'miami',
      name: 'miami',
      displayName: 'Miami',
      
      colors: {
        primary: '#FF6B6B', // Miami coral
        secondary: '#4ECDC4', // Ocean turquoise
        accent: '#FFE66D', // Sunset yellow
        background: '#1a1a1a', // Dark background
        overlay: 'linear-gradient(45deg, rgba(255, 107, 107, 0.7), rgba(78, 205, 196, 0.5))', // Ocean sunset gradient
        overlayFallback: 'rgba(0, 0, 0, 0.6)', // Universal dark overlay for good contrast
        text: '#FFFFFF',
        textSecondary: '#F0F0F0',
        buttonPrimary: '#4ECDC4',
        buttonText: '#FFFFFF',
        cardBackground: '#2a2a2a', // Dark cards
        inputBackground: '#333333', // Dark inputs
        borderColor: '#555555', // Dark borders
      },
      
      fonts: {
        headerWeight: '300',
        bodyWeight: '400',
      },
      
      background: {
        ...CityImageService.getCityImageSource('miami', 'Miami'),
        position: 'center',
        overlay: 0.5,
      },
      
      ui: {
        borderRadius: 16,
        shadowIntensity: 0.3,
        buttonStyle: 'pill',
      },
      
      signature: {
        icon: '🌴',
        tagline: 'Magic City Vibes',
        atmosphere: 'tropical',
      },
    },
    
    newyork: {
      id: 'newyork',
      name: 'newyork',
      displayName: 'New York',
      
      colors: {
        primary: '#212529', // NYC black
        secondary: '#FFD700', // Taxi yellow
        accent: '#C0C0C0', // Urban silver
        background: '#1a1a1a', // Dark background
        overlay: 'linear-gradient(180deg, rgba(33, 37, 41, 0.9), rgba(255, 215, 0, 0.3))', // Urban sophistication
        overlayFallback: 'rgba(0, 0, 0, 0.6)', // Universal dark overlay for good contrast
        text: '#FFFFFF',
        textSecondary: '#E0E0E0',
        buttonPrimary: '#FFD700',
        buttonText: '#212529',
        cardBackground: '#2a2a2a', // Dark cards
        inputBackground: '#333333', // Dark inputs
        borderColor: '#555555', // Dark borders
      },
      
      fonts: {
        headerWeight: '800',
        bodyWeight: '600',
      },
      
      background: {
        ...CityImageService.getCityImageSource('newyork', 'New York'),
        position: 'center',
        overlay: 0.7,
      },
      
      ui: {
        borderRadius: 4,
        shadowIntensity: 0.4,
        buttonStyle: 'sharp',
      },
      
      signature: {
        icon: '🗽',
        tagline: 'The City That Never Sleeps',
        atmosphere: 'urban',
      },
    },
  };

  /**
   * Get theme for a specific city
   */
  static getTheme(cityId: string): CityTheme {
    return this.themes[cityId] || this.themes.philadelphia; // Fallback to Philadelphia
  }

  /**
   * Get all available themes
   */
  static getAllThemes(): CityTheme[] {
    return Object.values(this.themes);
  }

  /**
   * Check if a city has a custom theme
   */
  static hasTheme(cityId: string): boolean {
    return this.themes.hasOwnProperty(cityId);
  }

  /**
   * Parse gradient overlay string to extract colors and direction
   */
  static parseGradientOverlay(overlayString: string) {
    if (!overlayString.includes('linear-gradient')) {
      // Not a gradient, return solid color config
      return {
        isGradient: false,
        colors: [overlayString],
        locations: [0],
        angle: 0,
      };
    }

    // Extract gradient information
    const angleMatch = overlayString.match(/(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1]) : 0;
    
    // Extract colors (simplified parsing)
    const colorMatches = overlayString.match(/rgba?\([^)]+\)/g) || [];
    
    return {
      isGradient: true,
      colors: colorMatches,
      locations: colorMatches.map((_, index) => index / (colorMatches.length - 1)),
      angle: angle,
      // Convert angle to start/end points for LinearGradient
      start: this.angleToGradientPoints(angle).start,
      end: this.angleToGradientPoints(angle).end,
    };
  }

  /**
   * Convert CSS gradient angle to React Native LinearGradient start/end points
   */
  static angleToGradientPoints(angle: number) {
    const radians = (angle * Math.PI) / 180;
    return {
      start: { x: 0.5 - 0.5 * Math.cos(radians), y: 0.5 - 0.5 * Math.sin(radians) },
      end: { x: 0.5 + 0.5 * Math.cos(radians), y: 0.5 + 0.5 * Math.sin(radians) },
    };
  }

  /**
   * Generate dynamic styles based on theme
   */
  static generateDynamicStyles(theme: CityTheme) {
    return {
      container: {
        backgroundColor: theme.colors.background,
      },
      
      header: {
        backgroundColor: theme.colors.primary,
      },
      
      headerOverlay: {
        backgroundColor: theme.colors.overlayFallback, // Fallback solid color
        borderRadius: theme.ui.borderRadius,
        // For gradients, we'll handle this in the component directly
      },
      
      // Gradient overlay configuration for LinearGradient component
      gradientOverlay: this.parseGradientOverlay(theme.colors.overlay),
      
      headerTitle: {
        fontWeight: theme.fonts.headerWeight,
        color: theme.colors.text,
      },
      
      headerSubtitle: {
        color: theme.colors.textSecondary,
        fontWeight: theme.fonts.bodyWeight,
      },
      
      formContainer: {
        backgroundColor: theme.colors.cardBackground,
        borderTopLeftRadius: theme.ui.borderRadius * 2.5,
        borderTopRightRadius: theme.ui.borderRadius * 2.5,
        shadowColor: theme.colors.primary,
        shadowOpacity: theme.ui.shadowIntensity,
        shadowRadius: 12,
        elevation: 8,
      },
      
      inputGroup: {
        borderColor: theme.colors.borderColor,
        backgroundColor: theme.colors.inputBackground,
        borderRadius: theme.ui.borderRadius,
      },
      
      generateButton: {
        backgroundColor: theme.colors.buttonPrimary,
        borderRadius: theme.ui.buttonStyle === 'pill' ? 25 : 
                     theme.ui.buttonStyle === 'sharp' ? 4 : theme.ui.borderRadius,
        shadowColor: theme.colors.buttonPrimary,
        shadowOpacity: theme.ui.shadowIntensity + 0.1,
      },
      
      generateButtonText: {
        color: theme.colors.buttonText,
        fontWeight: theme.fonts.headerWeight,
      },
      
      citySignature: {
        color: theme.colors.accent,
      },
      
      cityBadge: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.ui.borderRadius,
        marginTop: 8,
        alignSelf: 'center',
      },
      
      cityBadgeText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: theme.fonts.bodyWeight,
        textAlign: 'center',
      },
    };
  }
}

export default CityThemeService;