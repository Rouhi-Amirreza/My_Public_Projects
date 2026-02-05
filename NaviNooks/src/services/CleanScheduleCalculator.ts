/**
 * CleanScheduleCalculator - Professional schedule calculation service
 * Replaces the problematic recalculateEntireSchedule function with a clean, efficient implementation
 */

import { GeneratedItinerary, MultiDayItinerary, DailyItinerary, TravelOptions, DiningStop } from '../types';

interface ScheduleItem {
  place: any;
  arrivalTime: string;
  departureTime: string;
  visitDuration: number;
  travelTimeFromPrevious?: number;
  travelMode?: string;
  travelIcon?: string;
  diningStops?: DiningStop[];
}

interface CalculationResult {
  success: boolean;
  error?: string;
  itinerary: GeneratedItinerary | MultiDayItinerary;
}

class CleanScheduleCalculator {
  private static isCalculating = false;
  private static lastCalculationTime = 0;
  private static readonly DEBOUNCE_MS = 500;

  /**
   * Main entry point for schedule recalculation
   */
  static async recalculateSchedule(
    itinerary: GeneratedItinerary | MultiDayItinerary,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' },
    activeDay?: number
  ): Promise<CalculationResult> {
    // Debouncing to prevent excessive calculations
    const now = Date.now();
    if (now - this.lastCalculationTime < this.DEBOUNCE_MS) {
      return { success: true, itinerary };
    }

    // Prevent concurrent calculations
    if (this.isCalculating) {
      return { success: true, itinerary };
    }

    this.isCalculating = true;
    this.lastCalculationTime = now;

    try {
      const result = this.isMultiDay(itinerary)
        ? await this.recalculateMultiDaySchedule(itinerary, travelOptions, travelModes, activeDay)
        : await this.recalculateSingleDaySchedule(itinerary, travelOptions, travelModes);

      return { success: true, itinerary: result };
    } catch (error) {
      console.error('Schedule calculation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        itinerary 
      };
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * Recalculate multi-day itinerary
   */
  private static async recalculateMultiDaySchedule(
    itinerary: MultiDayItinerary,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' },
    activeDay?: number
  ): Promise<MultiDayItinerary> {
    const updatedDailyItineraries = await Promise.all(
      itinerary.dailyItineraries.map(async (day, index) => {
        // Only recalculate the active day or all days if no active day specified
        if (activeDay === undefined || index === activeDay - 1) {
          return this.recalculateDaySchedule(day, travelOptions, travelModes);
        }
        return day;
      })
    );

    // Update totals
    const totals = this.calculateMultiDayTotals(updatedDailyItineraries);

    return {
      ...itinerary,
      dailyItineraries: updatedDailyItineraries,
      ...totals
    };
  }

  /**
   * Recalculate single day itinerary
   */
  private static async recalculateSingleDaySchedule(
    itinerary: GeneratedItinerary,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' }
  ): Promise<GeneratedItinerary> {
    return this.recalculateDaySchedule(itinerary, travelOptions, travelModes);
  }

  /**
   * Core schedule recalculation for a single day
   */
  private static recalculateDaySchedule(
    day: GeneratedItinerary | DailyItinerary,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' }
  ): GeneratedItinerary | DailyItinerary {
    if (!day.schedule || day.schedule.length === 0) {
      return day;
    }

    const startTime = day.schedule[0]?.arrivalTime || '09:00';
    let currentTime = this.timeToMinutes(startTime);
    
    // Sequentially calculate each schedule item
    const finalSchedule = day.schedule.map((item, index) => {
      const newItem = { ...item };
      
      // Update travel time info first
      const updatedItem = this.calculateScheduleItem(newItem, index, currentTime, travelOptions, travelModes);
      
      if (index === 0) {
        // First place: arrival = start time + travel time from start
        const travelTime = updatedItem.travelTimeFromPrevious || 0;
        currentTime = this.timeToMinutes(startTime) + travelTime;
        updatedItem.arrivalTime = this.minutesToTime(currentTime);
      } else {
        // Subsequent places: arrival = current time (which is previous departure + travel)
        updatedItem.arrivalTime = this.minutesToTime(currentTime);
      }

      // Add dining time impact
      const diningTime = this.calculateDiningTime(updatedItem.diningStops || []);
      currentTime += diningTime;

      // Update arrival if dining affects it
      if (diningTime > 0 && index > 0) {
        updatedItem.arrivalTime = this.minutesToTime(currentTime);
      }

      // Calculate departure time
      const visitDuration = updatedItem.visitDuration || 60;
      currentTime += visitDuration;
      updatedItem.departureTime = this.minutesToTime(currentTime);

      // Add travel time to next place for next iteration
      if (index < day.schedule.length - 1) {
        const nextTravelTime = day.schedule[index + 1]?.travelTimeFromPrevious || 
                              this.getTravelTime(day.schedule[index + 1], index + 1, travelOptions, travelModes) || 
                              15; // fallback
        currentTime += nextTravelTime;
      }

      return updatedItem;
    });

    // Calculate totals
    const totals = this.calculateTotals(finalSchedule);

    return {
      ...day,
      schedule: finalSchedule,
      ...totals
    };
  }

  /**
   * Get travel time for a schedule item
   */
  private static getTravelTime(
    item: any,
    index: number,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' }
  ): number {
    if (index === 0) return 0;
    
    const rideId = this.generateRideId(item?.place || item, index);
    const selectedMode = travelModes[rideId] || 'walking';
    
    // Priority order: existing schedule data > travel options > place data > fallback
    return item?.travelTimeFromPrevious || 
           travelOptions[rideId]?.[selectedMode]?.duration || 
           item?.place?.travelTimeFromPrevious || 
           20; // Fallback
  }

  /**
   * Calculate single schedule item
   */
  private static calculateScheduleItem(
    item: ScheduleItem,
    index: number,
    currentTime: number,
    travelOptions: { [key: string]: TravelOptions },
    travelModes: { [key: string]: 'driving' | 'walking' }
  ): ScheduleItem {
    const rideId = this.generateRideId(item.place, index);
    const selectedMode = travelModes[rideId] || 'walking';
    
    // Get travel time using helper method
    const travelTime = this.getTravelTime(item, index, travelOptions, travelModes);

    return {
      ...item,
      travelTimeFromPrevious: travelTime,
      travelMode: selectedMode,
      travelIcon: selectedMode === 'driving' ? '🚗' : '🚶'
    };
  }

  /**
   * Calculate total dining time impact
   */
  private static calculateDiningTime(diningStops: DiningStop[]): number {
    return diningStops.reduce((total, stop) => {
      return total + (stop.total_stop_impact || 
             (stop.dining_duration || 0) + (stop.detour_time || 0));
    }, 0);
  }

  /**
   * Calculate day totals
   */
  private static calculateTotals(schedule: ScheduleItem[]) {
    const visitingTime = schedule.reduce((sum, item) => sum + (item.visitDuration || 0), 0);
    const travelTime = schedule.reduce((sum, item) => sum + (item.travelTimeFromPrevious || 0), 0);
    const diningTime = schedule.reduce((sum, item) => sum + this.calculateDiningTime(item.diningStops || []), 0);
    
    const totalDuration = visitingTime + travelTime + diningTime;

    return {
      visitingTime: this.formatDuration(visitingTime),
      travelTime: this.formatDuration(travelTime),
      totalDuration: this.formatDuration(totalDuration)
    };
  }

  /**
   * Calculate multi-day totals
   */
  private static calculateMultiDayTotals(days: DailyItinerary[]) {
    const totalPlaces = days.reduce((sum, day) => sum + (day.places?.length || 0), 0);
    const totalVisitingTime = days.reduce((sum, day) => sum + this.parseDuration(day.visitingTime), 0);
    const totalTravelTime = days.reduce((sum, day) => sum + this.parseDuration(day.travelTime), 0);
    const totalDuration = totalVisitingTime + totalTravelTime;

    return {
      totalPlaces,
      totalVisitingTime,
      totalTravelTime,
      totalDuration
    };
  }

  /**
   * Utility functions
   */
  private static isMultiDay(itinerary: any): itinerary is MultiDayItinerary {
    return 'dailyItineraries' in itinerary;
  }

  private static timeToMinutes(timeStr: string): number {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private static formatDuration(minutes: number): string {
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) return '0h 0m';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }

  private static parseDuration(durationStr: string | number): number {
    if (typeof durationStr === 'number') return durationStr;
    if (!durationStr || typeof durationStr !== 'string') return 0;
    
    const hourMatch = durationStr.match(/(\d+)h/);
    const minuteMatch = durationStr.match(/(\d+)m/);
    
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
    
    return hours * 60 + minutes;
  }

  private static generateRideId(place: any, index: number): string {
    return `${place?.place_id || `place_${index}`}_ride`;
  }

  /**
   * Validate schedule consistency and provide debugging info
   */
  static validateSchedule(itinerary: GeneratedItinerary | MultiDayItinerary, showDebug: boolean = false): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      if (this.isMultiDay(itinerary)) {
        // Validate each day
        itinerary.dailyItineraries.forEach((day, dayIndex) => {
          const dayErrors = this.validateDaySchedule(day.schedule, showDebug ? `Day ${dayIndex + 1}` : '');
          dayErrors.forEach(error => errors.push(`Day ${dayIndex + 1}: ${error}`));
        });
      } else {
        // Validate single day
        const dayErrors = this.validateDaySchedule(itinerary.schedule, showDebug ? 'Schedule' : '');
        errors.push(...dayErrors);
      }
    } catch (error) {
      errors.push('Schedule validation failed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateDaySchedule(schedule: ScheduleItem[], debugPrefix: string = ''): string[] {
    const errors: string[] = [];

    if (!schedule || schedule.length === 0) {
      return errors;
    }

    if (debugPrefix) {
      console.log(`🔍 ${debugPrefix} Schedule Validation:`);
    }

    // Check time sequence
    for (let i = 1; i < schedule.length; i++) {
      const prevDeparture = this.timeToMinutes(schedule[i - 1].departureTime);
      const currentArrival = this.timeToMinutes(schedule[i].arrivalTime);
      const travelTime = schedule[i].travelTimeFromPrevious || 0;
      
      const expectedArrival = prevDeparture + travelTime;
      const timeDifference = Math.abs(currentArrival - expectedArrival);
      
      if (debugPrefix) {
        const placeName = schedule[i].place?.name || `Place ${i + 1}`;
        console.log(`  ${placeName}: ${schedule[i - 1].departureTime} + ${travelTime}min = ${this.minutesToTime(expectedArrival)} (actual: ${schedule[i].arrivalTime})`);
      }
      
      if (timeDifference > 2) { // Allow 2-minute tolerance for rounding
        const placeName = schedule[i].place?.name || `Place ${i + 1}`;
        errors.push(`Time inconsistency at ${placeName}: expected ${this.minutesToTime(expectedArrival)}, got ${schedule[i].arrivalTime} (${timeDifference} min difference)`);
      }
    }

    if (debugPrefix && errors.length === 0) {
      console.log(`  ✅ Schedule times are consistent`);
    }

    return errors;
  }
}

export default CleanScheduleCalculator;