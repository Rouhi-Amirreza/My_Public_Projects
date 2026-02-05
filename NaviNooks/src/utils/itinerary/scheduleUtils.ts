import { GeneratedItinerary, MultiDayItinerary, TravelOptions } from '../../types';
import { timeToMinutes, minutesToTime } from './timeUtils';

/**
 * Updates only the arrival times for places AFTER the changed travel segment
 * This preserves all previous arrival times and only affects subsequent locations
 */
export const updateSubsequentArrivalTimes = (
  itinerary: GeneratedItinerary | MultiDayItinerary,
  changedSegmentIndex: number, // Index of the place that the travel segment leads TO
  timeDifference: number, // Difference in minutes (positive for longer, negative for shorter)
  isMultiDay: boolean,
  activeDay?: number
): GeneratedItinerary | MultiDayItinerary => {
  console.log(`⏰ Updating arrival times for destination place (index ${changedSegmentIndex}) and all subsequent places with difference: ${timeDifference} minutes`);
  console.log(`📍 Changed travel segment goes TO place at index ${changedSegmentIndex}, updating places from index ${changedSegmentIndex} onwards`);

  if (isMultiDay && activeDay !== undefined) {
    const multiDayItinerary = itinerary as MultiDayItinerary;
    const updatedDailyItineraries = multiDayItinerary.dailyItineraries.map(day => {
              if (day.day === activeDay) {
          const updatedSchedule = day.schedule.map((item, index) => {
            // Update arrival and departure times for the destination place AND all subsequent places
            // The changed segment goes TO place at changedSegmentIndex, so we update from changedSegmentIndex onwards
            if (index >= changedSegmentIndex) {
            const currentArrivalTime = item.arrivalTime;
            const currentDepartureTime = item.departureTime;
            
            const currentArrivalMinutes = timeToMinutes(currentArrivalTime);
            const newArrivalMinutes = currentArrivalMinutes + timeDifference;
            const newArrivalTime = minutesToTime(newArrivalMinutes);
            
            // Update departure time if it exists (departure = arrival + visit duration)
            let newDepartureTime = currentDepartureTime;
            if (currentDepartureTime) {
              const currentDepartureMinutes = timeToMinutes(currentDepartureTime);
              const newDepartureMinutes = currentDepartureMinutes + timeDifference;
              newDepartureTime = minutesToTime(newDepartureMinutes);
            }
            
            console.log(`📍 Updating Place ${index} (${item.place?.name}): ${currentArrivalTime} → ${newArrivalTime}, ${currentDepartureTime} → ${newDepartureTime}`);
            
            return {
              ...item,
              arrivalTime: newArrivalTime,
              departureTime: newDepartureTime
            };
          }
          // Keep previous places unchanged (places before the destination of the changed segment)
          console.log(`📍 Keeping Place ${index} (${item.place?.name}) unchanged`);
          return item;
        });
        
        return {
          ...day,
          schedule: updatedSchedule
        };
      }
      return day;
    });
    
    return {
      ...multiDayItinerary,
      dailyItineraries: updatedDailyItineraries
    };
  } else {
    const singleDayItinerary = itinerary as GeneratedItinerary;
    const updatedSchedule = singleDayItinerary.schedule.map((item, index) => {
      // Update arrival and departure times for the destination place AND all subsequent places
      // The changed segment goes TO place at changedSegmentIndex, so we update from changedSegmentIndex onwards
      if (index >= changedSegmentIndex) {
        const currentArrivalTime = item.arrivalTime;
        const currentDepartureTime = item.departureTime;
        
        const currentArrivalMinutes = timeToMinutes(currentArrivalTime);
        const newArrivalMinutes = currentArrivalMinutes + timeDifference;
        const newArrivalTime = minutesToTime(newArrivalMinutes);
        
        // Update departure time if it exists (departure = arrival + visit duration)
        let newDepartureTime = currentDepartureTime;
        if (currentDepartureTime) {
          const currentDepartureMinutes = timeToMinutes(currentDepartureTime);
          const newDepartureMinutes = currentDepartureMinutes + timeDifference;
          newDepartureTime = minutesToTime(newDepartureMinutes);
        }
        
                 console.log(`📍 Updating Place ${index} (${item.place?.name}): ${currentArrivalTime} → ${newArrivalTime}, ${currentDepartureTime} → ${newDepartureTime}`);
         
         return {
           ...item,
           arrivalTime: newArrivalTime,
           departureTime: newDepartureTime
         };
       }
       // Keep previous places unchanged (places before the destination of the changed segment)
       console.log(`📍 Keeping Place ${index} (${item.place?.name}) unchanged`);
       return item;
    });
    
    return {
      ...singleDayItinerary,
      schedule: updatedSchedule
    };
  }
};

/**
 * Calculates the time difference when switching travel modes
 */
export const calculateTravelTimeDifference = (
  rideId: string,
  oldMode: 'driving' | 'walking',
  newMode: 'driving' | 'walking',
  travelOptions: Record<string, TravelOptions>
): number => {
  const options = travelOptions[rideId];
  if (!options) {
    console.warn(`⚠️ No travel options found for ${rideId}`);
    return 0;
  }
  
  const oldTime = options[oldMode]?.duration || 0;
  const newTime = options[newMode]?.duration || 0;
  const difference = newTime - oldTime;
  
  console.log(`🔄 Travel time change for ${rideId}: ${oldMode}(${oldTime}min) → ${newMode}(${newTime}min) = ${difference > 0 ? '+' : ''}${difference}min`);
  
  return difference;
};

/**
 * Extracts the target place index from a ride ID
 * Ride IDs follow pattern: "from_to_index" (e.g., "start_Place1_0", "Place1_Place2_1")
 */
export const extractPlaceIndexFromRideId = (rideId: string): number => {
  console.log(`🔍 Parsing ride ID: ${rideId}`);
  
  // Handle special cases first
  if (rideId.includes('_return_')) {
    console.log(`📍 Special case: return travel`);
    return -1; // This is return travel, doesn't affect place arrival times
  }
  
  // Standard format: "from_to_index" (e.g., "start_Place1_0", "Place1_Place2_1")
  // The index is the last number after the final underscore
  const match = rideId.match(/_(\d+)$/);
  if (match) {
    const destinationIndex = parseInt(match[1], 10);
    console.log(`📍 Extracted destination index ${destinationIndex} from ride ID: ${rideId}`);
    
    // For "start_Place1_0", this affects place at index 0
    // For "Place1_Place2_1", this affects place at index 1
    return destinationIndex;
  }
  
  // Try to parse dining stop patterns like "place_restaurant_0_1_to"
  if (rideId.includes('_to') || rideId.includes('_from')) {
    // For dining stops, extract the place index that this affects
    const segments = rideId.split('_');
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (!isNaN(parseInt(segment, 10))) {
        const placeIndex = parseInt(segment, 10);
        console.log(`📍 Extracted place index ${placeIndex} from dining stop ride ID: ${rideId}`);
        return placeIndex + 1; // Dining stop affects the next place's arrival time
      }
    }
  }
  
  console.warn(`⚠️ Could not extract place index from ride ID: ${rideId}`);
  return -1;
};