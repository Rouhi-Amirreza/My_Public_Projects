import { GeneratedItinerary, PlaceRecommendation } from '../../types';

// Safely format duration to prevent NaN display
export const formatSafeDuration = (durationString: string | number): string => {
  try {
    if (typeof durationString === 'number') {
      if (isNaN(durationString)) return '0h 0m';
      const hours = Math.floor(durationString / 60);
      const minutes = Math.floor(durationString % 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    
    if (typeof durationString === 'string') {
      // Check for NaN in the string
      if (durationString.includes('NaN')) {
        return '0h 0m';
      }
      return durationString;
    }
    
    return '0h 0m';
  } catch (error) {
    console.warn('Error formatting duration:', error);
    return '0h 0m';
  }
};

// Helper function to parse duration strings (e.g., "2h 30m") to minutes
export const parseDurationToMinutes = (duration: string | number | undefined): number => {
  if (typeof duration === 'number') {
    return isNaN(duration) ? 0 : duration;
  }
  
  if (typeof duration === 'string') {
    try {
      // Parse formats like "2h 30m", "45m", "1h"
      const hourMatch = duration.match(/(\d+)h/);
      const minuteMatch = duration.match(/(\d+)m/);
      
      const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
      
      return (hours * 60) + minutes;
    } catch (error) {
      console.warn('Error parsing duration string:', duration, error);
      return 0;
    }
  }
  
  return 0;
};

// Calculate actual total duration including all travel, visiting, and dining time
export const calculateActualTotalDuration = (currentItinerary: GeneratedItinerary, calculateActualTravelTime: () => number): string => {
  try {
    // 1. Visiting time at attractions (from current schedule - includes place replacements)
    let visitingTimeMinutes = 0;
    currentItinerary.schedule.forEach(item => {
      visitingTimeMinutes += item.visitDuration || 0;
    });
    
    // 2. Actual travel time between places + return travel (from current schedule - includes place replacements)
    const actualTravelTimeMinutes = calculateActualTravelTime();

    // 3. Calculate total dining impact (dining time + extra travel from detours)
    let totalDiningImpactMinutes = 0;
    
    currentItinerary.schedule.forEach(item => {
      if (item.diningStops && Array.isArray(item.diningStops)) {
        item.diningStops.forEach(stop => {
          // Use total_stop_impact which includes dining time + all travel detours
          if (typeof stop.total_stop_impact === 'number' && !isNaN(stop.total_stop_impact)) {
            totalDiningImpactMinutes += stop.total_stop_impact;
          } else {
            // Fallback: dining duration + detour time
            const diningTime = typeof stop.dining_duration === 'number' && !isNaN(stop.dining_duration) ? stop.dining_duration : 0;
            const detourTime = typeof stop.detour_time === 'number' && !isNaN(stop.detour_time) ? stop.detour_time : 0;
            totalDiningImpactMinutes += diningTime + detourTime;
          }
        });
      }
    });

    // Total = Visiting + Actual Travel (includes return travel) + Dining Impact
    const totalMinutes = visitingTimeMinutes + actualTravelTimeMinutes + totalDiningImpactMinutes;
    
    return formatSafeDuration(totalMinutes);
  } catch (error) {
    console.warn('Error calculating actual total duration:', error);
    return formatSafeDuration(currentItinerary.total_duration || '0h 0m');
  }
};

// Check if a place is open at a specific time
export const isPlaceOpenAtTime = (
  place: PlaceRecommendation, 
  visitTime: string, 
  visitDate?: Date
): { isOpen: boolean; reason?: string } => {
  try {
    if (!place.basic_info?.working_hours) {
      return { isOpen: true, reason: 'Hours not available' };
    }

    const workingHours = place.basic_info.working_hours;
    
    // Use provided date or default to today
    const checkDate = visitDate || new Date();
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map day of week to working hours property
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayHours = workingHours[dayName];
    
    if (!dayHours) {
      return { isOpen: false, reason: 'Closed on this day' };
    }
    
    if (dayHours === 'Closed' || dayHours === 'closed') {
      return { isOpen: false, reason: 'Closed' };
    }
    
    // Handle "Open 24 hours" case
    if (dayHours.toLowerCase().includes('24 hours') || dayHours.toLowerCase().includes('open 24')) {
      return { isOpen: true };
    }
    
    // Parse time range (e.g., "9:00 AM - 5:00 PM")
    const timeRangeMatch = dayHours.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
    if (!timeRangeMatch) {
      return { isOpen: true, reason: 'Cannot parse hours' };
    }
    
    const [, startTime, startPeriod, endTime, endPeriod] = timeRangeMatch;
    
    // Convert times to 24-hour format
    const convertTo24Hour = (time: string, period?: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      if (period?.toLowerCase() === 'pm' && hours !== 12) {
        return hours + 12;
      } else if (period?.toLowerCase() === 'am' && hours === 12) {
        return 0;
      }
      return hours;
    };
    
    const startHour = convertTo24Hour(startTime, startPeriod);
    const endHour = convertTo24Hour(endTime, endPeriod);
    
    // Parse visit time
    const [visitHour, visitMinute] = visitTime.split(':').map(Number);
    const visitTimeInMinutes = visitHour * 60 + visitMinute;
    const startTimeInMinutes = startHour * 60 + parseInt(startTime.split(':')[1]);
    const endTimeInMinutes = endHour * 60 + parseInt(endTime.split(':')[1]);
    
    // Handle overnight hours (e.g., 10 PM - 2 AM)
    if (endTimeInMinutes < startTimeInMinutes) {
      const isOpen = visitTimeInMinutes >= startTimeInMinutes || visitTimeInMinutes <= endTimeInMinutes;
      return { isOpen };
    } else {
      const isOpen = visitTimeInMinutes >= startTimeInMinutes && visitTimeInMinutes <= endTimeInMinutes;
      return { isOpen };
    }
    
  } catch (error) {
    console.warn('Error checking place hours:', error);
    return { isOpen: true, reason: 'Error checking hours' };
  }
};

// Generate a unique ride ID for travel segments
export const generateRideId = (from: string, to: string, index: number): string => {
  return `${from.replace(/\s+/g, '_')}_to_${to.replace(/\s+/g, '_')}_${index}`;
};

// Calculate dining stop statistics
export const getDiningStopStats = (currentItinerary: GeneratedItinerary) => {
  let totalStops = 0;
  let totalTime = 0;
  let totalCost = 0;
  
  if (!currentItinerary.schedule) return { totalStops, totalTime, totalCost };
  
  currentItinerary.schedule.forEach(item => {
    if (item.diningStops && Array.isArray(item.diningStops)) {
      item.diningStops.forEach(stop => {
        totalStops++;
        
        // Add dining duration
        if (typeof stop.dining_duration === 'number' && !isNaN(stop.dining_duration)) {
          totalTime += stop.dining_duration;
        } else if (typeof stop.estimated_duration === 'number' && !isNaN(stop.estimated_duration)) {
          totalTime += stop.estimated_duration;
        }
        
        // Add estimated cost
        if (typeof stop.estimated_cost === 'number' && !isNaN(stop.estimated_cost)) {
          totalCost += stop.estimated_cost;
        } else if (typeof stop.price_range === 'string') {
          // Try to extract cost from price range (e.g., "$10-15" -> 12.5)
          const priceMatch = stop.price_range.match(/\$(\d+)(?:-(\d+))?/);
          if (priceMatch) {
            const lowPrice = parseInt(priceMatch[1]);
            const highPrice = priceMatch[2] ? parseInt(priceMatch[2]) : lowPrice;
            totalCost += (lowPrice + highPrice) / 2;
          }
        }
      });
    }
  });
  
  return { totalStops, totalTime, totalCost };
};