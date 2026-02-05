/**
 * ScheduleRecalculator - Recalculates itinerary schedules when dining stops are modified
 */

import { GeneratedItinerary, MultiDayItinerary, DiningStop, DailyItinerary } from '../types';
import DebugLogger from './DebugLogger';

class ScheduleRecalculator {
  /**
   * Recalculate schedule after dining stop changes
   */
  static recalculateSchedule(
    itinerary: GeneratedItinerary | MultiDayItinerary,
    dayIndex?: number,
    travelOptions?: Record<string, any>,
    travelModes?: Record<string, 'driving' | 'walking'>
  ): GeneratedItinerary | MultiDayItinerary {
    try {
      try {
        DebugLogger.log('🔄 Starting schedule recalculation', {
          isMultiDay: 'dailyItineraries' in itinerary,
          dayIndex,
          hasTravelOptions: !!travelOptions,
          hasTravelModes: !!travelModes,
          travelOptionsCount: travelOptions ? Object.keys(travelOptions).length : 0,
          travelModesCount: travelModes ? Object.keys(travelModes).length : 0
        });
      } catch (debugError) {
        console.log('📝 DebugLogger unavailable, using console only');
      }
    if ('dailyItineraries' in itinerary) {
      // Multi-day itinerary
      const updatedDailyItineraries = itinerary.dailyItineraries.map((day, index) => {
        if (dayIndex === undefined || index === dayIndex) {
          return this.recalculateDaySchedule(day, travelOptions, travelModes);
        }
        return day;
      });
      
      // Recalculate multi-day totals by summing all individual day durations
      const totalDurationMinutes = updatedDailyItineraries.reduce((total, day) => {
        const dayDurationMinutes = this.parseTimeString(day.totalDuration || '0');
        return total + dayDurationMinutes;
      }, 0);

      return {
        ...itinerary,
        dailyItineraries: updatedDailyItineraries,
        totalDuration: totalDurationMinutes, // Keep as number for multi-day
      };
    } else {
      // Single day itinerary
      return this.recalculateDaySchedule(itinerary, travelOptions, travelModes);
    }
    } catch (error) {
      console.error('❌ Schedule recalculation failed:', error);
      // Instead of silent failure, mark the itinerary with error information
      if ('dailyItineraries' in itinerary) {
        // Multi-day itinerary - add error to all days
        const errorItinerary = {
          ...itinerary,
          calculationError: error.message,
          calculationFailed: true
        };
        return errorItinerary;
      } else {
        // Single day itinerary - add error information
        return {
          ...itinerary,
          calculationError: error.message,
          calculationFailed: true
        };
      }
    }
  }

