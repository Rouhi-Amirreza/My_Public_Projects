# NaviNook Travel Features Documentation

## Overview
NaviNook provides intelligent travel planning with dual transportation modes (walking and driving), ride booking capabilities, and dynamic schedule management. This document covers all travel-related features and their configurations.

## 🚗🚶 Dual Travel Mode System

### Core Functionality
The app automatically calculates both **walking** and **driving** times for all travel segments using Google Maps API, allowing users to choose their preferred mode of transportation.

### Travel Mode Display Logic

#### When Walking Option Appears
- **Threshold**: Walking time ≤ **25 minutes**
- **Driving time**: > 3 minutes (to make ride booking viable)
- **Display**: Small circle on the left side

#### Visual Indicators
```
[🚶 15m] 🚗 8m     ← Walking selected (main), driving alternative (left)
[🚗 8m] 🚶 15m     ← Driving selected (main), walking alternative (left)
```

### Coverage Areas
- ✅ **Start-to-first-place** travel segments
- ✅ **Place-to-place** travel segments  
- ✅ **Return travel** segments (last place back to start)
- ✅ **Dining stop** travel segments

### Configuration Constants

```typescript
// Travel mode thresholds
const WALKING_TIME_THRESHOLD = 25; // minutes
const MINIMUM_RIDE_BOOKING_TIME = 3; // minutes
const WALKING_SPEED = 5; // km/h (fallback calculation)
const DRIVING_SPEED = 40; // km/h (fallback calculation)
```

## 🎯 Travel Indicator Components

### TravelIndicator (Single Mode)
Standard circular indicator for single travel mode:
- **Size**: 60x60px circular button
- **Colors**: Blue theme for driving, green for walking
- **Features**: Ride booking, travel time display

### DualTravelIndicator (Dual Mode)
Enhanced indicator supporting both walking and driving:
- **Main Circle**: Currently selected mode (60x60px)
- **Alternative Circle**: Alternative mode (40x40px, left side)
- **Smart Display**: Only shows alternative when viable

#### Props Interface
```typescript
interface DualTravelIndicatorProps {
  travelOptions: TravelOptions;          // Both walking/driving data
  selectedMode: 'driving' | 'walking';   // Current selection
  onModeChange: (mode) => void;          // Mode switch handler
  onRideBookPress?: () => void;          // Ride booking (driving only)
  isRideBooked?: boolean;                // Booking status
  canBookRide?: boolean;                 // Booking availability
  scheduledTime?: string;                // Scheduled arrival time
  day?: number;                          // Day number (multi-day)
}
```

## 📊 Travel Data Structure

### TravelOptions Interface
```typescript
interface TravelOptions {
  driving: {
    duration: number;    // minutes
    distance: number;    // meters  
    icon: string;        // '🚗'
  };
  walking: {
    duration: number;    // minutes
    distance: number;    // meters
    icon: string;        // '🚶'
  };
  rideId: string;                    // Unique segment identifier
  fromLocation: string;              // Origin name
  toLocation: string;                // Destination name
  fromCoordinates: Coordinates;      // Origin coordinates
  toCoordinates: Coordinates;        // Destination coordinates
}
```

### State Management
```typescript
// Travel mode selection for each segment
const [travelModes, setTravelModes] = useState<Record<string, 'driving' | 'walking'>>({});

// Calculated travel options for each segment  
const [travelOptions, setTravelOptions] = useState<Record<string, TravelOptions>>({});
```

## ⏰ Schedule Recalculation System

### Automatic Time Updates
When users switch travel modes, the system automatically:

1. **Calculates time difference** between old and new modes
2. **Updates arrival times** for all subsequent places
3. **Updates departure times** for all subsequent places  
4. **Maintains visit durations** (only travel times change)
5. **Preserves schedule structure** (order and dining stops)

