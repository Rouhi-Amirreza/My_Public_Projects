export interface PlaceData {
  name: string;
  place_id: string;
  types: string[];
  business_status: string;
  description: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number | string;
  user_ratings_total: number;
  user_reviews?: Array<{
    snippet: string;
    rating: number;
  }>;
  opening_hours?: {
    [key: string]: {
      opens: string;
      closes: string;
    };
  };
  price_level?: number;
  ticket_info?: Array<{
    price: string;
    link: string;
    is_official: boolean;
  }>;
  phone?: string;
  website?: string;
  popular_times?: {
    typical_time_spent?: string;
    current_busyness?: number;
    hourly_data?: {
      [key: string]: number[];
    };
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

export interface DiningStop {
  place_id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  user_ratings_total: number;
  price_level?: number;
  meal_type: string;
  detour_distance: number; // meters
  detour_time: number; // minutes for travel detour (legacy - total extra travel)
  dining_duration: number; // minutes spent at the restaurant
  typical_time_spent?: string; // from Google Places API
  arrival_time?: string; // scheduled arrival time at restaurant (HH:MM format)
  departure_time?: string; // scheduled departure time from restaurant (HH:MM format)
  travel_breakdown: {
    travel_to_restaurant: number; // minutes to travel from previous location to restaurant
    travel_from_restaurant: number; // minutes to travel from restaurant to next location
    total_extra_travel: number; // additional travel time compared to direct route
    direct_route_time: number; // time for direct route (for comparison)
    travel_to_mode: 'walking' | 'driving'; // travel mode to restaurant
    travel_from_mode: 'walking' | 'driving'; // travel mode from restaurant
    travel_to_icon: string; // icon for travel to restaurant
    travel_from_icon: string; // icon for travel from restaurant
  };
  total_stop_impact: number; // total time impact: travel_to + dining_duration + travel_from
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

export interface ConsolidatedPlacesData {
  places: {
    [key: string]: PlaceData;
  };
  summary: {
    total_places: number;
    places_by_type: {
      [key: string]: number;
    };
    average_ratings: {
      [key: string]: number;
    };
    business_status_analysis: {
      [key: string]: number;
    };
    locations: {
      [key: string]: string;
    };
  };
  metadata: {
    consolidation_timestamp: string;
    total_places_processed: number;
    coordinates_coverage_percentage: number;
  };
}

export interface DailySchedule {
  day: number;
  date: string;
  startTime: string;
  availableHours: number;
}

export interface ItineraryFormData {
  startingAddress: string;
  returnAddress?: string;
  differentReturnLocation: boolean;
  numberOfDays: number;
  useUniformSchedule: boolean;
  // For uniform schedule (when useUniformSchedule = true)
  startTime: string;
  date: string;
  availableHours: number;
  // For custom daily schedules (when useUniformSchedule = false)
  dailySchedules: DailySchedule[];
  selectedInterests: string[];
  optimizationLevel: 'fast' | 'balanced' | 'thorough';
  // Selected city information for persistence
  selectedCityId?: string;
}

export interface PlaceRecommendation extends PlaceData {
  matchScore: number;
  estimatedVisitDuration: number;
  busynessLevel?: number;
  distanceFromPrevious?: number;
  distanceFromStart?: number;
  travelTimeFromPrevious?: number | null;    // null when calculation fails
  travelMode?: 'walking' | 'driving';        // Travel mode to this place
  travelIcon?: string;                       // Icon for travel mode (🚶 or 🚗)
  travelCalculationFailed?: boolean;         // NEW: True if travel time calculation failed
  travelError?: string;                      // NEW: Error message when calculation fails
  returnTravelTime?: number | null;          // null when calculation fails
  returnTravelMode?: 'walking' | 'driving';  // Travel mode for return journey
  returnTravelIcon?: string;                 // Icon for return journey
  returnTravelCalculationFailed?: boolean;   // NEW: True if return travel calculation failed
  returnTravelError?: string;                // NEW: Error message for return travel
  returnDiningStop?: DiningStop;             // NEW: Optional dining stop before return journey
}

export interface DailyItinerary {
  day: number;
  date: string;
  startTime: string;
  availableHours: number;
  places: PlaceRecommendation[];
  visitingTime: number;
  travelTime: number;
  totalDuration: number;
  travelBreakdown?: {
    startToFirst: number;
    placesToPlaces: number;
    lastToReturn: number;
  };
  route: {
    waypoints: Array<{
      latitude: number;
      longitude: number;
      name: string;
    }>;
    optimizedOrder: number[];
  };
  schedule: Array<{
    place: PlaceRecommendation;
    arrivalTime: string;
    departureTime: string;
    visitDuration: number;
    travelTimeFromPrevious?: number; // Travel time to reach this place from previous location
    travelMode?: string; // Travel mode (walking, driving, etc.)
    travelIcon?: string; // Travel icon (🚶‍♂️, 🚗, etc.)
    warning?: string; // Warning message when visit time was reduced due to time constraints
    diningStops?: DiningStop[]; // Optional dining stops before this location
  }>;
  uncoveredInterests: string[];
  optimizationNotes: string[];
  missedPopularPlaces?: Array<{
    place: PlaceRecommendation;
    reason: string;
  }>;
}

export interface GeneratedItinerary {
  places: PlaceRecommendation[];
  visitingTime: number;                    // NEW: Pure visiting time (sum of all place visit durations)
  travelTime: number;                      // NEW: Pure travel time (start→first + place-to-place + last→return)
  totalDuration: number;                   // NEW: Total time (visitingTime + travelTime)
  travelBreakdown?: {                      // NEW: Detailed travel time breakdown
    startToFirst: number;
    placesToPlaces: number;
    lastToReturn: number;
  };
  route: {
    waypoints: Array<{
      latitude: number;
      longitude: number;
      name: string;
    }>;
    optimizedOrder: number[];
  };
  schedule: Array<{
    place: PlaceRecommendation;
    arrivalTime: string;
    departureTime: string;
    visitDuration: number;
    travelTimeFromPrevious?: number; // Travel time to reach this place from previous location
    travelMode?: string; // Travel mode (walking, driving, etc.)
    travelIcon?: string; // Travel icon (🚶‍♂️, 🚗, etc.)
    warning?: string; // Warning message when visit time was reduced due to time constraints
    diningStops?: DiningStop[]; // Optional dining stops before this location
  }>;
  uncoveredInterests: string[];
  optimizationNotes: string[];
  missedPopularPlaces?: Array<{
    place: PlaceRecommendation;
    reason: string;
  }>;
  // Error tracking
  calculationFailed?: boolean;      // NEW: True if any calculation failed
  calculationError?: string;        // NEW: Error message when calculations fail
}

export interface MultiDayItinerary {
  dailyItineraries: DailyItinerary[];
  totalDays: number;
  totalPlaces: number;
  totalVisitingTime: number;
  totalTravelTime: number;
  totalDuration: number;
  overallUncoveredInterests: string[];
  summary: {
    placesPerDay: number[];
    timeUtilization: number[];
    highlights: string[];
  };
}

export interface InterestCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  placeTypes: string[];
}

export interface BookingInfo {
  ticketBookings: TicketBooking[];
  rideBookings: RideBooking[];
  totalTicketCost: number;
  totalRideCost: number;
  totalCost: number;
}

export interface TicketBooking {
  placeId: string;
  placeName: string;
  ticketType: string;
  price: number;
  quantity: number;
  totalPrice: number;
  isOfficial: boolean;
  bookingLink: string;
  day?: number;
  arrivalTime?: string;
}

export interface RideBooking {
  id: string;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  rideType: 'uber' | 'uber_pool' | 'lyft' | 'lyft_shared' | 'taxi';
  estimatedPrice: number;
  estimatedDuration: number;
  distance: number;
  day?: number;
  scheduledTime?: string;
  selected: boolean;
}

export interface TravelOptions {
  driving: {
    duration: number; // minutes
    distance: number; // meters
    icon: string;
  };
  walking: {
    duration: number; // minutes
    distance: number; // meters
    icon: string;
  };
  rideId: string;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
}

