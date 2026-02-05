import { GeneratedItinerary, TravelOptions } from '../../types';
import { generateRideId, formatSafeDuration } from './itineraryUtils';

// Calculate actual travel time from current schedule (includes place replacements)
export const calculateActualTravelTime = (
  currentItinerary: GeneratedItinerary, 
  travelModes: Record<string, 'driving' | 'walking'>, 
  travelOptions: Record<string, TravelOptions>
): number => {
  try {
    let totalTravelTime = 0;
    
    // Calculate travel time from actual schedule items (updated with place replacements)
    currentItinerary.schedule.forEach((item, index) => {
      const rideId = generateRideId(
        index === 0 ? 'start' : currentItinerary.schedule[index - 1]?.place?.name || 'unknown',
        item.place?.name || 'unknown',
        index
      );
      
      const selectedMode = travelModes[rideId] || 'driving';
      const segmentTravelOptions = travelOptions[rideId];
      
      if (segmentTravelOptions && segmentTravelOptions[selectedMode]) {
        totalTravelTime += segmentTravelOptions[selectedMode].duration;
      } else {
        // Fallback: use travelTimeFromPrevious if travel options not available yet
        totalTravelTime += item.travelTimeFromPrevious || 0;
      }
    });
    
    // Add return travel time if available
    const lastPlace = currentItinerary.places[currentItinerary.places.length - 1];
    if (lastPlace) {
      const returnRideId = generateRideId(lastPlace.name, 'return', 999);
      const selectedReturnMode = travelModes[returnRideId] || 'driving';
      const returnTravelOptions = travelOptions[returnRideId];
      
      if (returnTravelOptions && returnTravelOptions[selectedReturnMode]) {
        totalTravelTime += returnTravelOptions[selectedReturnMode].duration;
      } else if (lastPlace.returnTravelTime) {
        totalTravelTime += lastPlace.returnTravelTime;
      }
    }
    
    return totalTravelTime;
  } catch (error) {
    console.warn('Error calculating actual travel time:', error);
    return 0;
  }
};

// Calculate combined travel time (driving + walking) using the same logic as breakdown
export const calculateCombinedTravelTime = (
  currentItinerary: GeneratedItinerary,
  travelModes: Record<string, 'driving' | 'walking'>,
  travelOptions: Record<string, TravelOptions>
): number => {
  try {
    let walkingMinutes = 0;
    let drivingMinutes = 0;
    
    // Calculate walking time (same logic as breakdown)
    currentItinerary.schedule.forEach((item, index) => {
      const rideId = generateRideId(
        index === 0 ? 'start' : currentItinerary.schedule[index - 1]?.place?.name || 'unknown',
        item.place?.name || 'unknown',
        index
      );
      const selectedMode = travelModes[rideId] || 'driving';
      const segmentTravelOptions = travelOptions[rideId];
      
      if (segmentTravelOptions && segmentTravelOptions[selectedMode] && selectedMode === 'walking') {
        walkingMinutes += segmentTravelOptions[selectedMode].duration;
      }
    });
    
    // Add dining stop walking time
    currentItinerary.schedule.forEach(item => {
      if (item.diningStops && Array.isArray(item.diningStops)) {
        item.diningStops.forEach(stop => {
          if (stop.travel_breakdown) {
            if (stop.travel_breakdown.travel_to_mode === 'walking') {
              walkingMinutes += stop.travel_breakdown.travel_to_restaurant || 0;
            }
            if (stop.travel_breakdown.travel_from_mode === 'walking') {
              walkingMinutes += stop.travel_breakdown.travel_from_restaurant || 0;
            }
          }
        });
      }
    });
    
    // Add return travel walking time
    const lastPlace = currentItinerary.places[currentItinerary.places.length - 1];
    if (lastPlace) {
      const returnRideId = generateRideId(lastPlace.name, 'return', 999);
      const selectedReturnMode = travelModes[returnRideId] || 'driving';
      const returnTravelOptions = travelOptions[returnRideId];
      
      if (returnTravelOptions && returnTravelOptions[selectedReturnMode] && selectedReturnMode === 'walking') {
        walkingMinutes += returnTravelOptions[selectedReturnMode].duration;
      } else if (lastPlace?.returnTravelTime && selectedReturnMode === 'walking') {
        walkingMinutes += lastPlace.returnTravelTime;
      }
    }
    
    // Calculate driving time (same logic as breakdown)
    currentItinerary.schedule.forEach((item, index) => {
      const rideId = generateRideId(
        index === 0 ? 'start' : currentItinerary.schedule[index - 1]?.place?.name || 'unknown',
        item.place?.name || 'unknown',
        index
      );
      const selectedMode = travelModes[rideId] || 'driving';
      const segmentTravelOptions = travelOptions[rideId];
      
      if (segmentTravelOptions && segmentTravelOptions[selectedMode] && selectedMode === 'driving') {
        drivingMinutes += segmentTravelOptions[selectedMode].duration;
      } else if (!segmentTravelOptions) {
        // Fallback: use travelTimeFromPrevious and assume driving
        drivingMinutes += item.travelTimeFromPrevious || 0;
      }
    });
    
    // Add dining stop driving time
    currentItinerary.schedule.forEach(item => {
      if (item.diningStops && Array.isArray(item.diningStops)) {
        item.diningStops.forEach(stop => {
          if (stop.travel_breakdown) {
            if (stop.travel_breakdown.travel_to_mode === 'driving') {
              drivingMinutes += stop.travel_breakdown.travel_to_restaurant || 0;
            }
            if (stop.travel_breakdown.travel_from_mode === 'driving') {
              drivingMinutes += stop.travel_breakdown.travel_from_restaurant || 0;
            }
          }
        });
      }
    });
    
    // Add return travel driving time
    if (lastPlace) {
      const returnRideId = generateRideId(lastPlace.name, 'return', 999);
      const selectedReturnMode = travelModes[returnRideId] || 'driving';
      const returnTravelOptions = travelOptions[returnRideId];
      
      if (returnTravelOptions && returnTravelOptions[selectedReturnMode] && selectedReturnMode === 'driving') {
        drivingMinutes += returnTravelOptions[selectedReturnMode].duration;
      } else if (lastPlace?.returnTravelTime && selectedReturnMode === 'driving') {
        drivingMinutes += lastPlace.returnTravelTime;
      } else if (lastPlace?.returnTravelTime) {
        // If return travel time exists but mode is not specified, assume driving
        drivingMinutes += lastPlace.returnTravelTime;
      }
    }
    
    return walkingMinutes + drivingMinutes;
  } catch (error) {
    console.warn('Error calculating combined travel time:', error);
    return calculateActualTravelTime(currentItinerary, travelModes, travelOptions);
  }
};

// Format travel time for display
export const formatTravelTime = (duration: number): string => {
  return duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`;
};

// Calculate travel segment display info
export const getTravelSegmentInfo = (
  rideId: string,
  travelModes: Record<string, 'driving' | 'walking'>,
  travelOptions: Record<string, TravelOptions>
) => {
  const selectedMode = travelModes[rideId] || 'driving';
  const options = travelOptions[rideId];
  
  if (!options) {
    return {
      duration: 0,
      mode: selectedMode,
      icon: selectedMode === 'walking' ? '🚶' : '🚗',
      formattedTime: '0m'
    };
  }
  
  const modeInfo = options[selectedMode];
  
  return {
    duration: modeInfo.duration,
    mode: selectedMode,
    icon: modeInfo.icon || (selectedMode === 'walking' ? '🚶' : '🚗'),
    formattedTime: formatTravelTime(modeInfo.duration),
    distance: modeInfo.distance
  };
};