### Recalculation Logic
```typescript
const recalculateScheduleTimes = (
  changedRideId: string, 
  newMode: 'driving' | 'walking', 
  previousMode: 'driving' | 'walking'
) => {
  // Calculate time difference
  const timeDifference = options[newMode].duration - options[previousMode].duration;
  
  // Update all subsequent schedule items
  // Multi-day and single-day itinerary support
  // Preserves dining stops and visit durations
};
```

### Time Update Example
```
Original Schedule (Driving):
09:00 - 09:08  Travel to Place A (8 min drive)
09:08 - 10:08  Visit Place A (60 min)
10:08 - 10:15  Travel to Place B (7 min drive)
10:15 - 11:15  Visit Place B (60 min)

After Switch to Walking (15 min):
09:00 - 09:15  Travel to Place A (15 min walk) 
09:15 - 10:15  Visit Place A (60 min)          ← Shifted +7 min
10:15 - 10:22  Travel to Place B (7 min drive) ← Shifted +7 min  
10:22 - 11:22  Visit Place B (60 min)          ← Shifted +7 min
```

## 🎫 Ride Booking Integration

### Booking Availability
- **Available**: Only for driving mode segments > 3 minutes
- **Disabled**: For walking mode (no ride needed)
- **Services**: Uber, Uber Pool, Lyft, Lyft Shared, Taxi

### Booking State Management
```typescript
interface RideBooking {
  id: string;                    // Matches travel segment rideId
  rideType: 'uber' | 'lyft' | 'taxi' | 'uber_pool' | 'lyft_shared';
  estimatedPrice: number;        // USD
  estimatedDuration: number;     // minutes
  distance: number;              // meters
  selected: boolean;             // Booking status
}
```

### Price Calculation
```typescript
const calculatePrice = (multiplier: number) => {
  const basePrice = Math.max(8, distance * 0.002 + estimatedDuration * 0.3);
  return basePrice * multiplier;
};

// Service multipliers
const RIDE_MULTIPLIERS = {
  uber: 1.0,
  uber_pool: 0.75,      // 25% discount for shared
  lyft: 0.95,           // 5% discount vs Uber
  lyft_shared: 0.7,     // 30% discount for shared
  taxi: 1.2             // 20% premium
};
```

## 🗺️ Google Maps API Integration

### Travel Time Calculation
The system uses multiple Google APIs for accurate travel times:

1. **Routes API v2** (Primary) - Most accurate with traffic
2. **Directions API** (Fallback) - Reliable routing
3. **Distance Matrix API** (Batch) - Multiple destinations

### API Call Optimization
```typescript
// Smart caching system
const travelTimeCache = new Map<string, TravelTimeResult>();

// Batch calculations when possible
const calculateMultipleTravelOptions = async (segments: TravelSegment[]) => {
  // Batch API calls for efficiency
  // Cache results by coordinate pairs
  // Handle API failures gracefully
};
```

### Fallback Calculations
```typescript
// When API fails, use coordinate-based estimation
const fallbackTravelTime = (distance: number, mode: 'driving' | 'walking') => {
  const speed = mode === 'walking' ? 5 : 40; // km/h
  return Math.round((distance / 1000 / speed) * 60); // minutes
};
```

## 🏗️ File Structure

### Core Components
```
src/components/
├── TravelIndicator.tsx          # Single mode travel indicator
├── DualTravelIndicator.tsx      # Dual mode travel indicator  
├── RideSelectionModal.tsx       # Ride booking modal
├── RideBookingCard.tsx          # Ride booking card component
└── TicketBookingCard.tsx        # Ticket booking component
```

### Services
```
src/services/
├── GoogleMapsService.ts         # Google Maps API integration
├── DistanceMatrixService.ts     # Travel time calculations  
├── UnifiedTravelTimeService.ts  # Unified travel API
└── ScheduleRecalculator.ts      # Schedule update logic
```

### Type Definitions
```
src/types/
└── index.ts                     # TravelOptions, RideBooking interfaces
```

## ⚙️ Configuration Options