  /**
   * Recalculate a single day's schedule
   */
  private static recalculateDaySchedule(
    dayItinerary: GeneratedItinerary | DailyItinerary,
    travelOptions?: Record<string, any>,
    travelModes?: Record<string, 'driving' | 'walking'>
  ): GeneratedItinerary | DailyItinerary {
    if (!dayItinerary.schedule || !Array.isArray(dayItinerary.schedule)) {
      return dayItinerary;
    }

    
    // Calculate base schedule from original place data (ignore corrupted schedule times)
    const places = dayItinerary.places || [];
    const startTimeStr = dayItinerary.schedule[0]?.arrivalTime || '09:00';
    
    // Rebuild base schedule from place travel times (this is the "clean" baseline)
    let baseCurrentTime = this.timeStringToMinutes(startTimeStr);
    const baseSchedule = dayItinerary.schedule.map((item, index) => {
      const place = places[index] || item.place;
      
      let baseArrival: string;
      let baseDeparture: string;
      
      if (index === 0) {
        // First place: use original start time + travel time from starting location
        const travelTime = place?.travelTimeFromPrevious || 0;
        baseCurrentTime = this.timeStringToMinutes(startTimeStr) + travelTime;
        baseArrival = this.minutesToTimeString(baseCurrentTime);
        baseCurrentTime += item.visitDuration || 60;
        baseDeparture = this.minutesToTimeString(baseCurrentTime);
      } else {
        // Subsequent places: use original travel times from place data
        const travelTime = place?.travelTimeFromPrevious;
        
        let actualTravelTime = travelTime;
        if (travelTime === null || travelTime === undefined) {
          console.error(`❌ Travel time not available for ${place?.name || 'unknown place'} during schedule recalculation`);
          throw new Error(`Travel time calculation failed for place ${place?.name || 'unknown place'} during schedule recalculation`);
        }
        
        // Calculate arrival time: previous departure time + travel time
        baseCurrentTime += actualTravelTime;
        baseArrival = this.minutesToTimeString(baseCurrentTime);
        baseCurrentTime += item.visitDuration || 60;
        baseDeparture = this.minutesToTimeString(baseCurrentTime);
      }
      
      return {
        ...item,
        baseArrival,
        baseDeparture
      };
    });

    // Now calculate with dining stops from the clean baseline - FIXED VERSION
    let currentTime = this.timeStringToMinutes(startTimeStr);
    
    // Use a regular for loop to properly maintain currentTime state
    const updatedSchedule = [];
    
    for (let index = 0; index < baseSchedule.length; index++) {
      const item = baseSchedule[index];
      
      if (!item || !item.arrivalTime || !item.departureTime) {
        updatedSchedule.push(item);
        continue;
      }

      let newArrivalTime: string;
      let newDepartureTime: string;

      if (index === 0) {
        // First location: start with base time plus any dining before it
        const preDiningTime = item.diningStops?.reduce((total, stop) => {
          if (typeof stop.total_stop_impact === 'number' && !isNaN(stop.total_stop_impact)) {
            return total + stop.total_stop_impact;
          }
          return total + (stop.dining_duration || 0) + (stop.detour_time || 0);
        }, 0) || 0;
        
        // Start fresh from base time
        currentTime = this.timeStringToMinutes(item.baseArrival);
        currentTime += preDiningTime;
        newArrivalTime = this.minutesToTimeString(currentTime);
        
        // Add visit duration
        currentTime += item.visitDuration || 60;
        newDepartureTime = this.minutesToTimeString(currentTime);
        
        console.log(`📍 Place ${index + 1}: ${newArrivalTime} - ${newDepartureTime} (base: ${item.baseArrival}, dining before: ${preDiningTime}min)`);
      } else {
        // Subsequent locations: calculate from previous departure + travel + dining
        const place = (dayItinerary.places || [])[index] || item.place;
        
        // Get travel time based on selected mode (driving/walking)
        const travelTime = this.getTravelTimeForMode(place, index, travelOptions, travelModes, dayItinerary);
        const selectedMode = this.getSelectedTravelMode(place, index, travelModes, dayItinerary);
        
        // Enhanced debug logging
        const debugInfo = {
          placeName: place?.name,
          placeId: place?.place_id,
          travelTimeFromPrevious: place?.travelTimeFromPrevious,
          selectedMode,
          calculatedTravelTime: travelTime,
          usingTravelOptions: !!travelOptions && !!travelModes
        };
        
        console.log(`🔍 ScheduleRecalculator DEBUG - Place ${index + 1}:`, debugInfo);
        try {
          DebugLogger.debug(`Place ${index + 1} travel time calculation`, debugInfo);
        } catch (debugError) {
          console.log(`📝 Debug logging failed, continuing with console only: ${debugError.message}`);
        }
        
        // *** CRITICAL FIX: Calculate arrival time: previous departure time + travel time ***
        currentTime += travelTime;
        
        // Add any dining stops before this location
        const diningTime = item.diningStops?.reduce((total, stop) => {
          if (typeof stop.total_stop_impact === 'number' && !isNaN(stop.total_stop_impact)) {
            return total + stop.total_stop_impact;
          }
          return total + (stop.dining_duration || 0) + (stop.detour_time || 0);
        }, 0) || 0;
        
        currentTime += diningTime;
        newArrivalTime = this.minutesToTimeString(currentTime);
        
        // Add visit duration
        currentTime += item.visitDuration || 60;
        newDepartureTime = this.minutesToTimeString(currentTime);
        
        const scheduleInfo = {
          placeIndex: index + 1,
          placeName: place?.name,
          arrivalTime: newArrivalTime,
          departureTime: newDepartureTime,
          baseArrival: item.baseArrival,
          travelTime,
          diningTime,
          visitDuration: item.visitDuration
        };
        
        console.log(`📍 Place ${index + 1}: ${newArrivalTime} - ${newDepartureTime} (base: ${item.baseArrival}, travel: ${travelTime}min, dining: ${diningTime}min)`);
        DebugLogger.logScheduleCalculation(
          `Place ${index + 1} schedule`,
          place?.name || 'Unknown',
          newArrivalTime,
          newDepartureTime,
          travelTime
        );
      }

      updatedSchedule.push({
        ...item,
        arrivalTime: newArrivalTime,
        departureTime: newDepartureTime,
      });
    }

    // Calculate new total duration from all schedule items (visit + travel times)
    const totalVisitTime = updatedSchedule.reduce((sum, item) => {
      const visitDuration = item.visitDuration || 0;
      return sum + visitDuration;
    }, 0);
    
    const totalTravelTime = updatedSchedule.reduce((sum, item) => {
      const travelTime = item.travelTimeFromPrevious || 0;
      return sum + travelTime;
    }, 0);
    
    const totalDiningTime = this.calculateTotalDiningTime(updatedSchedule);
    const newTotalDuration = totalVisitTime + totalTravelTime + totalDiningTime;
    

    return {
      ...dayItinerary,
      schedule: updatedSchedule,
      totalDuration: 'totalDuration' in dayItinerary && typeof dayItinerary.totalDuration === 'number' 
        ? newTotalDuration 
        : this.formatDuration(newTotalDuration),
    };
  }

