import { InterestCategory } from '../types';

export const Colors = {
  primary: '#00D9FF', // Cyan blue - main app color
  primaryDark: '#00B8CC', // Darker cyan for pressed states
  secondary: '#4ECDC4', // Teal
  background: {
    primary: '#0A0A0B', // Deep black background
    secondary: '#1C1C1E', // Card backgrounds
    tertiary: '#2C2C2E', // Elevated elements
    quaternary: '#3A3A3C', // Borders and dividers
  },
  text: {
    primary: '#FFFFFF', // Main text
    secondary: '#E5E5E7', // Secondary text
    tertiary: '#98989A', // Disabled/placeholder text
    accent: '#00D9FF', // Accent text
  },
  glass: 'rgba(28, 28, 30, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  surface: '#2d2d2d', // Dark surface
  textSecondary: '#cccccc', // Light gray text
  accent: '#FF6B6B', // Red accent
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
};

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'history',
    name: 'History & Historical Sites',
    icon: '🏛️',
    color: '#8B4513',
    placeTypes: [
      'historical_site',
      'landmark',
      'museum',
      'point_of_interest',
      'tourist_attraction',
      'historical landmark in philadelphia, pennsylvania',
      'tourist attraction in philadelphia, pennsylvania',
      'establishment'
    ]
  },
  {
    id: 'museums',
    name: 'Museums & Culture',
    icon: '🏛️',
    color: '#4A90E2',
    placeTypes: [
      'museum',
      'art_gallery',
      'museum in philadelphia, pennsylvania'
    ]
  },
  {
    id: 'parks',
    name: 'Parks & Gardens',
    icon: '🌳',
    color: '#228B22',
    placeTypes: [
      'park',
      'zoo',
      'garden',
      'park in philadelphia, pennsylvania',
      'zoo in philadelphia, pennsylvania'
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Tours',
    icon: '🎭',
    color: '#FF6B6B',
    placeTypes: [
      'tourist_attraction',
      'sightseeing_tour_agency',
      'tourist attraction in philadelphia, pennsylvania',
      'sightseeing tour agency in philadelphia, pennsylvania'
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping & Markets',
    icon: '🛍️',
    color: '#FF8C00',
    placeTypes: [
      'market',
      'shopping_mall',
      'shopping mall in philadelphia, pennsylvania'
    ]
  },
  {
    id: 'education',
    name: 'Education & Visitor Centers',
    icon: '🎓',
    color: '#9370DB',
    placeTypes: [
      'university',
      'visitor_center',
      'philadelphia, pa ‧ private, non-profit ‧ 4-year',
      'visitor center in philadelphia, pennsylvania'
    ]
  }
];

export const DEFAULT_VISIT_DURATIONS = {
  'museum': 120, // 2 hours
  'park': 90,    // 1.5 hours
  'historical': 60, // 1 hour
  'restaurant': 90, // 1.5 hours
  'store': 45,   // 45 minutes
  'tourist_attraction': 75, // 1.25 hours
  'default': 60  // 1 hour
};

export const GOOGLE_API_KEY = 'AIzaSyDqv-fC0xGpjNV1xNMuHVCUG3I7W6Rcb3A';

export const PHILADELPHIA_CENTER = {
  latitude: 39.9526,
  longitude: -75.1652
};

export const MAP_STYLE = [
  {
    "featureType": "poi",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  }
];