### Environment Variables
```bash
# Required
GOOGLE_API_KEY=your_google_maps_api_key

# Optional thresholds (defaults shown)
WALKING_TIME_THRESHOLD=25        # minutes
MIN_RIDE_BOOKING_TIME=3          # minutes  
TRAVEL_CACHE_DURATION=900        # seconds (15 min)
```

### Customizable Thresholds
```typescript
// In DualTravelIndicator.tsx and ItineraryResultsPage.tsx
const WALKING_TIME_THRESHOLD = 25;      // Show walking option if ≤ 25 min
const MIN_RIDE_BOOKING_TIME = 3;        // Allow ride booking if > 3 min
const MAX_REASONABLE_TRAVEL = 240;      // Flag suspicious times > 4 hours
```

### UI Customization
```typescript
// Travel indicator sizes
const MAIN_INDICATOR_SIZE = 60;         // Main circle diameter
const ALTERNATIVE_INDICATOR_SIZE = 40;  // Alternative circle diameter

// Color themes
const WALKING_THEME = '#4caf50';        // Green
const DRIVING_THEME = '#00D9FF';        // Blue  
const BOOKING_THEME = '#27ae60';        // Green (booked state)
```

## 🧪 Testing & Debugging

### Debug Logging
Enable detailed logging for travel time calculations:
```typescript
console.log('🔄 Mode change:', { 
  from: previousMode, 
  to: newMode, 
  timeDifference,
  affectedPlaces: subsequentPlaces.length 
});
```

### Common Issues & Solutions

#### Issue: Travel times not calculating
```typescript
// Check API key validity
const isValidApiKey = await GoogleMapsService.validateApiKey();

// Verify coordinate format
const coordinates = `${lat},${lng}`; // Must be string format
```

#### Issue: Schedule times not updating
```typescript
// Ensure travel mode change triggers recalculation
const handleModeChange = (rideId, newMode) => {
  const currentMode = travelModes[rideId] || 'driving';
  if (currentMode !== newMode) {           // Only update if actually changing
    recalculateScheduleTimes(rideId, newMode, currentMode);
  }
};
```

#### Issue: Walking option not appearing
```typescript
// Check thresholds
const shouldShowWalking = walkingTime <= 25 && drivingTime > 3;

// Verify travel options are calculated
console.log('Travel options:', travelOptions[rideId]);
```

## 📱 User Experience Flow

### Typical User Journey
1. **Load Itinerary** → Auto-calculates driving times
2. **See Walking Option** → Small circle appears for ≤25 min walks  
3. **Switch to Walking** → Tap small circle, times update automatically
4. **Book Rides** → Available only for driving segments
5. **View Schedule** → All times reflect current travel mode choices

### Accessibility Features
- **High contrast** indicators for visibility
- **Clear icons** (🚗 🚶) for mode identification  
- **Time displays** always visible
- **Touch targets** meet minimum size requirements (44px)

### Performance Optimizations
- **Lazy calculation** of travel options (only when needed)
- **Caching** of API results to reduce requests
- **Batch updates** for schedule recalculation
- **Memoization** of expensive calculations

## 🔮 Future Enhancements

### Planned Features
- **Transit integration** (bus, train, subway options)
- **Bike routing** for cycling travel mode
- **Weather-aware** walking recommendations  
- **Accessibility routing** for wheelchair accessibility
- **Real-time traffic** updates for driving times
- **Carbon footprint** tracking for travel choices

### API Roadmap
- **GraphQL integration** for efficient data fetching
- **WebSocket updates** for real-time schedule changes
- **Offline caching** for calculated routes
- **Machine learning** for personalized travel preferences

---

## 📞 Support

For technical support or feature requests:
- **Documentation**: See inline code comments
- **API Issues**: Check Google Maps API quotas and billing
- **UI/UX**: Reference Material Design guidelines
- **Performance**: Use React DevTools Profiler

---

*Last updated: January 2025*
*Version: 1.0.0*