  /**
   * Calculate total dining time for a schedule
   */
  private static calculateTotalDiningTime(schedule: any[]): number {
    if (!schedule || !Array.isArray(schedule)) {
      return 0;
    }
    
    return schedule.reduce((total, item) => {
      if (!item || !item.diningStops || !Array.isArray(item.diningStops)) {
        return total;
      }
      
      const diningTime = item.diningStops.reduce((stopTotal: number, stop: DiningStop) => {
        if (!stop) {
          return stopTotal;
        }
        
        // Use total_stop_impact if available (preferred method)
        if (typeof stop.total_stop_impact === 'number' && !isNaN(stop.total_stop_impact)) {
          return stopTotal + stop.total_stop_impact;
        }
        
        // Fallback to legacy calculation
        if (typeof stop.dining_duration === 'number' && typeof stop.detour_time === 'number' &&
            !isNaN(stop.dining_duration) && !isNaN(stop.detour_time)) {
          return stopTotal + stop.dining_duration + stop.detour_time;
        }
        
        // If all else fails, return current total
        return stopTotal;
      }, 0);
      
      return total + diningTime;
    }, 0);
  }

  /**
   * Convert time string to minutes since midnight
   */
  private static timeStringToMinutes(timeString: string | undefined | null | any): number {
    // More comprehensive type checking
    if (timeString === null || timeString === undefined || typeof timeString !== 'string' || timeString.trim() === '') {
      return 0;
    }
    
    try {
      const parts = timeString.split(':');
      if (parts.length !== 2) {
        return 0;
      }
      const [hours, minutes] = parts.map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || hours > 23 || minutes > 59) {
        return 0;
      }
      return hours * 60 + minutes;
    } catch (error) {
      console.warn('Error parsing time string:', timeString, error);
      return 0;
    }
  }

  /**
   * Convert minutes since midnight to time string
   */
  private static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Parse duration string (e.g., "6h 30m") to minutes
   */
  private static parseTimeString(timeString: string | undefined | null | any): number {
    if (timeString === null || timeString === undefined || typeof timeString !== 'string' || timeString.trim() === '') {
      return 0;
    }
    
    try {
      const hourMatch = timeString.match(/(\d+)h/);
      const minuteMatch = timeString.match(/(\d+)m/);
      
      const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
      
      if (isNaN(hours) || isNaN(minutes)) {
        return 0;
      }
      
      return hours * 60 + minutes;
    } catch (error) {
      console.warn('Error parsing duration string:', timeString, error);
      return 0;
    }
  }

  /**
   * Format minutes to duration string
   */
  private static formatDuration(minutes: number): string {
    // Handle invalid input
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
      return '0h 0m';
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  /**
   * Check if schedule exceeds available time and provide warnings
   */
  static validateScheduleTiming(
    itinerary: GeneratedItinerary,
    availableHours: number
  ): { isValid: boolean; warnings: string[] } {
    const totalMinutes = this.parseTimeString(itinerary.totalDuration);
    const availableMinutes = availableHours * 60;
    
    const warnings: string[] = [];
    
    if (totalMinutes > availableMinutes) {
      const overageMinutes = totalMinutes - availableMinutes;
      warnings.push(
        `Schedule exceeds available time by ${this.formatDuration(overageMinutes)}. Consider reducing dining stops or visit durations.`
      );
    }

    // Check for very late arrival times
    const lastItem = itinerary.schedule[itinerary.schedule.length - 1];
    if (lastItem) {
      const endTime = this.timeStringToMinutes(lastItem.departureTime);
      if (endTime > 22 * 60) { // After 10 PM
        warnings.push(
          `Schedule ends very late (${this.minutesToTimeString(endTime)}). Consider reducing dining time or starting earlier.`
        );
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Suggest optimal dining durations to fit within time constraints
   */
  static suggestOptimalDurations(
    itinerary: GeneratedItinerary,
    availableHours: number
  ): { [stopId: string]: number } {
    const availableMinutes = availableHours * 60;
    const currentTotalMinutes = this.parseTimeString(itinerary.totalDuration);
    
    if (currentTotalMinutes <= availableMinutes) {
      return {}; // No adjustments needed
    }

    const excessMinutes = currentTotalMinutes - availableMinutes;
    const suggestions: { [stopId: string]: number } = {};

    // Find all dining stops and their current durations
    const allDiningStops: Array<{ stop: DiningStop; itemIndex: number; stopIndex: number }> = [];
    
    itinerary.schedule.forEach((item, itemIndex) => {
      item.diningStops?.forEach((stop, stopIndex) => {
        allDiningStops.push({ stop, itemIndex, stopIndex });
      });
    });

    if (allDiningStops.length === 0) return {};

    // Distribute the reduction proportionally
    const totalCurrentDiningTime = allDiningStops.reduce(
      (total, { stop }) => total + stop.dining_duration,
      0
    );

    allDiningStops.forEach(({ stop }) => {
      const proportionalReduction = Math.round(
        (stop.dining_duration / totalCurrentDiningTime) * excessMinutes
      );
      const suggestedDuration = Math.max(
        stop.dining_duration - proportionalReduction,
        15 // Minimum 15 minutes
      );
      suggestions[stop.place_id] = suggestedDuration;
    });

    return suggestions;
  }

  /**
   * Get travel time based on selected mode (driving/walking)
   */
  private static getTravelTimeForMode(
    place: any,
    index: number,
    travelOptions?: Record<string, any>,
    travelModes?: Record<string, 'driving' | 'walking'>,
    dayItinerary?: any
  ): number {
    if (!travelOptions || !travelModes) {
      // Fallback to place data if travel options not available
      const fallbackTime = place?.travelTimeFromPrevious;
      if (fallbackTime === null || fallbackTime === undefined) {
        console.warn(`⚠️ Travel time not available for ${place?.name || 'unknown place'}, using 20min estimate`);
        return 20;
      }
      return fallbackTime;
    }

    // Generate ride ID to match the travel options
    const rideId = this.generateRideId(place, index, dayItinerary);
    const selectedMode = travelModes[rideId] || 'driving';
    const routeOptions = travelOptions[rideId];

    // Debug the ride ID generation and lookup
    console.log(`🔍 RIDE ID DEBUG:`, {
      generatedRideId: rideId,
      place: place?.name,
      index,
      availableOptionKeys: travelOptions ? Object.keys(travelOptions) : [],
      selectedMode,
      routeOptionsAvailable: !!routeOptions,
      drivingTime: routeOptions?.driving?.duration,
      walkingTime: routeOptions?.walking?.duration,
      selectedModeTime: routeOptions?.[selectedMode]?.duration,
      fallbackTime: place?.travelTimeFromPrevious
    });
    
    // Log travel options for this route
    DebugLogger.logTravelOptions(rideId, routeOptions);
    DebugLogger.logTravelModeSelection(rideId, selectedMode, routeOptions?.[selectedMode]?.duration || 0);

    if (routeOptions && routeOptions[selectedMode]) {
      return routeOptions[selectedMode].duration;
    }

    // Fallback to place data if travel options not found for this route
    const fallbackTime = place?.travelTimeFromPrevious;
    if (fallbackTime === null || fallbackTime === undefined) {
      console.warn(`⚠️ Travel options not found for ${place?.name || 'unknown place'}, using 20min estimate`);
      return 20;
    }
    return fallbackTime;
  }

  /**
   * Get selected travel mode for a place
   */
  private static getSelectedTravelMode(
    place: any,
    index: number,
    travelModes?: Record<string, 'driving' | 'walking'>,
    dayItinerary?: any
  ): string {
    if (!travelModes) {
      return 'unknown';
    }

    const rideId = this.generateRideId(place, index, dayItinerary);
    return travelModes[rideId] || 'driving';
  }

  /**
   * Generate ride ID for a place (matches the UI logic)
   */
  private static generateRideId(place: any, index: number, dayItinerary: any): string {
    // This should match the generateRideId logic in ItineraryResultsPage.tsx
    if (index === 0) {
      // For first place: start → first place
      const placeName = place?.name || 'unknown';
      return `start_${placeName.replace(/\s/g, '')}_${index}`;
    } else {
      // For subsequent places: previous place → current place
      const prevPlace = dayItinerary.places?.[index - 1];
      const currentPlace = place;
      const prevName = prevPlace?.name || 'unknown';
      const currentName = currentPlace?.name || 'unknown';
      return `${prevName.replace(/\s/g, '')}_${currentName.replace(/\s/g, '')}_${index}`;
    }
  }

  /**
   * Get schedule summary with dining stops included
   */
  static getScheduleSummary(itinerary: GeneratedItinerary): {
    totalPlaces: number;
    totalDiningStops: number;
    totalDiningTime: string;
    estimatedEndTime: string;
  } {
    const totalDiningStops = itinerary.schedule.reduce(
      (count, item) => count + (item.diningStops?.length || 0),
      0
    );

    const totalDiningMinutes = this.calculateTotalDiningTime(itinerary.schedule);
    
    const lastItem = itinerary.schedule[itinerary.schedule.length - 1];
    const estimatedEndTime = lastItem ? lastItem.departureTime : 'Unknown';

    return {
      totalPlaces: itinerary.places.length,
      totalDiningStops,
      totalDiningTime: this.formatDuration(totalDiningMinutes),
      estimatedEndTime,
    };
  }
}

export default ScheduleRecalculator;