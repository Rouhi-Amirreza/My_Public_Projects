import { PlaceData, PlaceRecommendation, ItineraryFormData, GeneratedItinerary, MultiDayItinerary, DailyItinerary, DailySchedule, DiningStop } from '../types';
import { INTEREST_CATEGORIES, DEFAULT_VISIT_DURATIONS } from '../utils/constants';
import DataService from './DataService';
import GoogleMapsService from './GoogleMapsService';
import { PHILADELPHIA_CENTER } from '../utils/constants';
import DistanceMatrixService from './DistanceMatrixService';
import DiningService from './DiningService';
import GoogleAPICallCounter from './GoogleAPICallCounter';

class ItineraryService {
  
  /**
   * Calculate departure time for travel time calculation
   * @param baseDate - The itinerary date (YYYY-MM-DD format)
   * @param startTime - The start time (HH:MM format) 
   * @param additionalMinutes - Additional minutes from start time
   * @returns Date object for the calculated departure time (always in future)
   */
  private calculateDepartureTime(baseDate: string, startTime: string, additionalMinutes: number = 0): Date {
    const [year, month, day] = baseDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const departureTime = new Date(year, month - 1, day, hours, minutes);
    departureTime.setMinutes(departureTime.getMinutes() + additionalMinutes);
    
    // Ensure departure time is always in the future
    const now = new Date();
    if (departureTime.getTime() <= now.getTime()) {
      // If the calculated time is in the past, use a time 10 minutes from now
      const futureTime = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes from now
      console.log(`⚠️ Calculated departure time ${departureTime.toISOString()} is in the past, using future time: ${futureTime.toISOString()}`);
      return futureTime;
    }
    
    return departureTime;
  }

  /**
   * Add dining stop to the last place in an itinerary before return journey
   * This is a public method that can be called by the UI
   * @param itinerary - The itinerary to modify
   * @param returnAddress - The return destination address
   * @returns Promise<GeneratedItinerary | MultiDayItinerary> - Updated itinerary with dining stop
   */
  async addReturnDiningStopToItinerary(
    itinerary: GeneratedItinerary | MultiDayItinerary,
    returnAddress: string
  ): Promise<GeneratedItinerary | MultiDayItinerary> {
    try {
      if ('dailyItineraries' in itinerary) {
        // Multi-day itinerary - add to the last day
        const updatedDailyItineraries = [...itinerary.dailyItineraries];
        const lastDayIndex = updatedDailyItineraries.length - 1;
        const lastDay = updatedDailyItineraries[lastDayIndex];
        
        if (lastDay.places.length > 0) {
          const lastPlace = lastDay.places[lastDay.places.length - 1];
          const lastScheduleItem = lastDay.schedule[lastDay.schedule.length - 1];
          
          const diningStop = await this.addReturnDiningStop(
            lastPlace,
            returnAddress,
            lastScheduleItem.departureTime
          );
          
          if (diningStop) {
            // Add dining stop to the last place
            lastPlace.returnDiningStop = diningStop;
            console.log(`🍽️ Added return dining stop to last day: ${diningStop.name}`);
          }
        }
        
        return {
          ...itinerary,
          dailyItineraries: updatedDailyItineraries
        };
      } else {
        // Single-day itinerary
        if (itinerary.places.length > 0) {
          const lastPlace = itinerary.places[itinerary.places.length - 1];
          const lastScheduleItem = itinerary.schedule[itinerary.schedule.length - 1];
          
          const diningStop = await this.addReturnDiningStop(
            lastPlace,
            returnAddress,
            lastScheduleItem.departureTime
          );
          
          if (diningStop) {
            // Create updated places array with dining stop
            const updatedPlaces = [...itinerary.places];
            updatedPlaces[updatedPlaces.length - 1] = {
              ...lastPlace,
              returnDiningStop: diningStop
            };
            
            console.log(`🍽️ Added return dining stop to single-day itinerary: ${diningStop.name}`);
            
            return {
              ...itinerary,
              places: updatedPlaces
            };
          }
        }
        
        return itinerary;
      }
    } catch (error) {
      console.error('Failed to add return dining stop to itinerary:', error);
      return itinerary;
    }
  }

  /**
   * Add dining stop before return journey (internal method)
   * @param lastPlace - The last place in the itinerary
   * @param returnAddress - The return destination address
   * @param arrivalTime - Time when arriving at the last place for departure
   * @returns Promise<DiningStop | null> - The selected dining stop or null if none found
   */
  private async addReturnDiningStop(
    lastPlace: PlaceRecommendation,
    returnAddress: string,
    arrivalTime: string
  ): Promise<DiningStop | null> {
    try {
      // Get coordinates for the last place
      const lastPlaceCoords = this.getPlaceCoordinates(lastPlace);
      
      // Get coordinates for return destination
      let returnCoords: { lat: number; lng: number };
      try {
        const geocodeResult = await GoogleMapsService.geocodeAddress(returnAddress);
        if (!geocodeResult) {
          returnCoords = this.getCurrentCityCenter();
        } else {
          returnCoords = { lat: geocodeResult.lat, lng: geocodeResult.lng };
        }
      } catch (error) {
        console.warn('Failed to geocode return address, using city center:', error);
        returnCoords = this.getCurrentCityCenter();
      }

      // Find dining options between last place and return destination
      const diningOptions = await DiningService.findDiningOptionsBetween(
        lastPlaceCoords.latitude,
        lastPlaceCoords.longitude,
        returnCoords.lat,
        returnCoords.lng,
        arrivalTime,
        2 // max 2km detour
      );

      if (diningOptions.length === 0) {
        console.log('🍽️ No dining options found for return journey');
        return null;
      }

      // Select the best dining option (first option from the first meal type)
      const bestMealType = diningOptions[0];
      const bestOption = bestMealType.options[0];

      if (!bestOption) {
        console.log('🍽️ No valid dining option available');
        return null;
      }

      // Calculate travel time breakdown for the dining stop
      const travelBreakdown = await DiningService.calculateTravelTimeBreakdown(
        bestOption.geometry.location.lat,
        bestOption.geometry.location.lng,
        lastPlaceCoords.latitude,
        lastPlaceCoords.longitude,
        returnCoords.lat,
        returnCoords.lng
      );

      // Calculate dining duration
      const diningDuration = DiningService.calculateDiningDuration(
        bestMealType.meal_type,
        bestOption.typical_time_spent
      );

      // Create the dining stop
      const diningStop: DiningStop = {
        place_id: bestOption.place_id,
        name: bestOption.name,
        address: bestOption.vicinity,
        coordinates: {
          latitude: bestOption.geometry.location.lat,
          longitude: bestOption.geometry.location.lng
        },
        rating: bestOption.rating,
        user_ratings_total: bestOption.user_ratings_total,
        price_level: bestOption.price_level,
        meal_type: bestMealType.meal_type,
        detour_distance: bestOption.distance_from_route || 0,
        detour_time: bestOption.detour_time || 0,
        dining_duration: diningDuration,
        typical_time_spent: bestOption.typical_time_spent,
        travel_breakdown: travelBreakdown,
        total_stop_impact: travelBreakdown.travelToRestaurant + diningDuration + travelBreakdown.travelFromRestaurant,
        photos: bestOption.photos
      };

      console.log(`🍽️ Added return dining stop: ${diningStop.name} (${bestMealType.emoji} ${bestMealType.meal_label})`);
      console.log(`   📍 Location: ${diningStop.address}`);
      console.log(`   ⏱️ Total impact: ${diningStop.total_stop_impact} minutes (${travelBreakdown.travelToRestaurant}min travel + ${diningDuration}min dining + ${travelBreakdown.travelFromRestaurant}min travel)`);

      return diningStop;
    } catch (error) {
      console.error('Failed to add return dining stop:', error);
      return null;
    }
  }

  /**
   * Get current city center coordinates or fallback to Philadelphia
   */
  private getCurrentCityCenter(): { lat: number; lng: number } {
    const currentCity = DataService.getCurrentCity();
    const cityCenter = currentCity?.coordinates || PHILADELPHIA_CENTER;
    return {
      lat: cityCenter.latitude,
      lng: cityCenter.longitude
    };
  }
  
  /**
   * Get day of week from date string in a timezone-safe way
   * This prevents timezone issues that can cause wrong day calculation
   */
  private getDayOfWeekSafe(dateString: string): string {
    // Parse the date components manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date object in local time (not UTC)
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    
    console.log(`🗓️  SAFE DATE PARSING: "${dateString}" → Year:${year}, Month:${month}, Day:${day} → ${dayOfWeek}`);
    
    return dayOfWeek;
  }

  /**
   * Generate optimized itinerary based on user preferences
   * Automatically detects single-day vs multi-day requests
   */
  async generateItinerary(formData: ItineraryFormData): Promise<GeneratedItinerary | MultiDayItinerary> {
    // Start API tracking session
    const apiCounter = GoogleAPICallCounter.getInstance();
    const sessionId = apiCounter.startItinerarySession(
      formData.numberOfDays > 1 ? 'multi_day' : 'single_day',
      formData.numberOfDays,
      formData.selectedInterests.length * 3 // Estimate places based on interests
    );

    try {
      let result: GeneratedItinerary | MultiDayItinerary;
      
      // Check if this is a multi-day request
      if (formData.numberOfDays > 1) {
        result = await this.generateMultiDayItinerary(formData);
      } else {
        // Single-day itinerary generation (existing logic)
        result = await this.generateSingleDayItinerary(formData);
      }

      // End API tracking session
      const sessionStats = apiCounter.endItinerarySession();
      
      // Add API usage info to result metadata
      if (sessionStats) {
        (result as any).apiUsage = {
          totalCalls: sessionStats.totalCalls,
          totalCost: sessionStats.totalCost,
          sessionId: sessionStats.sessionId,
          cacheHitRate: sessionStats.cacheHitRate
        };
      }

      return result;
    } catch (error) {
      // End session even on error
      apiCounter.endItinerarySession();
      throw error;
    }
  }

  /**
   * Generate single-day itinerary (original logic)
   */
  private async generateSingleDayItinerary(formData: ItineraryFormData): Promise<GeneratedItinerary> {
    try {
      // Step 1: Filter places by interests
      const interestedPlaces = this.filterPlacesByInterests(formData.selectedInterests);
      
      // Step 2: Filter by opening hours for selected date (with special handling for high-popularity places)
      const openPlaces = this.filterByOpeningHours(interestedPlaces, formData.date);
      
      // Step 3: Apply fame-based prioritization
      const prioritizedPlaces = this.prioritizeByFame(openPlaces);
      
      // Step 4: Select optimal places within time constraints
      const selectedPlaces = this.selectOptimalPlaces(
        prioritizedPlaces, 
        formData.availableHours,
        formData.selectedInterests
      );
      
      // Step 5: Optimize route using Google routing if possible
      const optimizedRoute = await this.optimizeRouteWithTimeConstraints(
        selectedPlaces,
        formData.startingAddress,
        formData.availableHours,
        formData.returnAddress,
        formData.differentReturnLocation,
        formData.date,
        formData.startTime
      );
      
      // Step 6: Generate schedule respecting opening hours
      const schedule = this.generateOptimizedSchedule(
        optimizedRoute,
        formData.startTime,
        formData.availableHours,
        formData.date,
        interestedPlaces,
        formData.selectedInterests
      );
      
      // Step 7: Calculate precise time metrics
      const timeMetrics = this.calculatePreciseTimeMetrics(
        optimizedRoute, 
        formData.startingAddress,
        formData.returnAddress,
        formData.differentReturnLocation
      );
      
      // Step 8: Validate against available time
      const availableTimeInMinutes = formData.availableHours * 60;
      
      if (timeMetrics.totalDuration > availableTimeInMinutes) {
        // Apply intelligent time optimization algorithm
        const optimizedRoute2 = await this.optimizeForTimeConstraints(
          optimizedRoute,
          formData.startingAddress,
          formData.returnAddress,
          formData.differentReturnLocation,
          availableTimeInMinutes
        );
        
        const finalTimeMetrics = this.calculatePreciseTimeMetrics(
          optimizedRoute2,
          formData.startingAddress,
          formData.returnAddress,
          formData.differentReturnLocation
        );
        
        if (finalTimeMetrics.totalDuration <= availableTimeInMinutes) {
          const finalSchedule = this.generateOptimizedSchedule(
            optimizedRoute2,
            formData.startTime,
            formData.availableHours,
            formData.date,
            interestedPlaces,
            formData.selectedInterests
          );
          
          // Double-check if final schedule exceeds available time and fix if needed
          const scheduleTimeCheck = this.calculatePreciseTimeMetrics(
            optimizedRoute2,
            formData.startingAddress,
            formData.returnAddress,
            formData.differentReturnLocation
          );
          
          let adjustedSchedule = finalSchedule;
          let adjustedTimeMetrics = scheduleTimeCheck;
          
          if (scheduleTimeCheck.totalDuration > availableTimeInMinutes) {
            console.log(`🚨 OPTIMIZED ROUTE TIME VIOLATION: ${(scheduleTimeCheck.totalDuration / 60).toFixed(1)}h > ${formData.availableHours}h`);
            
            // Apply time reduction with warnings
            adjustedSchedule = this.adjustScheduleTimeWithWarnings(
              finalSchedule,
              scheduleTimeCheck,
              availableTimeInMinutes,
              1 // Single day
            );
            
            // Recalculate metrics with adjusted schedule
            const adjustedPlaces = adjustedSchedule.map(item => item.place);
            adjustedTimeMetrics = this.calculatePreciseTimeMetrics(
              adjustedPlaces,
              formData.startingAddress,
              formData.returnAddress,
              formData.differentReturnLocation
            );
            
            console.log(`✅ OPTIMIZED ROUTE FIXED: Reduced to ${(adjustedTimeMetrics.totalDuration / 60).toFixed(1)}h`);
          }
          
          // Find missed high-popularity places
          const missedPopularPlaces = this.findMissedHighPopularityPlaces(
            interestedPlaces, 
            optimizedRoute2, 
            formData.selectedInterests, 
            formData.date
          );
          
          return this.buildPreciseItineraryResponse(optimizedRoute2, adjustedSchedule, adjustedTimeMetrics, formData, missedPopularPlaces);
        } else {
          throw new Error(`Unable to create itinerary within ${formData.availableHours} hours. Required: ${(finalTimeMetrics.totalDuration / 60).toFixed(1)}h. Please increase available time or reduce interests.`);
        }
      }
      
      // Step 9: Generate final schedule
      const finalSchedule = this.generateOptimizedSchedule(
        optimizedRoute,
        formData.startTime,
        formData.availableHours,
        formData.date,
        interestedPlaces,
        formData.selectedInterests
      );
      
      // Step 9.5: Check if final schedule exceeds available time and fix if needed
      const finalTimeCheck = this.calculatePreciseTimeMetrics(
        optimizedRoute,
        formData.startingAddress,
        formData.returnAddress,
        formData.differentReturnLocation
      );
      
      let adjustedSchedule = finalSchedule;
      let adjustedTimeMetrics = finalTimeCheck;
      
      if (finalTimeCheck.totalDuration > availableTimeInMinutes) {
        console.log(`🚨 SINGLE-DAY TIME VIOLATION: ${(finalTimeCheck.totalDuration / 60).toFixed(1)}h > ${formData.availableHours}h`);
        
        // Apply time reduction with warnings
        adjustedSchedule = this.adjustScheduleTimeWithWarnings(
          finalSchedule,
          finalTimeCheck,
          availableTimeInMinutes,
          1 // Single day
        );
        
        // Recalculate metrics with adjusted schedule
        const adjustedPlaces = adjustedSchedule.map(item => item.place);
        adjustedTimeMetrics = this.calculatePreciseTimeMetrics(
          adjustedPlaces,
          formData.startingAddress,
          formData.returnAddress,
          formData.differentReturnLocation
        );
        
        console.log(`✅ SINGLE-DAY FIXED: Reduced to ${(adjustedTimeMetrics.totalDuration / 60).toFixed(1)}h`);
      }
      
      // Step 10: Find missed high-popularity places
      const missedPopularPlaces = this.findMissedHighPopularityPlaces(
        interestedPlaces, 
        optimizedRoute, 
        formData.selectedInterests, 
        formData.date
      );
      
      return this.buildPreciseItineraryResponse(optimizedRoute, adjustedSchedule, adjustedTimeMetrics, formData, missedPopularPlaces);
    } catch (error) {
      console.error('Error generating single-day itinerary:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error information
      if (error.message.includes('Travel time calculation failed')) {
        throw new Error(`Travel time calculation issue: ${error.message}`);
      } else if (error.message.includes('No places open')) {
        throw new Error('No places are open on the selected date. Please try a different date or interests.');
      } else if (error.message.includes('coordinates')) {
        throw new Error('Location coordinate issue. Please check your starting address.');
      } else {
        throw new Error(`Itinerary generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate multi-day itinerary with intelligent place distribution
   */
  private async generateMultiDayItinerary(formData: ItineraryFormData): Promise<MultiDayItinerary> {
    try {
      console.log('\n🗓️  === GENERATING MULTI-DAY ITINERARY ===');
      console.log(`Date range: ${formData.date} to ${formData.dailySchedules[formData.dailySchedules.length - 1]?.date || 'N/A'}`);
      
      // Step 1: Get all places that match interests (NO OPENING HOURS FILTERING YET)
      const interestedPlaces = this.filterPlacesByInterests(formData.selectedInterests);
      console.log(`Found ${interestedPlaces.length} places matching interests`);
      
      // Step 2: Prioritize places by fame and importance (NO OPENING HOURS FILTERING YET)
      const prioritizedPlaces = this.prioritizeByFame(interestedPlaces);
      console.log(`Prioritized ${prioritizedPlaces.length} places by popularity`);
      
      // NOTE: We deliberately skip opening hours filtering here because each day needs different filtering
      
      // Step 3: Determine daily schedules to use
      const dailySchedules = formData.useUniformSchedule 
        ? this.generateUniformDailySchedules(formData)
        : formData.dailySchedules;
      
      console.log(`Daily schedules:`, dailySchedules.map(s => `Day ${s.day}: ${s.date}`));
      
      // Step 4: Calculate total available time across all days
      const totalAvailableTime = dailySchedules.reduce((sum, schedule) => sum + schedule.availableHours, 0);
      console.log(`Total available time across all days: ${totalAvailableTime} hours`);
      
      // Step 5: Select optimal places for the entire trip (still no hours filtering)
      const selectedPlaces = this.selectOptimalPlaces(
        prioritizedPlaces,
        totalAvailableTime,
        formData.selectedInterests
      );
      console.log(`Selected ${selectedPlaces.length} places for the entire trip`);
      
      // Step 6: Distribute places across days intelligently (THIS is where opening hours per day are checked)
      const dailyPlaceDistribution = this.distributePlacesAcrossDays(selectedPlaces, dailySchedules);
      
      // Debug: Track places assigned in initial distribution
      console.log('\n🔍 === INITIAL DISTRIBUTION DEBUG ===');
      const initiallyAssignedPlaces = new Set<string>();
      dailyPlaceDistribution.forEach((dayPlaces, dayIndex) => {
        console.log(`Day ${dayIndex + 1}: ${dayPlaces.length} places initially assigned`);
        dayPlaces.forEach(place => {
          console.log(`  - ${place.name} (${place.place_id})`);
          initiallyAssignedPlaces.add(place.place_id);
        });
      });
      console.log(`Total unique places in initial distribution: ${initiallyAssignedPlaces.size}`);
      console.log('=====================================\n');
      
      // Step 7: Generate individual daily itineraries
      const dailyItineraries: DailyItinerary[] = [];
      let totalPlaces = 0;
      let totalVisitingTime = 0;
      let totalTravelTime = 0;
      let totalDuration = 0;
      const overallUncoveredInterests = new Set<string>();
      
      // Track places used across all days to prevent duplicates
      const usedPlaceIds = new Set<string>();
      
      // Pre-mark all initially distributed places as used
      console.log('\n🔒 === PRE-MARKING DISTRIBUTED PLACES AS USED ===');
      dailyPlaceDistribution.forEach((dayPlaces, dayIndex) => {
        dayPlaces.forEach(place => {
          console.log(`  Pre-marking as used: ${place.name} (${place.place_id}) assigned to Day ${dayIndex + 1}`);
          usedPlaceIds.add(place.place_id);
        });
      });
      console.log(`Total pre-marked places: ${usedPlaceIds.size}`);
      console.log('=============================================\n');
      
      for (let i = 0; i < dailySchedules.length; i++) {
        const schedule = dailySchedules[i];
        const dayPlaces = dailyPlaceDistribution[i];
        
        if (dayPlaces.length > 0) {
          // CRITICAL FIX: Double-check places by opening hours for THIS SPECIFIC DAY
          console.log(`\n🔍 === FINAL FILTERING FOR DAY ${schedule.day} (${schedule.date}) ===`);
          console.log(`📅 Using date: ${schedule.date} for opening hours verification`);
          const dayOpenPlaces = this.filterByOpeningHours(dayPlaces, schedule.date);
          console.log(`Day ${schedule.day}: ${dayPlaces.length} assigned places → ${dayOpenPlaces.length} open places`);
          
          if (dayOpenPlaces.length === 0) {
            console.log(`❌ No places open on day ${schedule.day} (${schedule.date}), skipping...`);
            continue;
          }
          
          console.log(`✅ Proceeding with ${dayOpenPlaces.length} open places for Day ${schedule.day}`);
          
          // Generate daily itinerary using existing single-day logic
          const dayFormData: ItineraryFormData = {
            ...formData,
            startTime: schedule.startTime,
            date: schedule.date,
            availableHours: schedule.availableHours,
            numberOfDays: 1,
            useUniformSchedule: true,
            dailySchedules: []
          };
          
          // Generate optimized route for this day using only places open on this day
          const dayRoute = await this.optimizeRouteWithTimeConstraints(
            dayOpenPlaces,
            formData.startingAddress,
            schedule.availableHours,
            formData.returnAddress,
            formData.differentReturnLocation,
            schedule.date,
            schedule.startTime
          );
          
          // Filter out places that have already been used in previous days
          const availablePlaces = interestedPlaces.filter(place => !usedPlaceIds.has(place.place_id));
          
          // Generate schedule for this day
          const daySchedule = this.generateOptimizedSchedule(
            dayRoute,
            schedule.startTime,
            schedule.availableHours,
            schedule.date,
            availablePlaces, // Use only available places for filling remaining time
            formData.selectedInterests
          );
          
          // Extract places that actually made it into the schedule (with valid timing)
          // IMPORTANT: Preserve travel time information from schedule items
          const scheduledPlaces = daySchedule.map(item => ({
            ...item.place,
            travelTimeFromPrevious: item.travelTimeFromPrevious || item.place.travelTimeFromPrevious,
            travelMode: item.travelMode || item.place.travelMode,
            travelIcon: item.travelIcon || item.place.travelIcon
          }));
          
          // Debug: Verify travel times are preserved
          scheduledPlaces.forEach((place, index) => {
            console.log(`🔍 DEBUG: Scheduled place ${index} (${place.name}) has travelTimeFromPrevious: ${place.travelTimeFromPrevious}`);
          });
          
          // CRITICAL FIX: Ensure first place has travel time from starting location
          if (scheduledPlaces.length > 0 && !scheduledPlaces[0].travelTimeFromPrevious) {
            console.log(`⚠️ WARNING: First place ${scheduledPlaces[0].name} missing travel time from start. Calculating now...`);
            try {
              const departureTime = (schedule.date && schedule.startTime) ? 
                this.calculateDepartureTime(schedule.date, schedule.startTime, 0) : 
                undefined;
                
              const travelResult = await DistanceMatrixService.calculateTravelTime(
                formData.startingAddress,
                DistanceMatrixService.getPlaceIdentifier(scheduledPlaces[0], this.getCurrentCityInfo()),
                'driving',
                departureTime
              );
              
              scheduledPlaces[0].travelTimeFromPrevious = travelResult.duration;
              scheduledPlaces[0].distanceFromPrevious = Math.round(travelResult.distance / 1000);
              scheduledPlaces[0].travelMode = travelResult.distance < 800 ? 'walking' : 'driving';
              
              console.log(`✅ Set travel time for first place ${scheduledPlaces[0].name}: ${scheduledPlaces[0].travelTimeFromPrevious}min from starting location`);
            } catch (error) {
              console.error(`Failed to calculate travel time for first place ${scheduledPlaces[0].name}:`, error);
              // Use conservative estimate
              scheduledPlaces[0].travelTimeFromPrevious = 25;
              scheduledPlaces[0].distanceFromPrevious = 2;
              scheduledPlaces[0].travelMode = 'driving';
            }
          }
          
          // Mark these places as used to prevent duplicates in future days
          scheduledPlaces.forEach(place => {
            if (usedPlaceIds.has(place.place_id)) {
              console.log(`🚨 DUPLICATE ALERT: ${place.name} (${place.place_id}) was already scheduled on a previous day!`);
            }
            usedPlaceIds.add(place.place_id);
          });
          
          console.log(`📅 Day ${schedule.day}: Route had ${dayRoute.length} places, Schedule has ${scheduledPlaces.length} places`);
          if (dayRoute.length !== scheduledPlaces.length) {
            const routePlaceIds = new Set(dayRoute.map(p => p.place_id));
            const schedulePlaceIds = new Set(scheduledPlaces.map(p => p.place_id));
            const missingFromSchedule = dayRoute.filter(p => !schedulePlaceIds.has(p.place_id));
            console.log(`⚠️  Places filtered out due to timing: ${missingFromSchedule.map(p => p.name).join(', ')}`);
          }
          
          // Calculate time metrics for this day
          const dayTimeMetrics = this.calculatePreciseTimeMetrics(
            scheduledPlaces,
            formData.startingAddress,
            formData.returnAddress,
            formData.differentReturnLocation
          );
          
          // FIX: If day exceeds available time, reduce visit times and add warnings
          const dayAvailableMinutes = schedule.availableHours * 60;
          if (dayTimeMetrics.totalDuration > dayAvailableMinutes) {
            console.log(`🚨 TIME CONSTRAINT VIOLATION on Day ${schedule.day}: ${(dayTimeMetrics.totalDuration / 60).toFixed(1)}h > ${schedule.availableHours}h`);
            
            // Apply time reduction with warnings
            const adjustedSchedule = this.adjustScheduleTimeWithWarnings(
              daySchedule,
              dayTimeMetrics,
              dayAvailableMinutes,
              schedule.day
            );
            
            // Update the schedule and recalculate metrics
            daySchedule.length = 0; // Clear original schedule
            daySchedule.push(...adjustedSchedule); // Add adjusted schedule
            
            // Recalculate metrics with adjusted schedule
            const adjustedPlaces = daySchedule.map(item => item.place);
            const adjustedTimeMetrics = this.calculatePreciseTimeMetrics(
              adjustedPlaces,
              formData.startingAddress,
              formData.returnAddress,
              formData.differentReturnLocation
            );
            
            console.log(`✅ FIXED: Reduced to ${(adjustedTimeMetrics.totalDuration / 60).toFixed(1)}h`);
            
            // Update the variables to use adjusted values
            scheduledPlaces.length = 0;
            scheduledPlaces.push(...adjustedPlaces);
            dayTimeMetrics.totalDuration = adjustedTimeMetrics.totalDuration;
            dayTimeMetrics.visitingTime = adjustedTimeMetrics.visitingTime;
            dayTimeMetrics.travelTime = adjustedTimeMetrics.travelTime;
          }
          
          // Find uncovered interests for this day
          const dayUncoveredInterests = this.findUncoveredInterests(formData.selectedInterests, scheduledPlaces);
          dayUncoveredInterests.forEach(interest => overallUncoveredInterests.add(interest));
          
          // Find missed high-popularity places for this day using the correct date
          const dayMissedPopularPlaces = this.findMissedHighPopularityPlaces(
            prioritizedPlaces, 
            scheduledPlaces, 
            formData.selectedInterests, 
            schedule.date  // This is correct - using the specific day's date
          );
          
          console.log(`Day ${schedule.day} missed popular places: ${dayMissedPopularPlaces.length}`);
          
          // Create daily itinerary
          const dailyItinerary: DailyItinerary = {
            day: schedule.day,
            date: schedule.date,
            startTime: schedule.startTime,
            availableHours: schedule.availableHours,
            places: scheduledPlaces,
            visitingTime: dayTimeMetrics.visitingTime,
            travelTime: dayTimeMetrics.travelTime,
            totalDuration: dayTimeMetrics.totalDuration,
            travelBreakdown: dayTimeMetrics.breakdown,
            route: {
              waypoints: scheduledPlaces.map(place => {
                const coords = this.getPlaceCoordinates(place);
                return {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  name: place.name
                };
              }),
              optimizedOrder: scheduledPlaces.map((_, index) => index)
            },
            schedule: daySchedule,
            uncoveredInterests: dayUncoveredInterests,
            optimizationNotes: this.generatePreciseOptimizationNotes(scheduledPlaces, dayTimeMetrics, dayFormData),
            missedPopularPlaces: dayMissedPopularPlaces
          };
          
          dailyItineraries.push(dailyItinerary);
          totalPlaces += scheduledPlaces.length;
          totalVisitingTime += dayTimeMetrics.visitingTime;
          totalTravelTime += dayTimeMetrics.travelTime;
          totalDuration += dayTimeMetrics.totalDuration;
        }
      }
      
      // Step 8: Create multi-day summary
      const summary = {
        placesPerDay: dailyItineraries.map(day => day.places.length),
        timeUtilization: dailyItineraries.map(day => (day.visitingTime / (day.availableHours * 60)) * 100),
        highlights: this.generateMultiDayHighlights(dailyItineraries)
      };
      
      return {
        dailyItineraries,
        totalDays: formData.numberOfDays,
        totalPlaces,
        totalVisitingTime,
        totalTravelTime,
        totalDuration,
        overallUncoveredInterests: Array.from(overallUncoveredInterests),
        summary
      };
      
    } catch (error) {
      console.error('Error generating multi-day itinerary:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error information
      if (error.message.includes('Travel time calculation failed')) {
        throw new Error(`Travel time calculation issue: ${error.message}`);
      } else if (error.message.includes('No places open')) {
        throw new Error('No places are open on the selected dates. Please try different dates or interests.');
      } else if (error.message.includes('coordinates')) {
        throw new Error('Location coordinate issue. Please check your starting address.');
      } else {
        throw new Error(`Multi-day itinerary generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate uniform daily schedules when user selects uniform mode
   * Uses timezone-safe date arithmetic
   */
  private generateUniformDailySchedules(formData: ItineraryFormData): DailySchedule[] {
    console.log(`\n🗓️  GENERATING DAILY SCHEDULES (TIMEZONE-SAFE)`);
    console.log(`🔍 Base date: "${formData.date}"`);
    console.log(`🔍 Number of days: ${formData.numberOfDays}`);
    
    const schedules: DailySchedule[] = [];
    
    // Parse base date components safely
    const [baseYear, baseMonth, baseDay] = formData.date.split('-').map(Number);
    console.log(`🔍 Parsed base date: Year=${baseYear}, Month=${baseMonth}, Day=${baseDay}`);
    
    for (let i = 0; i < formData.numberOfDays; i++) {
      // Create date in local time to avoid timezone issues
      const date = new Date(baseYear, baseMonth - 1, baseDay + i); // month is 0-indexed
      
      // Format back to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const dayOfWeek = this.getDayOfWeekSafe(dateString);
      
      console.log(`🔍 Day ${i + 1}: Base + ${i} days`);
      console.log(`🔍 Result date: ${dateString} (${dayOfWeek})`);
      
      schedules.push({
        day: i + 1,
        date: dateString,
        startTime: formData.startTime,
        availableHours: formData.availableHours
      });
    }
    
    console.log(`✅ Generated schedules with correct days:`, schedules);
    return schedules;
  }

    /**
   * Intelligently distribute places across multiple days using smart geographic clustering
   * CRITICAL: This is where we check if each place is open on each specific day's date
   */
  private distributePlacesAcrossDays(places: PlaceRecommendation[], dailySchedules: DailySchedule[]): PlaceRecommendation[][] {
    console.log('\n=== SMART GEOGRAPHIC CLUSTERING DISTRIBUTION ===');
    
    // Step 1: Create geographic clusters of nearby places
    const clusters = this.createGeographicClusters(places);
    console.log(`📍 Created ${clusters.length} geographic clusters`);
    
    // Step 2: Sort clusters by overall priority (highest cluster priority first)
    const sortedClusters = this.sortClustersByPriority(clusters);
    
    // Step 3: Distribute clusters across days while keeping cluster members together
    const distribution: PlaceRecommendation[][] = dailySchedules.map(() => []);
    
    for (const cluster of sortedClusters) {
      console.log(`\n🏗️  Processing cluster: ${cluster.name} (${cluster.places.length} places, priority: ${cluster.priority.toFixed(1)})`);
      
      // Find the best day for this entire cluster
      const bestDayIndex = this.findBestDayForCluster(cluster, dailySchedules, distribution);
      
      if (bestDayIndex !== -1) {
        // Add all places in the cluster to the same day
        distribution[bestDayIndex].push(...cluster.places);
        console.log(`  ✅ Cluster assigned to Day ${dailySchedules[bestDayIndex].day}`);
        cluster.places.forEach(place => {
          const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
          console.log(`    - ${place.name} (${reviewCount.toLocaleString()} reviews)`);
        });
      } else {
        console.log(`  ❌ Cluster could not fit in any day - will be handled by fallback distribution`);
        // Fallback: distribute cluster members individually
        this.distributeClusterFallback(cluster, dailySchedules, distribution);
      }
    }
    
    console.log('\n=== CLUSTER DISTRIBUTION SUMMARY ===');
    distribution.forEach((dayPlaces, index) => {
      const schedule = dailySchedules[index];
      console.log(`Day ${schedule.day} (${schedule.date}): ${dayPlaces.length} places`);
      
      // Group places by clusters for better visualization
      const clusterGroups = this.groupPlacesByClusters(dayPlaces, clusters);
      clusterGroups.forEach((clusterPlaces, clusterName) => {
        console.log(`  📍 Cluster: ${clusterName} (${clusterPlaces.length} places)`);
        clusterPlaces.forEach(place => {
          const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
          console.log(`    - ${place.name} (${reviewCount.toLocaleString()} reviews)`);
        });
      });
    });
    console.log('=====================================\n');
    
    return distribution;
  }

  /**
   * Create geographic clusters of nearby places
   */
  /**
   * STATE-OF-THE-ART GEOGRAPHIC CLUSTERING ALGORITHM
   * Implements DBSCAN-inspired adaptive clustering with intelligent parameters
   */
  private createGeographicClusters(places: PlaceRecommendation[]): Array<{
    name: string;
    places: PlaceRecommendation[];
    center: { latitude: number; longitude: number };
    priority: number;
    totalTime: number;
    optimalRoute?: PlaceRecommendation[]; // TSP-optimized route within cluster
    clusterType: 'dense' | 'sparse' | 'single';
    avgDistance: number;
    convexHull?: Array<{ latitude: number; longitude: number }>; // Cluster boundary
    density: number; // Places per square km
  }> {
    const clusters: Array<{
      name: string;
      places: PlaceRecommendation[];
      center: { latitude: number; longitude: number };
      priority: number;
      totalTime: number;
      optimalRoute?: PlaceRecommendation[];
      clusterType: 'dense' | 'sparse' | 'single';
      avgDistance: number;
      convexHull?: Array<{ latitude: number; longitude: number }>;
      density: number;
    }> = [];
    
    // STEP 1: Build distance matrix for all places
    const distanceMatrix = this.buildDistanceMatrix(places);
    
    // STEP 2: Apply DBSCAN-like clustering with adaptive parameters
    const dbscanClusters = this.performDBSCANClustering(places, distanceMatrix);
    
    // STEP 3: Process each cluster
    for (const clusterPlaces of dbscanClusters) {
      // STEP 3.1: Optimize route within cluster using TSP solver
      const optimalRoute = this.solveTSPWithinCluster(clusterPlaces, distanceMatrix);
      
      // STEP 3.2: Calculate cluster properties
      const center = this.calculateClusterCenter(clusterPlaces);
      const priority = this.calculateEnhancedClusterPriority(clusterPlaces);
      const totalTime = this.calculateClusterTimeWithTransitions(optimalRoute);
      const avgDistance = this.calculateAverageIntraClusterDistance(clusterPlaces, distanceMatrix);
      
      // STEP 3.3: Calculate convex hull for cluster boundary
      const convexHull = this.calculateConvexHull(clusterPlaces);
      
      // STEP 3.4: Calculate cluster density
      const density = this.calculateClusterDensity(clusterPlaces, convexHull);
      
      // STEP 3.5: Determine cluster type based on density and distance
      const clusterType = this.determineClusterType(clusterPlaces, avgDistance, density);
      
      // STEP 3.6: Generate intelligent cluster name
      const clusterName = this.generateSmartClusterName(clusterPlaces, clusterType);
      
      clusters.push({
        name: clusterName,
        places: optimalRoute, // Use TSP-optimized order
        center,
        priority,
        totalTime,
        optimalRoute,
        clusterType,
        avgDistance,
        convexHull,
        density
      });
    }
    
    // STEP 4: Sort clusters by inter-cluster optimal path
    const sortedClusters = this.optimizeInterClusterOrder(clusters);
    
    console.log(`🌟 Advanced Clustering Complete: ${places.length} places → ${sortedClusters.length} optimized clusters`);
    sortedClusters.forEach((cluster, i) => {
      console.log(`  Cluster ${i + 1} (${cluster.clusterType}): ${cluster.name}`);
      console.log(`    → ${cluster.places.length} places, ${(cluster.totalTime / 60).toFixed(1)}h total, priority: ${cluster.priority.toFixed(1)}`);
      console.log(`    → Avg intra-cluster distance: ${cluster.avgDistance.toFixed(2)}km, density: ${cluster.density.toFixed(1)} places/km²`);
    });
    
    return sortedClusters;
  }
  
  /**
   * Build distance matrix for all places
   */
  private buildDistanceMatrix(places: PlaceRecommendation[]): number[][] {
    const n = places.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateDistance(
          places[i].coordinates.latitude,
          places[i].coordinates.longitude,
          places[j].coordinates.latitude,
          places[j].coordinates.longitude
        );
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }
    
    return matrix;
  }
  
  /**
   * Enhanced DBSCAN clustering with adaptive parameters and hierarchical clustering
   */
  private performDBSCANClustering(
    places: PlaceRecommendation[], 
    distanceMatrix: number[][]
  ): PlaceRecommendation[][] {
    // Calculate adaptive parameters based on place distribution
    const stats = this.calculateDistanceStatistics(distanceMatrix);
    
    // Use median distance for more robust parameter estimation
    const eps = Math.min(2.0, stats.median * 0.8); // Adaptive radius based on median
    const minPts = Math.max(2, Math.floor(Math.sqrt(places.length) / 3)); // Dynamic minPts
    
    console.log(`🔬 Enhanced DBSCAN Parameters:`);
    console.log(`  eps=${eps.toFixed(2)}km (median dist: ${stats.median.toFixed(2)}km)`);
    console.log(`  minPts=${minPts} (for ${places.length} places)`);
    console.log(`  Distance stats: min=${stats.min.toFixed(2)}km, max=${stats.max.toFixed(2)}km`);
    
    const clusters: PlaceRecommendation[][] = [];
    const visited = new Set<number>();
    const clustered = new Set<number>();
    
    // Phase 1: Core point detection and clustering
    const corePoints: number[] = [];
    for (let i = 0; i < places.length; i++) {
      const neighbors = this.getNeighbors(i, places, distanceMatrix, eps);
      if (neighbors.length >= minPts) {
        corePoints.push(i);
      }
    }
    
    console.log(`  Found ${corePoints.length} core points out of ${places.length} places`);
    
    // Phase 2: Expand clusters from core points
    for (const coreIdx of corePoints) {
      if (clustered.has(coreIdx)) continue;
      
      const cluster: PlaceRecommendation[] = [];
      const queue = [coreIdx];
      const clusterIndices = new Set<number>();
      
      while (queue.length > 0) {
        const pointIdx = queue.shift()!;
        if (clusterIndices.has(pointIdx)) continue;
        
        clusterIndices.add(pointIdx);
        clustered.add(pointIdx);
        cluster.push(places[pointIdx]);
        
        const neighbors = this.getNeighbors(pointIdx, places, distanceMatrix, eps);
        
        // Add density-reachable points
        for (const neighborIdx of neighbors) {
          if (!clusterIndices.has(neighborIdx)) {
            // Check if neighbor is core point or border point
            const neighborNeighbors = this.getNeighbors(neighborIdx, places, distanceMatrix, eps);
            if (neighborNeighbors.length >= minPts || corePoints.includes(pointIdx)) {
              queue.push(neighborIdx);
            }
          }
        }
      }
      
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
    
    // Phase 3: Handle non-clustered points (noise/outliers)
    for (let i = 0; i < places.length; i++) {
      if (!clustered.has(i)) {
        // Try to assign to nearest cluster if within 1.5 * eps
        let nearestClusterIdx = -1;
        let minDistToCluster = 1.5 * eps;
        
        for (let c = 0; c < clusters.length; c++) {
          for (const clusterPlace of clusters[c]) {
            const clusterPlaceIdx = places.indexOf(clusterPlace);
            const dist = distanceMatrix[i][clusterPlaceIdx];
            if (dist < minDistToCluster) {
              minDistToCluster = dist;
              nearestClusterIdx = c;
            }
          }
        }
        
        if (nearestClusterIdx >= 0) {
          clusters[nearestClusterIdx].push(places[i]);
          console.log(`  Assigned outlier ${places[i].name} to nearest cluster`);
        } else {
          // Create single-point cluster for true outliers
          clusters.push([places[i]]);
          console.log(`  Created single-point cluster for outlier: ${places[i].name}`);
        }
      }
    }
    
    console.log(`  Final: ${clusters.length} clusters formed`);
    return clusters;
  }
  
  /**
   * Get neighbors within epsilon distance
   */
  private getNeighbors(
    pointIdx: number,
    places: PlaceRecommendation[],
    distanceMatrix: number[][],
    eps: number
  ): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < places.length; i++) {
      if (i !== pointIdx && distanceMatrix[pointIdx][i] <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }
  
  /**
   * Advanced TSP solver using multiple heuristics with hybrid optimization
   */
  private solveTSPWithinCluster(
    places: PlaceRecommendation[],
    globalDistanceMatrix: number[][]
  ): PlaceRecommendation[] {
    if (places.length <= 2) return places;
    if (places.length === 3) {
      // For 3 places, just ensure we start with the most popular
      return this.orderByPopularityAndDistance(places);
    }
    
    // For larger clusters, use advanced algorithms
    const routes: { route: PlaceRecommendation[]; cost: number }[] = [];
    
    // Strategy 1: Christofides algorithm approximation
    const christofidesRoute = this.christofidesAlgorithm(places);
    routes.push({
      route: christofidesRoute,
      cost: this.calculateRouteCost(christofidesRoute)
    });
    
    // Strategy 2: Nearest neighbor from best starting point
    const nnRoute = this.nearestNeighborWithBestStart(places);
    routes.push({
      route: nnRoute,
      cost: this.calculateRouteCost(nnRoute)
    });
    
    // Strategy 3: Savings algorithm (Clarke-Wright)
    if (places.length <= 8) {
      const savingsRoute = this.savingsAlgorithm(places);
      routes.push({
        route: savingsRoute,
        cost: this.calculateRouteCost(savingsRoute)
      });
    }
    
    // Select best initial route
    let bestRoute = routes.reduce((best, current) => 
      current.cost < best.cost ? current : best
    ).route;
    
    // Apply multiple improvement heuristics
    bestRoute = this.apply2OptImprovement(bestRoute);
    
    if (places.length <= 10) {
      // For small clusters, also try 3-opt
      bestRoute = this.apply3OptImprovement(bestRoute);
    }
    
    // Apply Or-opt for final refinement
    bestRoute = this.applyOrOptImprovement(bestRoute);
    
    console.log(`  TSP optimization: ${places.length} places, final cost: ${this.calculateRouteCost(bestRoute).toFixed(2)}km`);
    
    return bestRoute;
  }
  
  /**
   * Order places by popularity with distance consideration
   */
  private orderByPopularityAndDistance(places: PlaceRecommendation[]): PlaceRecommendation[] {
    const sorted = [...places].sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      return reviewsB - reviewsA;
    });
    return sorted;
  }
  
  /**
   * Christofides algorithm for TSP (1.5-approximation)
   */
  private christofidesAlgorithm(places: PlaceRecommendation[]): PlaceRecommendation[] {
    // Simplified version - use MST + nearest neighbor
    const mst = this.primMST(places);
    const route: PlaceRecommendation[] = [];
    const visited = new Set<string>();
    
    // DFS traversal of MST to create route
    const dfs = (place: PlaceRecommendation) => {
      route.push(place);
      visited.add(place.place_id);
      
      const neighbors = mst.get(place.place_id) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.place_id)) {
          dfs(neighbor);
        }
      }
    };
    
    // Start from most popular place
    const startPlace = places.reduce((best, current) => {
      const bestReviews = DataService.extractReviewCount(best.user_ratings_total?.toString() || '0');
      const currentReviews = DataService.extractReviewCount(current.user_ratings_total?.toString() || '0');
      return currentReviews > bestReviews ? current : best;
    });
    
    dfs(startPlace);
    return route;
  }
  
  /**
   * Prim's algorithm for Minimum Spanning Tree
   */
  private primMST(places: PlaceRecommendation[]): Map<string, PlaceRecommendation[]> {
    const mst = new Map<string, PlaceRecommendation[]>();
    const visited = new Set<string>();
    const edges: Array<{ from: PlaceRecommendation; to: PlaceRecommendation; weight: number }> = [];
    
    // Initialize with first place
    visited.add(places[0].place_id);
    mst.set(places[0].place_id, []);
    
    // Add all edges from first place
    for (let i = 1; i < places.length; i++) {
      edges.push({
        from: places[0],
        to: places[i],
        weight: this.calculateDistance(
          places[0].coordinates.latitude,
          places[0].coordinates.longitude,
          places[i].coordinates.latitude,
          places[i].coordinates.longitude
        )
      });
    }
    
    while (visited.size < places.length) {
      // Sort edges by weight
      edges.sort((a, b) => a.weight - b.weight);
      
      // Find minimum edge that connects to unvisited node
      let minEdge = null;
      for (const edge of edges) {
        if (visited.has(edge.from.place_id) && !visited.has(edge.to.place_id)) {
          minEdge = edge;
          break;
        }
      }
      
      if (!minEdge) break;
      
      // Add to MST
      visited.add(minEdge.to.place_id);
      if (!mst.has(minEdge.from.place_id)) {
        mst.set(minEdge.from.place_id, []);
      }
      mst.get(minEdge.from.place_id)!.push(minEdge.to);
      
      if (!mst.has(minEdge.to.place_id)) {
        mst.set(minEdge.to.place_id, []);
      }
      
      // Add new edges from newly visited node
      for (const place of places) {
        if (!visited.has(place.place_id)) {
          edges.push({
            from: minEdge.to,
            to: place,
            weight: this.calculateDistance(
              minEdge.to.coordinates.latitude,
              minEdge.to.coordinates.longitude,
              place.coordinates.latitude,
              place.coordinates.longitude
            )
          });
        }
      }
    }
    
    return mst;
  }
  
  /**
   * Nearest neighbor with best starting point selection
   */
  private nearestNeighborWithBestStart(places: PlaceRecommendation[]): PlaceRecommendation[] {
    // Try starting from different points and pick best
    const candidateStarts = places
      .map(p => ({ 
        place: p, 
        reviews: DataService.extractReviewCount(p.user_ratings_total?.toString() || '0')
      }))
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, Math.min(3, places.length)) // Try top 3 most popular
      .map(item => item.place);
    
    let bestRoute: PlaceRecommendation[] = [];
    let bestCost = Infinity;
    
    for (const startPlace of candidateStarts) {
      const route: PlaceRecommendation[] = [startPlace];
      const unvisited = places.filter(p => p.place_id !== startPlace.place_id);
      
      while (unvisited.length > 0) {
        const lastPlace = route[route.length - 1];
        let nearestPlace = unvisited[0];
        let minDistance = Infinity;
        
        for (const place of unvisited) {
          const distance = this.calculateDistance(
            lastPlace.coordinates.latitude,
            lastPlace.coordinates.longitude,
            place.coordinates.latitude,
            place.coordinates.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestPlace = place;
          }
        }
        
        route.push(nearestPlace);
        unvisited.splice(unvisited.indexOf(nearestPlace), 1);
      }
      
      const cost = this.calculateRouteCost(route);
      if (cost < bestCost) {
        bestCost = cost;
        bestRoute = route;
      }
    }
    
    return bestRoute;
  }
  
  /**
   * Clarke-Wright Savings Algorithm
   */
  private savingsAlgorithm(places: PlaceRecommendation[]): PlaceRecommendation[] {
    if (places.length <= 2) return places;
    
    // Calculate savings for merging routes
    const savings: Array<{ i: number; j: number; saving: number }> = [];
    
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const d_ij = this.calculateDistance(
          places[i].coordinates.latitude,
          places[i].coordinates.longitude,
          places[j].coordinates.latitude,
          places[j].coordinates.longitude
        );
        
        // Saving = visiting i then j directly vs visiting each separately
        const saving = d_ij;
        savings.push({ i, j, saving });
      }
    }
    
    // Sort by savings descending
    savings.sort((a, b) => b.saving - a.saving);
    
    // Build route by merging based on savings
    const routes: number[][] = places.map((_, i) => [i]);
    
    for (const { i, j, saving } of savings) {
      // Find routes containing i and j
      let routeI = -1, routeJ = -1;
      for (let r = 0; r < routes.length; r++) {
        if (routes[r].includes(i)) routeI = r;
        if (routes[r].includes(j)) routeJ = r;
      }
      
      // Merge if in different routes and at ends
      if (routeI !== routeJ && routeI >= 0 && routeJ >= 0) {
        const canMerge = 
          (routes[routeI][0] === i || routes[routeI][routes[routeI].length - 1] === i) &&
          (routes[routeJ][0] === j || routes[routeJ][routes[routeJ].length - 1] === j);
        
        if (canMerge) {
          // Merge routes
          if (routes[routeI][routes[routeI].length - 1] === i && routes[routeJ][0] === j) {
            routes[routeI].push(...routes[routeJ]);
          } else if (routes[routeI][0] === i && routes[routeJ][routes[routeJ].length - 1] === j) {
            routes[routeI].unshift(...routes[routeJ]);
          } else if (routes[routeI][routes[routeI].length - 1] === i && routes[routeJ][routes[routeJ].length - 1] === j) {
            routes[routeI].push(...routes[routeJ].reverse());
          } else if (routes[routeI][0] === i && routes[routeJ][0] === j) {
            routes[routeI].unshift(...routes[routeJ].reverse());
          }
          
          // Remove merged route
          routes.splice(routeJ, 1);
          
          if (routes.length === 1) break;
        }
      }
    }
    
    // Convert back to places
    const finalRoute = routes[0] || [];
    return finalRoute.map(i => places[i]);
  }
  
  /**
   * Calculate total route cost (distance)
   */
  private calculateRouteCost(route: PlaceRecommendation[]): number {
    let cost = 0;
    for (let i = 0; i < route.length - 1; i++) {
      cost += this.calculateDistance(
        route[i].coordinates.latitude,
        route[i].coordinates.longitude,
        route[i + 1].coordinates.latitude,
        route[i + 1].coordinates.longitude
      );
    }
    return cost;
  }
  
  /**
   * Enhanced 2-opt improvement with early termination
   */
  private apply2OptImprovement(route: PlaceRecommendation[]): PlaceRecommendation[] {
    let improved = true;
    let bestRoute = [...route];
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 1; i < bestRoute.length - 2; i++) {
        for (let j = i + 1; j < bestRoute.length; j++) {
          if (j - i === 1) continue; // Skip adjacent edges
          
          // Calculate current distance
          const currentDistance = 
            this.calculateDistance(
              bestRoute[i - 1].coordinates.latitude,
              bestRoute[i - 1].coordinates.longitude,
              bestRoute[i].coordinates.latitude,
              bestRoute[i].coordinates.longitude
            ) +
            this.calculateDistance(
              bestRoute[j - 1].coordinates.latitude,
              bestRoute[j - 1].coordinates.longitude,
              bestRoute[j % bestRoute.length].coordinates.latitude,
              bestRoute[j % bestRoute.length].coordinates.longitude
            );
          
          // Calculate swapped distance
          const swappedDistance = 
            this.calculateDistance(
              bestRoute[i - 1].coordinates.latitude,
              bestRoute[i - 1].coordinates.longitude,
              bestRoute[j - 1].coordinates.latitude,
              bestRoute[j - 1].coordinates.longitude
            ) +
            this.calculateDistance(
              bestRoute[i].coordinates.latitude,
              bestRoute[i].coordinates.longitude,
              bestRoute[j % bestRoute.length].coordinates.latitude,
              bestRoute[j % bestRoute.length].coordinates.longitude
            );
          
          // Check for improvement
          const improvement = currentDistance - swappedDistance;
          if (improvement > 0.001) { // Small threshold to avoid floating point issues
            // Perform 2-opt swap
            const newRoute = [
              ...bestRoute.slice(0, i),
              ...bestRoute.slice(i, j).reverse(),
              ...bestRoute.slice(j)
            ];
            bestRoute = newRoute;
            improved = true;
            break; // Restart from beginning after improvement
          }
        }
        if (improved) break;
      }
    }
    
    return bestRoute;
  }
  
  /**
   * 3-opt improvement for more complex route optimization
   */
  private apply3OptImprovement(route: PlaceRecommendation[]): PlaceRecommendation[] {
    const n = route.length;
    if (n < 6) return route; // Need at least 6 nodes for 3-opt
    
    let bestRoute = [...route];
    let bestCost = this.calculateRouteCost(bestRoute);
    let improved = true;
    let iterations = 0;
    const maxIterations = 50; // Limit iterations for performance
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 0; i < n - 5; i++) {
        for (let j = i + 2; j < n - 3; j++) {
          for (let k = j + 2; k < n - 1; k++) {
            // Generate all 7 possible 3-opt moves
            const moves = this.generate3OptMoves(bestRoute, i, j, k);
            
            for (const move of moves) {
              const moveCost = this.calculateRouteCost(move);
              if (moveCost < bestCost - 0.001) {
                bestRoute = move;
                bestCost = moveCost;
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
    }
    
    return bestRoute;
  }
  
  /**
   * Generate all possible 3-opt moves
   */
  private generate3OptMoves(
    route: PlaceRecommendation[],
    i: number,
    j: number,
    k: number
  ): PlaceRecommendation[][] {
    const moves: PlaceRecommendation[][] = [];
    const n = route.length;
    
    // Segment the route
    const seg1 = route.slice(0, i + 1);
    const seg2 = route.slice(i + 1, j + 1);
    const seg3 = route.slice(j + 1, k + 1);
    const seg4 = route.slice(k + 1);
    
    // Case 1: Reverse segment 2
    moves.push([...seg1, ...seg2.reverse(), ...seg3, ...seg4]);
    
    // Case 2: Reverse segment 3
    moves.push([...seg1, ...seg2, ...seg3.reverse(), ...seg4]);
    
    // Case 3: Reverse segments 2 and 3
    moves.push([...seg1, ...seg2.reverse(), ...seg3.reverse(), ...seg4]);
    
    // Case 4: Swap segments 2 and 3
    moves.push([...seg1, ...seg3, ...seg2, ...seg4]);
    
    // Case 5: Swap and reverse segment 2
    moves.push([...seg1, ...seg3, ...seg2.reverse(), ...seg4]);
    
    // Case 6: Swap and reverse segment 3
    moves.push([...seg1, ...seg3.reverse(), ...seg2, ...seg4]);
    
    // Case 7: Swap and reverse both
    moves.push([...seg1, ...seg3.reverse(), ...seg2.reverse(), ...seg4]);
    
    return moves;
  }
  
  /**
   * Or-opt improvement (move sequences of 1-3 nodes)
   */
  private applyOrOptImprovement(route: PlaceRecommendation[]): PlaceRecommendation[] {
    let bestRoute = [...route];
    let bestCost = this.calculateRouteCost(bestRoute);
    let improved = true;
    
    while (improved) {
      improved = false;
      
      // Try moving sequences of 1, 2, or 3 consecutive nodes
      for (let seqLen = 1; seqLen <= Math.min(3, route.length - 2); seqLen++) {
        for (let i = 0; i < route.length - seqLen; i++) {
          // Extract sequence
          const sequence = bestRoute.slice(i, i + seqLen);
          const routeWithoutSeq = [
            ...bestRoute.slice(0, i),
            ...bestRoute.slice(i + seqLen)
          ];
          
          // Try inserting at each possible position
          for (let j = 0; j <= routeWithoutSeq.length; j++) {
            if (Math.abs(j - i) < 2) continue; // Skip nearby positions
            
            const newRoute = [
              ...routeWithoutSeq.slice(0, j),
              ...sequence,
              ...routeWithoutSeq.slice(j)
            ];
            
            const newCost = this.calculateRouteCost(newRoute);
            if (newCost < bestCost - 0.001) {
              bestRoute = newRoute;
              bestCost = newCost;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
    }
    
    return bestRoute;
  }
  
  /**
   * Calculate comprehensive distance statistics for adaptive clustering
   */
  private calculateDistanceStatistics(matrix: number[][]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  } {
    const distances: number[] = [];
    
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        distances.push(matrix[i][j]);
      }
    }
    
    if (distances.length === 0) {
      return { min: 0, max: 10, mean: 5, median: 5, stdDev: 2 };
    }
    
    distances.sort((a, b) => a - b);
    
    const min = distances[0];
    const max = distances[distances.length - 1];
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const median = distances[Math.floor(distances.length / 2)];
    
    // Calculate standard deviation
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    return { min, max, mean, median, stdDev };
  }
  
  /**
   * Calculate enhanced cluster priority
   */
  private calculateEnhancedClusterPriority(places: PlaceRecommendation[]): number {
    let priority = 0;
    
    for (const place of places) {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      const rating = DataService.extractRating(place.rating);
      
      // Weighted priority calculation
      priority += (reviewCount / 1000) * 2; // Review count weight
      priority += rating * 10; // Rating weight
      priority += place.matchScore * 5; // Interest match weight
    }
    
    // Bonus for cluster cohesion
    if (places.length > 1) {
      priority *= (1 + 0.1 * Math.min(places.length - 1, 3)); // Up to 30% bonus for clusters
    }
    
    return priority;
  }
  
  /**
   * Calculate total time including transitions
   */
  private calculateClusterTimeWithTransitions(route: PlaceRecommendation[]): number {
    let totalTime = 0;
    
    for (let i = 0; i < route.length; i++) {
      totalTime += route[i].estimatedVisitDuration || 60;
      
      // Add transition time between places (walking time)
      if (i < route.length - 1) {
        const distance = this.calculateDistance(
          route[i].coordinates.latitude,
          route[i].coordinates.longitude,
          route[i + 1].coordinates.latitude,
          route[i + 1].coordinates.longitude
        );
        const walkingTime = Math.round(distance * 12); // ~5km/h walking speed
        totalTime += Math.min(walkingTime, 15); // Cap at 15 minutes
      }
    }
    
    return totalTime;
  }
  
  /**
   * Calculate average intra-cluster distance
   */
  private calculateAverageIntraClusterDistance(
    places: PlaceRecommendation[],
    distanceMatrix: number[][]
  ): number {
    if (places.length <= 1) return 0;
    
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const distance = this.calculateDistance(
          places[i].coordinates.latitude,
          places[i].coordinates.longitude,
          places[j].coordinates.latitude,
          places[j].coordinates.longitude
        );
        sum += distance;
        count++;
      }
    }
    
    return count > 0 ? sum / count : 0;
  }
  
  /**
   * Determine cluster type based on density and spatial distribution
   */
  private determineClusterType(
    places: PlaceRecommendation[],
    avgDistance: number,
    density: number
  ): 'dense' | 'sparse' | 'single' {
    if (places.length === 1) return 'single';
    
    // Multi-factor classification
    if (density > 10 && avgDistance < 0.5) return 'dense'; // High density, very close
    if (density > 5 || avgDistance < 0.8) return 'dense'; // Either high density or close proximity
    if (density < 2 || avgDistance > 2.0) return 'sparse'; // Low density or spread out
    
    return avgDistance < 1.5 ? 'dense' : 'sparse'; // Default based on distance
  }
  
  /**
   * Generate smart cluster name
   */
  private generateSmartClusterName(
    places: PlaceRecommendation[],
    clusterType: 'dense' | 'sparse' | 'single'
  ): string {
    if (places.length === 1) {
      return places[0].name;
    }
    
    // Sort by popularity
    const sortedByPopularity = [...places].sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      return reviewsB - reviewsA;
    });
    
    const mainAttraction = sortedByPopularity[0];
    
    if (clusterType === 'dense') {
      // For dense clusters, mention it's a concentrated area
      return `${mainAttraction.name} Area (${places.length} attractions)`;
    } else {
      // For sparse clusters, list top 2 attractions
      if (sortedByPopularity.length >= 2) {
        return `${mainAttraction.name} & ${sortedByPopularity[1].name} + ${places.length - 2} more`;
      }
      return `${mainAttraction.name} + ${places.length - 1} nearby`;
    }
  }
  
  /**
   * Calculate convex hull for cluster boundary using Graham's scan algorithm
   */
  private calculateConvexHull(places: PlaceRecommendation[]): Array<{ latitude: number; longitude: number }> {
    if (places.length < 3) {
      // Not enough points for a hull, return all points
      return places.map(p => ({
        latitude: p.coordinates.latitude,
        longitude: p.coordinates.longitude
      }));
    }
    
    // Convert to points array
    const points = places.map(p => ({
      lat: p.coordinates.latitude,
      lng: p.coordinates.longitude
    }));
    
    // Find the point with lowest y-coordinate (or leftmost if tie)
    const start = points.reduce((lowest, point) => {
      if (point.lat < lowest.lat || (point.lat === lowest.lat && point.lng < lowest.lng)) {
        return point;
      }
      return lowest;
    });
    
    // Sort points by polar angle with respect to start point
    const sorted = points.filter(p => p !== start).sort((a, b) => {
      const angleA = Math.atan2(a.lat - start.lat, a.lng - start.lng);
      const angleB = Math.atan2(b.lat - start.lat, b.lng - start.lng);
      if (angleA !== angleB) return angleA - angleB;
      // If same angle, closer point comes first
      const distA = Math.sqrt(Math.pow(a.lat - start.lat, 2) + Math.pow(a.lng - start.lng, 2));
      const distB = Math.sqrt(Math.pow(b.lat - start.lat, 2) + Math.pow(b.lng - start.lng, 2));
      return distA - distB;
    });
    
    // Graham's scan
    const hull = [start];
    
    for (const point of sorted) {
      // Remove points that make clockwise turn
      while (hull.length > 1) {
        const p1 = hull[hull.length - 2];
        const p2 = hull[hull.length - 1];
        const cross = (p2.lng - p1.lng) * (point.lat - p1.lat) - (p2.lat - p1.lat) * (point.lng - p1.lng);
        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      hull.push(point);
    }
    
    return hull.map(p => ({
      latitude: p.lat,
      longitude: p.lng
    }));
  }
  
  /**
   * Calculate cluster density (places per square kilometer)
   */
  private calculateClusterDensity(
    places: PlaceRecommendation[],
    convexHull: Array<{ latitude: number; longitude: number }>
  ): number {
    if (places.length <= 1 || convexHull.length < 3) {
      return places.length; // Default density for single points
    }
    
    // Calculate area of convex hull using Shoelace formula
    let area = 0;
    for (let i = 0; i < convexHull.length; i++) {
      const j = (i + 1) % convexHull.length;
      const p1 = convexHull[i];
      const p2 = convexHull[j];
      
      // Convert to projected coordinates for area calculation
      // Using simple equirectangular projection
      const lat1Rad = p1.latitude * Math.PI / 180;
      const lat2Rad = p2.latitude * Math.PI / 180;
      const lng1Rad = p1.longitude * Math.PI / 180;
      const lng2Rad = p2.longitude * Math.PI / 180;
      
      const x1 = lng1Rad * Math.cos((lat1Rad + lat2Rad) / 2) * 6371; // Earth radius in km
      const y1 = lat1Rad * 6371;
      const x2 = lng2Rad * Math.cos((lat1Rad + lat2Rad) / 2) * 6371;
      const y2 = lat2Rad * 6371;
      
      area += (x1 * y2 - x2 * y1);
    }
    
    area = Math.abs(area) / 2;
    
    // Prevent division by very small areas
    if (area < 0.01) {
      area = 0.01; // Minimum 10m x 10m area
    }
    
    return places.length / area;
  }
  
  /**
   * Advanced inter-cluster path optimization using multiple strategies
   */
  private optimizeInterClusterOrder(clusters: any[]): any[] {
    if (clusters.length <= 2) return clusters;
    if (clusters.length === 3) {
      // For 3 clusters, evaluate all 6 permutations
      return this.findBestClusterPermutation(clusters);
    }
    
    // For larger sets, use hybrid approach
    const strategies = [];
    
    // Strategy 1: Priority-first with distance optimization
    const priorityFirst = this.priorityBasedClusterOrdering(clusters);
    strategies.push({
      order: priorityFirst,
      score: this.evaluateClusterOrdering(priorityFirst)
    });
    
    // Strategy 2: Geographic sweep (angular sorting)
    const geographicSweep = this.geographicSweepOrdering(clusters);
    strategies.push({
      order: geographicSweep,
      score: this.evaluateClusterOrdering(geographicSweep)
    });
    
    // Strategy 3: Minimum spanning tree traversal
    const mstTraversal = this.mstBasedClusterOrdering(clusters);
    strategies.push({
      order: mstTraversal,
      score: this.evaluateClusterOrdering(mstTraversal)
    });
    
    // Strategy 4: Simulated annealing for global optimization (for up to 10 clusters)
    if (clusters.length <= 10) {
      const annealing = this.simulatedAnnealingClusterOrder(clusters);
      strategies.push({
        order: annealing,
        score: this.evaluateClusterOrdering(annealing)
      });
    }
    
    // Select best strategy
    const best = strategies.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    console.log(`  Inter-cluster optimization: ${clusters.length} clusters, best score: ${best.score.toFixed(2)}`);
    
    return best.order;
  }
  
  /**
   * Find best permutation for small cluster sets
   */
  private findBestClusterPermutation(clusters: any[]): any[] {
    const permutations = this.generatePermutations(clusters);
    let bestOrder = clusters;
    let bestScore = -Infinity;
    
    for (const perm of permutations) {
      const score = this.evaluateClusterOrdering(perm);
      if (score > bestScore) {
        bestScore = score;
        bestOrder = perm;
      }
    }
    
    return bestOrder;
  }
  
  /**
   * Generate all permutations of an array
   */
  private generatePermutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const subPerms = this.generatePermutations(remaining);
      
      for (const subPerm of subPerms) {
        result.push([current, ...subPerm]);
      }
    }
    
    return result;
  }
  
  /**
   * Priority-based cluster ordering with distance optimization
   */
  private priorityBasedClusterOrdering(clusters: any[]): any[] {
    // Sort by priority and select top cluster
    const sortedByPriority = [...clusters].sort((a, b) => b.priority - a.priority);
    const startCluster = sortedByPriority[0];
    
    const orderedClusters = [startCluster];
    const remaining = clusters.filter(c => c !== startCluster);
    
    // Build path considering both priority and distance
    while (remaining.length > 0) {
      const lastCluster = orderedClusters[orderedClusters.length - 1];
      let bestCluster = remaining[0];
      let bestScore = -Infinity;
      
      for (const cluster of remaining) {
        const distance = this.calculateDistance(
          lastCluster.center.latitude,
          lastCluster.center.longitude,
          cluster.center.latitude,
          cluster.center.longitude
        );
        
        // Weighted score: high priority and low distance are good
        const score = (cluster.priority / 100) - (distance * 0.5);
        
        if (score > bestScore) {
          bestScore = score;
          bestCluster = cluster;
        }
      }
      
      orderedClusters.push(bestCluster);
      remaining.splice(remaining.indexOf(bestCluster), 1);
    }
    
    return orderedClusters;
  }
  
  /**
   * Geographic sweep ordering (angular sorting from centroid)
   */
  private geographicSweepOrdering(clusters: any[]): any[] {
    // Calculate overall centroid
    const centroid = {
      lat: clusters.reduce((sum, c) => sum + c.center.latitude, 0) / clusters.length,
      lng: clusters.reduce((sum, c) => sum + c.center.longitude, 0) / clusters.length
    };
    
    // Sort clusters by angle from centroid
    const clustersWithAngle = clusters.map(cluster => ({
      cluster,
      angle: Math.atan2(
        cluster.center.latitude - centroid.lat,
        cluster.center.longitude - centroid.lng
      )
    }));
    
    clustersWithAngle.sort((a, b) => a.angle - b.angle);
    
    // Find best starting point (highest priority in first quadrant)
    let startIdx = 0;
    let maxPriority = -1;
    for (let i = 0; i < clustersWithAngle.length; i++) {
      if (clustersWithAngle[i].cluster.priority > maxPriority) {
        maxPriority = clustersWithAngle[i].cluster.priority;
        startIdx = i;
      }
    }
    
    // Reorder starting from best cluster
    const ordered = [
      ...clustersWithAngle.slice(startIdx),
      ...clustersWithAngle.slice(0, startIdx)
    ].map(item => item.cluster);
    
    return ordered;
  }
  
  /**
   * MST-based cluster ordering
   */
  private mstBasedClusterOrdering(clusters: any[]): any[] {
    // Build MST of cluster centers
    const edges: Array<{ from: number; to: number; weight: number }> = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = this.calculateDistance(
          clusters[i].center.latitude,
          clusters[i].center.longitude,
          clusters[j].center.latitude,
          clusters[j].center.longitude
        );
        edges.push({ from: i, to: j, weight: distance });
      }
    }
    
    // Kruskal's algorithm for MST
    edges.sort((a, b) => a.weight - b.weight);
    const parent = Array(clusters.length).fill(0).map((_, i) => i);
    
    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    
    const mstEdges: Array<{ from: number; to: number }> = [];
    for (const edge of edges) {
      const rootFrom = find(edge.from);
      const rootTo = find(edge.to);
      
      if (rootFrom !== rootTo) {
        parent[rootFrom] = rootTo;
        mstEdges.push({ from: edge.from, to: edge.to });
        
        if (mstEdges.length === clusters.length - 1) break;
      }
    }
    
    // Build adjacency list
    const adj: Map<number, number[]> = new Map();
    for (const edge of mstEdges) {
      if (!adj.has(edge.from)) adj.set(edge.from, []);
      if (!adj.has(edge.to)) adj.set(edge.to, []);
      adj.get(edge.from)!.push(edge.to);
      adj.get(edge.to)!.push(edge.from);
    }
    
    // DFS traversal starting from highest priority cluster
    const startIdx = clusters.reduce((bestIdx, cluster, idx) => 
      cluster.priority > clusters[bestIdx].priority ? idx : bestIdx, 0);
    
    const visited = new Set<number>();
    const ordered: any[] = [];
    
    const dfs = (idx: number) => {
      visited.add(idx);
      ordered.push(clusters[idx]);
      
      const neighbors = adj.get(idx) || [];
      // Visit neighbors in order of priority
      neighbors
        .filter(n => !visited.has(n))
        .sort((a, b) => clusters[b].priority - clusters[a].priority)
        .forEach(n => dfs(n));
    };
    
    dfs(startIdx);
    
    return ordered;
  }
  
  /**
   * Simulated annealing for global optimization
   */
  private simulatedAnnealingClusterOrder(clusters: any[]): any[] {
    let current = [...clusters];
    let currentScore = this.evaluateClusterOrdering(current);
    let best = [...current];
    let bestScore = currentScore;
    
    // Annealing parameters
    let temperature = 100;
    const coolingRate = 0.95;
    const minTemperature = 0.01;
    const maxIterations = 1000;
    let iteration = 0;
    
    while (temperature > minTemperature && iteration < maxIterations) {
      // Generate neighbor by swapping two random clusters
      const neighbor = [...current];
      const i = Math.floor(Math.random() * neighbor.length);
      const j = Math.floor(Math.random() * neighbor.length);
      [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];
      
      const neighborScore = this.evaluateClusterOrdering(neighbor);
      const delta = neighborScore - currentScore;
      
      // Accept or reject the neighbor
      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        current = neighbor;
        currentScore = neighborScore;
        
        if (currentScore > bestScore) {
          best = [...current];
          bestScore = currentScore;
        }
      }
      
      temperature *= coolingRate;
      iteration++;
    }
    
    return best;
  }
  
  /**
   * Evaluate the quality of a cluster ordering
   */
  private evaluateClusterOrdering(clusters: any[]): number {
    let score = 0;
    
    // Factor 1: Total travel distance (negative impact)
    let totalDistance = 0;
    for (let i = 0; i < clusters.length - 1; i++) {
      totalDistance += this.calculateDistance(
        clusters[i].center.latitude,
        clusters[i].center.longitude,
        clusters[i + 1].center.latitude,
        clusters[i + 1].center.longitude
      );
    }
    score -= totalDistance * 10; // Penalty for distance
    
    // Factor 2: Priority ordering (positive for high priority early)
    for (let i = 0; i < clusters.length; i++) {
      const positionWeight = (clusters.length - i) / clusters.length;
      score += clusters[i].priority * positionWeight * 2;
    }
    
    // Factor 3: Cluster density bonus (dense clusters together)
    for (let i = 0; i < clusters.length - 1; i++) {
      if (clusters[i].clusterType === 'dense' && clusters[i + 1].clusterType === 'dense') {
        score += 50; // Bonus for keeping dense clusters together
      }
    }
    
    // Factor 4: Time efficiency (avoid backtracking)
    const angles: number[] = [];
    for (let i = 0; i < clusters.length - 1; i++) {
      const angle = Math.atan2(
        clusters[i + 1].center.latitude - clusters[i].center.latitude,
        clusters[i + 1].center.longitude - clusters[i].center.longitude
      );
      angles.push(angle);
    }
    
    // Check for consistent direction (less zigzagging)
    let directionChanges = 0;
    for (let i = 0; i < angles.length - 1; i++) {
      const angleDiff = Math.abs(angles[i + 1] - angles[i]);
      if (angleDiff > Math.PI / 2) {
        directionChanges++;
      }
    }
    score -= directionChanges * 20; // Penalty for direction changes
    
    return score;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate the center point of a cluster
   */
  private calculateClusterCenter(places: PlaceRecommendation[]): { latitude: number; longitude: number } {
    const totalLat = places.reduce((sum, p) => sum + p.coordinates.latitude, 0);
    const totalLon = places.reduce((sum, p) => sum + p.coordinates.longitude, 0);
    return {
      latitude: totalLat / places.length,
      longitude: totalLon / places.length
    };
  }

  /**
   * Calculate cluster priority based on places within it
   */
  private calculateClusterPriority(places: PlaceRecommendation[]): number {
    let priority = 0;
    
    for (const place of places) {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      
      // Base priority from review count
      if (reviewCount >= 50000) priority += 1000; // Iconic places
      else if (reviewCount >= 20000) priority += 500; // Super popular
      else if (reviewCount >= 10000) priority += 200; // Very popular
      else if (reviewCount >= 5000) priority += 100; // Popular
      else if (reviewCount >= 1000) priority += 50; // Well-known
      
      // Bonus for tourist attractions
      if (place.types.some(type => type.includes('tourist_attraction'))) {
        priority += 50;
      }
      
      // Bonus for high match scores
      priority += (place.matchScore || 0) * 10;
    }
    
    // Bonus for cluster size (efficiency)
    priority += places.length * 20;
    
    return priority;
  }

  /**
   * Sort clusters by priority (highest first)
   */
  private sortClustersByPriority(clusters: Array<{
    name: string;
    places: PlaceRecommendation[];
    center: { latitude: number; longitude: number };
    priority: number;
    totalTime: number;
  }>): Array<{
    name: string;
    places: PlaceRecommendation[];
    center: { latitude: number; longitude: number };
    priority: number;
    totalTime: number;
  }> {
    return [...clusters].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find the best day for a cluster with advanced time-aware scheduling
   */
  private findBestDayForCluster(
    cluster: {
      name: string;
      places: PlaceRecommendation[];
      center: { latitude: number; longitude: number };
      priority: number;
      totalTime: number;
      clusterType?: 'dense' | 'sparse' | 'single';
      avgDistance?: number;
    },
    dailySchedules: DailySchedule[],
    distribution: PlaceRecommendation[][]
  ): number {
    let bestDayIndex = -1;
    let bestScore = -1;
    
    // Pre-calculate cluster metrics
    const clusterMetrics = this.calculateClusterMetrics(cluster);
    
    for (let i = 0; i < dailySchedules.length; i++) {
      const schedule = dailySchedules[i];
      const currentPlaces = distribution[i];
      
      // Multi-factor scoring for day assignment
      const dayScore = this.calculateDayAssignmentScore(
        cluster,
        clusterMetrics,
        schedule,
        currentPlaces,
        distribution,
        i
      );
      
      if (dayScore.isValid && dayScore.totalScore > bestScore) {
        bestScore = dayScore.totalScore;
        bestDayIndex = i;
        
        console.log(`    Day ${schedule.day} score: ${dayScore.totalScore.toFixed(2)}`);
        console.log(`      - Opening hours: ${dayScore.openingScore.toFixed(2)}`);
        console.log(`      - Time fit: ${dayScore.timeFitScore.toFixed(2)}`);
        console.log(`      - Synergy: ${dayScore.synergyScore.toFixed(2)}`);
        console.log(`      - Balance: ${dayScore.balanceScore.toFixed(2)}`);
      }
    }
    
    return bestDayIndex;
  }
  
  /**
   * Calculate comprehensive metrics for a cluster
   */
  private calculateClusterMetrics(cluster: {
    places: PlaceRecommendation[];
    totalTime: number;
    priority: number;
  }): {
    avgOpeningTime: number;
    avgClosingTime: number;
    peakVisitTime: number;
    timeFlexibility: number;
    totalReviews: number;
  } {
    let totalOpenMinutes = 0;
    let totalCloseMinutes = 0;
    let validHoursCount = 0;
    let totalReviews = 0;
    
    for (const place of cluster.places) {
      totalReviews += DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      
      // Analyze typical opening hours
      if (place.opening_hours && typeof place.opening_hours === 'object') {
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        for (const day of weekdays) {
          const hours = place.opening_hours[day];
          if (hours && hours.opens && hours.closes && hours.opens !== 'Closed') {
            const openTime = this.parseFlexibleTime(hours.opens);
            const closeTime = this.parseFlexibleTime(hours.closes);
            if (!isNaN(openTime) && !isNaN(closeTime)) {
              totalOpenMinutes += openTime;
              totalCloseMinutes += closeTime;
              validHoursCount++;
            }
          }
        }
      }
    }
    
    const avgOpeningTime = validHoursCount > 0 ? totalOpenMinutes / validHoursCount : 540; // 9 AM default
    const avgClosingTime = validHoursCount > 0 ? totalCloseMinutes / validHoursCount : 1020; // 5 PM default
    
    // Calculate ideal visit time (mid-day for most places)
    const peakVisitTime = (avgOpeningTime + avgClosingTime) / 2;
    
    // Calculate time flexibility (how flexible the cluster is with timing)
    const timeWindow = avgClosingTime - avgOpeningTime;
    const timeFlexibility = Math.min(1.0, timeWindow / 480); // Normalize to 8-hour day
    
    return {
      avgOpeningTime,
      avgClosingTime,
      peakVisitTime,
      timeFlexibility,
      totalReviews
    };
  }
  
  /**
   * Calculate comprehensive score for assigning cluster to a day
   */
  private calculateDayAssignmentScore(
    cluster: any,
    clusterMetrics: any,
    schedule: DailySchedule,
    currentPlaces: PlaceRecommendation[],
    distribution: PlaceRecommendation[][],
    dayIndex: number
  ): {
    isValid: boolean;
    totalScore: number;
    openingScore: number;
    timeFitScore: number;
    synergyScore: number;
    balanceScore: number;
  } {
    // Check if all places are open
    const allPlacesOpen = cluster.places.every((place: PlaceRecommendation) => 
      this.isPlaceOpenOnDate(place, schedule.date)
    );
    
    if (!allPlacesOpen) {
      return {
        isValid: false,
        totalScore: 0,
        openingScore: 0,
        timeFitScore: 0,
        synergyScore: 0,
        balanceScore: 0
      };
    }
    
    // 1. Opening hours alignment score
    const startTimeMinutes = this.parseTimeToMinutes(schedule.startTime);
    const endTimeMinutes = startTimeMinutes + (schedule.availableHours * 60);
    
    let openingScore = 1.0;
    if (startTimeMinutes < clusterMetrics.avgOpeningTime) {
      // Starting too early penalty
      openingScore *= 0.8;
    }
    if (endTimeMinutes > clusterMetrics.avgClosingTime) {
      // Ending too late penalty
      openingScore *= 0.9;
    }
    
    // Bonus for visiting during peak hours
    const visitWindow = (startTimeMinutes + endTimeMinutes) / 2;
    const peakAlignment = 1 - Math.abs(visitWindow - clusterMetrics.peakVisitTime) / 240; // 4-hour window
    openingScore *= (0.7 + 0.3 * Math.max(0, peakAlignment));
    
    // 2. Time fit score
    const currentTimeUsed = this.calculateDayTimeUsage(currentPlaces);
    const clusterTimeNeeded = cluster.totalTime + Math.max(30, cluster.places.length * 10);
    const availableTime = schedule.availableHours * 60;
    const remainingTime = availableTime - currentTimeUsed;
    
    let timeFitScore = 0;
    if (clusterTimeNeeded <= remainingTime) {
      // Calculate how well the cluster fills the remaining time
      const utilization = clusterTimeNeeded / remainingTime;
      if (utilization > 0.9) {
        timeFitScore = 0.8; // Too tight
      } else if (utilization > 0.7) {
        timeFitScore = 1.0; // Perfect fit
      } else if (utilization > 0.5) {
        timeFitScore = 0.9; // Good fit
      } else {
        timeFitScore = 0.7; // Underutilized
      }
    } else {
      return {
        isValid: false,
        totalScore: 0,
        openingScore,
        timeFitScore: 0,
        synergyScore: 0,
        balanceScore: 0
      };
    }
    
    // 3. Synergy score (how well cluster fits with existing places)
    let synergyScore = 0.5; // Base score
    
    if (currentPlaces.length > 0) {
      // Check geographic proximity to existing places
      let minDistance = Infinity;
      for (const existingPlace of currentPlaces) {
        for (const clusterPlace of cluster.places) {
          const distance = this.calculateDistance(
            existingPlace.coordinates.latitude,
            existingPlace.coordinates.longitude,
            clusterPlace.coordinates.latitude,
            clusterPlace.coordinates.longitude
          );
          minDistance = Math.min(minDistance, distance);
        }
      }
      
      if (minDistance < 1.0) {
        synergyScore = 1.0; // Very close, excellent synergy
      } else if (minDistance < 2.5) {
        synergyScore = 0.8; // Nearby, good synergy
      } else if (minDistance < 5.0) {
        synergyScore = 0.6; // Moderate distance
      } else {
        synergyScore = 0.4; // Far apart
      }
      
      // Check thematic synergy
      const existingTypes = new Set<string>();
      currentPlaces.forEach(p => p.types.forEach(t => existingTypes.add(t)));
      
      let typeOverlap = 0;
      cluster.places.forEach((p: PlaceRecommendation) => {
        p.types.forEach((t: string) => {
          if (existingTypes.has(t)) typeOverlap++;
        });
      });
      
      if (typeOverlap > 3) {
        synergyScore *= 1.2; // Bonus for thematic consistency
      }
    }
    
    // 4. Load balancing score
    const totalDays = distribution.length;
    const avgPlacesPerDay = distribution.reduce((sum, d) => sum + d.length, 0) / totalDays;
    const dayDeviation = Math.abs((currentPlaces.length + cluster.places.length) - avgPlacesPerDay);
    const balanceScore = Math.max(0.3, 1.0 - (dayDeviation / avgPlacesPerDay));
    
    // 5. Priority weighting
    const priorityWeight = 1 + (cluster.priority / 1000);
    
    // Calculate total score
    const totalScore = 
      (openingScore * 0.25 + 
       timeFitScore * 0.35 + 
       synergyScore * 0.25 + 
       balanceScore * 0.15) * 
      priorityWeight;
    
    return {
      isValid: true,
      totalScore,
      openingScore,
      timeFitScore,
      synergyScore,
      balanceScore
    };
  }
  
  /**
   * Calculate time usage for a day
   */
  private calculateDayTimeUsage(places: PlaceRecommendation[]): number {
    return places.reduce((sum, p) => {
      const visitDuration = p.estimatedVisitDuration || 60;
      const travelTime = p.travelTimeFromPrevious || 15;
      return sum + visitDuration + travelTime;
    }, 0);
  }

  /**
   * Fallback distribution when cluster can't fit in any day
   */
  private distributeClusterFallback(
    cluster: {
      name: string;
      places: PlaceRecommendation[];
      center: { latitude: number; longitude: number };
      priority: number;
      totalTime: number;
    },
    dailySchedules: DailySchedule[],
    distribution: PlaceRecommendation[][]
  ): void {
    console.log(`  🔄 Fallback: distributing ${cluster.places.length} places individually`);
    
    // Sort places within cluster by priority
    const sortedPlaces = [...cluster.places].sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      return reviewsB - reviewsA;
    });
    
    // Distribute each place individually
    for (const place of sortedPlaces) {
      let bestDayIndex = -1;
      let bestScore = -1;
      
      for (let i = 0; i < dailySchedules.length; i++) {
        const schedule = dailySchedules[i];
        const currentPlaces = distribution[i];
        
        // Check if place is open on this day
        if (!this.isPlaceOpenOnDate(place, schedule.date)) continue;
        
        // Calculate current time usage
        const currentTime = currentPlaces.reduce((sum, p) => {
          const visitDuration = p.estimatedVisitDuration || 60;
          const travelTime = p.travelTimeFromPrevious || 0;
          return sum + visitDuration + travelTime;
        }, 0);
        
        // Check if place can fit
        const placeTimeNeeded = (place.estimatedVisitDuration || 60) + Math.max(15, currentPlaces.length * 10);
        const availableTime = schedule.availableHours * 60;
        
        if (currentTime + placeTimeNeeded <= availableTime) {
          const remainingCapacity = (availableTime - currentTime) / availableTime;
          const score = (place.matchScore || 0) * remainingCapacity;
          
          if (score > bestScore) {
            bestScore = score;
            bestDayIndex = i;
          }
        }
      }
      
      // Add place to best day
      if (bestDayIndex !== -1) {
        distribution[bestDayIndex].push(place);
        console.log(`    → ${place.name} assigned to Day ${dailySchedules[bestDayIndex].day}`);
      } else {
        console.log(`    → ${place.name} could not fit in any day`);
      }
    }
  }

  /**
   * Group places by their clusters for visualization
   */
  private groupPlacesByClusters(
    dayPlaces: PlaceRecommendation[],
    clusters: Array<{
      name: string;
      places: PlaceRecommendation[];
      center: { latitude: number; longitude: number };
      priority: number;
      totalTime: number;
    }>
  ): Map<string, PlaceRecommendation[]> {
    const clusterGroups = new Map<string, PlaceRecommendation[]>();
    
    for (const place of dayPlaces) {
      // Find which cluster this place belongs to
      const cluster = clusters.find(c => 
        c.places.some(p => p.place_id === place.place_id)
      );
      
      if (cluster) {
        const clusterName = cluster.name;
        if (!clusterGroups.has(clusterName)) {
          clusterGroups.set(clusterName, []);
        }
        clusterGroups.get(clusterName)!.push(place);
      } else {
        // Place not in any cluster (shouldn't happen, but safety check)
        if (!clusterGroups.has('Unclustered')) {
          clusterGroups.set('Unclustered', []);
        }
        clusterGroups.get('Unclustered')!.push(place);
      }
    }
    
    return clusterGroups;
  }

  /**
   * Generate highlights for multi-day summary
   */
  private generateMultiDayHighlights(dailyItineraries: DailyItinerary[]): string[] {
    const highlights: string[] = [];
    
    // Find the best day by efficiency
    const bestDay = dailyItineraries.reduce((best, current) => 
      current.places.length > best.places.length ? current : best);
    highlights.push(`Day ${bestDay.day} features the most attractions (${bestDay.places.length} places)`);
    
    // Calculate total unique place types
    const allTypes = new Set<string>();
    dailyItineraries.forEach(day => 
      day.places.forEach(place => 
        place.types.forEach(type => allTypes.add(type))));
    highlights.push(`Experience ${allTypes.size} different types of attractions`);
    
    // Find days with special characteristics
    const longDay = dailyItineraries.find(day => day.availableHours >= 8);
    if (longDay) {
      highlights.push(`Day ${longDay.day} is your longest exploration day (${longDay.availableHours}h)`);
    }
    
    return highlights;
  }

  /**
   * Get high-popularity places (top places by user ratings count)
   */
  private getHighPopularityPlaces(places: PlaceRecommendation[], threshold: number = 1000): PlaceRecommendation[] {
    return places.filter(place => {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      return reviewCount >= threshold;
    }).sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      return reviewsB - reviewsA;
    });
  }

  /**
   * Filter places by user interests using interest mapping
   */
  private filterPlacesByInterests(selectedInterests: string[]): PlaceRecommendation[] {
    console.log(`🔍 FILTERING PLACES BY INTERESTS: ${selectedInterests.join(', ')}`);
    const allPlaces = DataService.getOperationalPlaces();
    const matchingPlaces: PlaceRecommendation[] = [];
    
    // Debug: Check if Millennium Park is in the data
    const millenniumPark = allPlaces.find(place => place.name.toLowerCase().includes('millennium'));
    if (millenniumPark) {
      console.log(`🔍 MILLENNIUM PARK FOUND IN DATA: ${millenniumPark.name}`);
      console.log(`   Types: ${millenniumPark.types.join(', ')}`);
      console.log(`   Reviews: ${millenniumPark.user_ratings_total}`);
      console.log(`   Status: ${millenniumPark.business_status}`);
      console.log(`   Rating: ${millenniumPark.rating}`);
      console.log(`   Has tourist_attraction: ${millenniumPark.types.includes('tourist_attraction')}`);
      console.log(`   Coordinates: ${millenniumPark.coordinates.latitude}, ${millenniumPark.coordinates.longitude}`);
    } else {
      console.log(`❌ MILLENNIUM PARK NOT FOUND IN OPERATIONAL PLACES`);
      
      // Check if it exists in all places (including non-operational)
      const allPlacesIncludingNonOp = DataService.getAllPlaces();
      const millenniumInAll = allPlacesIncludingNonOp.find(place => 
        place.name.toLowerCase().includes('millennium')
      );
      
      if (millenniumInAll) {
        console.log(`🔍 Found in all places but not operational:`);
        console.log(`   Name: ${millenniumInAll.name}`);
        console.log(`   Status: ${millenniumInAll.business_status}`);
        console.log(`   Coordinates: ${millenniumInAll.coordinates.latitude}, ${millenniumInAll.coordinates.longitude}`);
      }
    }
    
    // Automatically detect and report coordinate extraction issues for all cities
    console.log(`\n🔍 AUTOMATIC COORDINATE ISSUE DETECTION:`);
    DataService.detectCoordinateIssues();

    // Get place types for selected interests
    const targetPlaceTypes = selectedInterests.flatMap(interestId => {
      const category = INTEREST_CATEGORIES.find(cat => cat.id === interestId);
      return category ? category.placeTypes : [];
    });
    console.log(`🎯 TARGET PLACE TYPES: ${targetPlaceTypes.join(', ')}`);

    allPlaces.forEach(place => {
      let matchScore = 0;
      
      // PRIORITY: Tourist attractions always get base score
      const isTouristAttraction = place.types.some(type => 
        type.toLowerCase().includes('tourist_attraction') ||
        type.toLowerCase().includes('point_of_interest')
      );
      
      // Check if it's a very popular place (5000+ reviews)
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      const isIconicPlace = reviewCount >= 10000;
      const isVeryPopular = reviewCount >= 5000;
      
      if (isTouristAttraction) {
        matchScore += 2; // Tourist attractions always have base relevance
      }
      
      // MUST-SEE PLACES: Iconic attractions always included
      if (isIconicPlace && isTouristAttraction) {
        matchScore += 10; // MASSIVE boost to guarantee inclusion of iconic places like Millennium Park
        console.log(`🌟 ICONIC PLACE DETECTED: ${place.name} (${reviewCount} reviews)`);
      } else if (isVeryPopular && isTouristAttraction) {
        matchScore += 5; // Big boost for very popular tourist attractions
      } else if (isVeryPopular) {
        matchScore += 1; // Small boost for very popular non-attractions
      }
      
      // Check type matches
      const typeMatches = place.types.some(type => 
        targetPlaceTypes.some(targetType => 
          type.toLowerCase().includes(targetType.toLowerCase()) ||
          targetType.toLowerCase().includes(type.toLowerCase())
        )
      );
      
      if (typeMatches) matchScore += 3;
      
      // Check name/description matches
      const searchTerms = selectedInterests.flatMap(interest => {
        const category = INTEREST_CATEGORIES.find(cat => cat.id === interest);
        return category ? [category.name.toLowerCase(), interest] : [interest];
      });
      
      searchTerms.forEach(term => {
        if (place.name.toLowerCase().includes(term) || 
            place.description?.toLowerCase().includes(term)) {
          matchScore += 1;
        }
      });
      
      if (matchScore > 0) {
        // Debug Millennium Park processing
        if (place.name.toLowerCase().includes('millennium')) {
          console.log(`🔍 PROCESSING MILLENNIUM PARK:`);
          console.log(`   Match Score: ${matchScore}`);
          console.log(`   Types: ${place.types.join(', ')}`);
          console.log(`   Reviews: ${DataService.extractReviewCount(place.user_ratings_total?.toString() || '0')}`);
          console.log(`   Rating: ${place.rating}`);
          console.log(`   Is Tourist Attraction: ${place.types.some(type => type.toLowerCase().includes('tourist_attraction'))}`);
          console.log(`   Is Iconic: ${DataService.extractReviewCount(place.user_ratings_total?.toString() || '0') >= 10000}`);
        }
        
        // NEGATIVE FILTERING: Exclude places that primarily belong to unselected categories
        // BUT NEVER EXCLUDE TOURIST ATTRACTIONS OR HIGH-POPULARITY PLACES
        let shouldExclude = false;
        
        // Check if it's a tourist attraction or very popular place - these should NEVER be excluded
        const isTouristAttraction = place.types.some(type => 
          type.toLowerCase().includes('tourist_attraction') ||
          type.toLowerCase().includes('point_of_interest')
        );
        const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
        const isVeryPopular = reviewCount >= 5000;
        
        // If parks is not selected, exclude ONLY non-tourist-attraction parks
        if (!selectedInterests.includes('parks') && !isTouristAttraction && !isVeryPopular) {
          const isPrimaryPark = place.types.some(type => {
            const lowerType = type.toLowerCase();
            return lowerType.includes('park') || 
                   lowerType.includes('zoo') || 
                   lowerType.includes('garden') ||
                   lowerType === 'park' ||
                   lowerType === 'zoo' ||
                   lowerType === 'garden';
          });
          if (isPrimaryPark) {
            console.log(`🚫 MAIN FILTER EXCLUDING park ${place.name} - parks not selected, types: ${place.types.join(', ')}`);
            shouldExclude = true;
          }
        }
        
        // If museums is not selected, exclude ONLY non-tourist-attraction museums
        if (!selectedInterests.includes('museums') && !isTouristAttraction && !isVeryPopular) {
          const isPrimaryMuseum = place.types.some(type => {
            const lowerType = type.toLowerCase();
            return lowerType.includes('museum') || 
                   lowerType.includes('art_gallery') ||
                   lowerType === 'museum' ||
                   lowerType === 'art_gallery';
          });
          if (isPrimaryMuseum) {
            console.log(`🚫 MAIN FILTER EXCLUDING museum ${place.name} - museums not selected, types: ${place.types.join(', ')}`);
            shouldExclude = true;
          }
        }
        
        if (!shouldExclude) {
          matchingPlaces.push({
            ...place,
            matchScore,
            estimatedVisitDuration: this.calculateVisitDuration(place),
            busynessLevel: place.popular_times?.current_busyness ?? undefined,
            distanceFromPrevious: undefined,
            distanceFromStart: undefined,
            travelTimeFromPrevious: undefined
          });
        }
      }
    });

    // STRICT FILTERING: ONLY include places with tourist_attraction type
    const touristAttractionPlaces = matchingPlaces.filter(place => {
      const hasTouristAttraction = place.types.some(type => 
        type.toLowerCase().includes('tourist_attraction')
      );
      
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      
      // Log important places for debugging
      if (place.name.toLowerCase().includes('millennium') || reviewCount >= 50000) {
        console.log(`🔍 CHECKING ${place.name}:`);
        console.log(`   Tourist Attraction: ${hasTouristAttraction}`);
        console.log(`   Reviews: ${reviewCount}`);
        console.log(`   Types: ${place.types.join(', ')}`);
        console.log(`   Match Score: ${place.matchScore}`);
        console.log(`   Will Include: ${hasTouristAttraction ? 'YES' : 'NO'}`);
      }
      
      // ONLY include tourist attractions - no exceptions
      if (!hasTouristAttraction) {
        // Log what's being filtered out
        if (reviewCount >= 2000) {
          console.log(`⚠️ Filtered out non-tourist-attraction: ${place.name} (${reviewCount} reviews, types: ${place.types.join(', ')})`);
        }
        return false;
      }
      
      return true;
    });
    
    // SECONDARY FILTER: Only include places that match user's selected interests
    const interestFilteredPlaces = touristAttractionPlaces.filter(place => {
      // Check if place matches ANY of the selected interests
      const matchesSelectedInterests = selectedInterests.some(interestId => {
        const category = INTEREST_CATEGORIES.find(cat => cat.id === interestId);
        if (!category) return false;
        
        return place.types.some(type => 
          category.placeTypes.some(targetType => 
            type.toLowerCase().includes(targetType.toLowerCase())
          )
        );
      });
      
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      
      // Log important places for debugging
      if (place.name.toLowerCase().includes('millennium') || reviewCount >= 50000) {
        console.log(`🔍 INTEREST FILTER CHECK for ${place.name}:`);
        console.log(`   Selected Interests: ${selectedInterests.join(', ')}`);
        console.log(`   Place Types: ${place.types.join(', ')}`);
        console.log(`   Matches Selected Interests: ${matchesSelectedInterests}`);
        console.log(`   Will Include: ${matchesSelectedInterests ? 'YES' : 'NO'}`);
      }
      
      // Filter out places that don't match selected interests
      if (!matchesSelectedInterests) {
        if (reviewCount >= 2000) {
          console.log(`⚠️ Filtered out by interest mismatch: ${place.name} (${reviewCount} reviews, types: ${place.types.join(', ')}) - doesn't match interests: ${selectedInterests.join(', ')}`);
        }
        return false;
      }
      
      return true;
    });

    console.log(`📍 Tourist attraction filter: ${matchingPlaces.length} → ${touristAttractionPlaces.length} places`);
    console.log(`📍 Interest filter: ${touristAttractionPlaces.length} → ${interestFilteredPlaces.length} places`);
    
    // Debug: Check if Millennium Park made it through both filters
    const millenniumParkFiltered = interestFilteredPlaces.find(place => place.name.toLowerCase().includes('millennium'));
    if (millenniumParkFiltered) {
      console.log(`✅ MILLENNIUM PARK PASSED BOTH FILTERS:`);
      console.log(`   Name: ${millenniumParkFiltered.name}`);
      console.log(`   Match Score: ${millenniumParkFiltered.matchScore}`);
      console.log(`   Reviews: ${DataService.extractReviewCount(millenniumParkFiltered.user_ratings_total?.toString() || '0')}`);
      console.log(`   Types: ${millenniumParkFiltered.types.join(', ')}`);
      console.log(`   Selected Interests: ${selectedInterests.join(', ')}`);
    } else {
      console.log(`❌ MILLENNIUM PARK FILTERED OUT`);
      
      // Check which filter it failed
      const millenniumParkInTouristAttractions = touristAttractionPlaces.find(place => place.name.toLowerCase().includes('millennium'));
      if (millenniumParkInTouristAttractions) {
        console.log(`🔍 MILLENNIUM PARK PASSED tourist_attraction filter but failed interest filter:`);
        console.log(`   Name: ${millenniumParkInTouristAttractions.name}`);
        console.log(`   Types: ${millenniumParkInTouristAttractions.types.join(', ')}`);
        console.log(`   Selected Interests: ${selectedInterests.join(', ')}`);
        console.log(`   💡 This means it has tourist_attraction type but doesn't match your selected interests!`);
      } else {
        console.log(`🔍 MILLENNIUM PARK FAILED tourist_attraction filter`);
        // Check if it was in matchingPlaces before any filtering
        const millenniumParkInMatching = matchingPlaces.find(place => place.name.toLowerCase().includes('millennium'));
        if (millenniumParkInMatching) {
          console.log(`   Name: ${millenniumParkInMatching.name}`);
          console.log(`   Types: ${millenniumParkInMatching.types.join(', ')}`);
          console.log(`   Has tourist_attraction: ${millenniumParkInMatching.types.some(type => type.toLowerCase().includes('tourist_attraction'))}`);
        }
      }
    }

    // Sort by user_ratings_total (highest first) - this is the PRIMARY priority
    return interestFilteredPlaces.sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      
      // PRIMARY SORT: By user_ratings_total (highest first)
      if (reviewsB !== reviewsA) {
        return reviewsB - reviewsA;
      }
      
      // SECONDARY SORT: If same review count, use match score
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      // TERTIARY SORT: If same match score, use rating
      const ratingA = DataService.extractRating(a.rating);
      const ratingB = DataService.extractRating(b.rating);
      if (Math.abs(ratingB - ratingA) > 0.1) {
        return ratingB - ratingA;
      }
      
      // FINAL SORT: Alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Filter places by opening hours for specific date with special handling for high-popularity places
   */
  private filterByOpeningHours(places: PlaceRecommendation[], date: string): PlaceRecommendation[] {
    const dayOfWeek = this.getDayOfWeekSafe(date);
    console.log(`🔍 FILTERING BY HOURS: Using day "${dayOfWeek}" for date "${date}"`);
    
    return places.filter(place => {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      const isHighPopularity = reviewCount >= 2000; // Lower threshold for inclusion check
      
      // For very high popularity places (5k+ reviews), be more permissive with hours parsing
      if (reviewCount >= 5000) {
        console.log(`Checking hours for high-popularity place: ${place.name} (${reviewCount.toLocaleString()} reviews)`);
      }
      
      // Special debugging for Millennium Park
      if (place.name.toLowerCase().includes('millennium')) {
        console.log(`🔍 MILLENNIUM PARK OPENING HOURS CHECK:`);
        console.log(`   Date: ${date}`);
        console.log(`   Opening Hours: ${JSON.stringify(place.opening_hours)}`);
        console.log(`   Business Status: ${place.business_status}`);
      }
      
      if (!place.opening_hours) {
        // High popularity places get benefit of doubt if no hours data
        if (isHighPopularity) {
          console.log(`Including high-popularity place ${place.name} despite no hours data`);
          return true; 
        }
        return true; // Still assume open for all places if no hours data
      }
      
      try {
        // Try to parse JSON format first
        if (typeof place.opening_hours === 'object') {
          const dayHours = place.opening_hours[dayOfWeek];
          const isOpen = dayHours && typeof dayHours === 'object' && dayHours.opens !== 'Closed';
          
          if (!isOpen && isHighPopularity) {
            console.log(`High-popularity place ${place.name} appears closed on ${dayOfWeek}: ${JSON.stringify(dayHours)}`);
          } else if (isOpen && reviewCount >= 5000) {
            console.log(`Confirmed open: ${place.name} - ${dayHours?.opens} to ${dayHours?.closes}`);
          }
          
          // Special debugging for Millennium Park
          if (place.name.toLowerCase().includes('millennium')) {
            console.log(`🔍 MILLENNIUM PARK OPENING HOURS RESULT:`);
            console.log(`   Day: ${dayOfWeek}`);
            console.log(`   Hours: ${JSON.stringify(dayHours)}`);
            console.log(`   Is Open: ${isOpen}`);
            console.log(`   Final Result: ${isOpen ? 'INCLUDED' : 'FILTERED OUT'}`);
          }
          
          return isOpen;
        }
        
        // Fallback to string parsing
        if (typeof place.opening_hours === 'string') {
          const hoursText = place.opening_hours.toLowerCase();
          const isOpen = !hoursText.includes('closed') || !hoursText.includes(dayOfWeek);
          
          if (!isOpen && isHighPopularity) {
            console.log(`High-popularity place ${place.name} string indicates closed: ${place.opening_hours}`);
          }
          
          return isOpen;
        }
        
        return true;
      } catch (error) {
        console.warn('Error parsing opening hours for', place.name, error);
        // High popularity places get benefit of doubt on parsing errors
        return isHighPopularity ? true : true; // Actually include all on parsing errors
      }
    });
  }

  /**
   * Prioritize places by fame (review count) and rating with detailed logging
   */
  private prioritizeByFame(places: PlaceRecommendation[]): PlaceRecommendation[] {
    const sorted = places.sort((a, b) => {
      // Extract review counts
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      
      // ABSOLUTE PRIORITY: Iconic places (50k+ reviews) ALWAYS come first
      const aIsIconic = reviewsA >= 50000;
      const bIsIconic = reviewsB >= 50000;
      if (aIsIconic && !bIsIconic) return -1;
      if (!aIsIconic && bIsIconic) return 1;
      
      // VERY HIGH PRIORITY: Super popular places (20k+ reviews)
      const aIsSuperPopular = reviewsA >= 20000;
      const bIsSuperPopular = reviewsB >= 20000;
      if (aIsSuperPopular && !bIsSuperPopular) return -1;
      if (!aIsSuperPopular && bIsSuperPopular) return 1;
      
      // HIGH PRIORITY: Very popular places (10k+ reviews)
      const aIsVeryPopular = reviewsA >= 10000;
      const bIsVeryPopular = reviewsB >= 10000;
      if (aIsVeryPopular && !bIsVeryPopular) return -1;
      if (!aIsVeryPopular && bIsVeryPopular) return 1;
      
      // Primary: Number of reviews (fame/popularity)
      if (reviewsB !== reviewsA) {
        return reviewsB - reviewsA;
      }
      
      // Secondary: Rating score
      const ratingA = DataService.extractRating(a.rating);
      const ratingB = DataService.extractRating(b.rating);
      
      if (Math.abs(ratingB - ratingA) > 0.1) {
        return ratingB - ratingA;
      }
      
      // Tertiary: Interest match score
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      // Final: Alphabetical
      return a.name.localeCompare(b.name);
    });

    // Log top popular places for debugging
    const topPlaces = sorted.slice(0, 10).filter(place => {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      return reviewCount >= 2000;
    });

    if (topPlaces.length > 0) {
      console.log('=== TOP POPULAR PLACES AFTER FILTERING ===');
      topPlaces.forEach((place, index) => {
        const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
        const rating = DataService.extractRating(place.rating);
        console.log(`${index + 1}. ${place.name}: ${reviewCount.toLocaleString()} reviews, ${rating}⭐, match: ${place.matchScore}`);
      });
      console.log('===========================================');
    }

    return sorted;
  }

  /**
   * Group nearby places into clusters to minimize travel time
   * Uses distance-based clustering with interest and popularity weighting
   */
  private clusterPlacesByProximity(
    places: PlaceRecommendation[],
    selectedInterests: string[]
  ): PlaceRecommendation[] {
    if (places.length <= 1) return places;
    
    const CLUSTER_RADIUS_KM = 0.8; // Places within 800m are considered nearby
    const clusteredPlaces: PlaceRecommendation[] = [];
    const processedPlaces = new Set<string>();
    
    // Sort places by popularity to prioritize high-value places as cluster centers
    const sortedPlaces = [...places].sort((a, b) => {
      const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
      const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
      return reviewsB - reviewsA;
    });
    
    console.log(`🔍 Starting proximity clustering for ${places.length} places`);
    
    for (const centerPlace of sortedPlaces) {
      if (processedPlaces.has(centerPlace.place_id)) continue;
      
      // Find all places within cluster radius of this center place
      const cluster: PlaceRecommendation[] = [centerPlace];
      processedPlaces.add(centerPlace.place_id);
      
      const nearbyPlaces = sortedPlaces.filter(place => {
        if (processedPlaces.has(place.place_id)) return false;
        
        const centerCoords = this.getPlaceCoordinates(centerPlace);
        const placeCoords = this.getPlaceCoordinates(place);
        const distance = this.calculateDistance(
          centerCoords.latitude,
          centerCoords.longitude,
          placeCoords.latitude,
          placeCoords.longitude
        );
        
        return distance <= CLUSTER_RADIUS_KM;
      });
      
      // Add nearby places to cluster, prioritizing by interest match and popularity
      const scoredNearbyPlaces = nearbyPlaces.map(place => {
        const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
        const interestMatches = selectedInterests.filter(interest => 
          this.placeMatchesInterest(place, interest)
        ).length;
        
        return {
          place,
          score: reviewCount + (interestMatches * 1000) // Boost for interest matches
        };
      }).sort((a, b) => b.score - a.score);
      
      // Add top nearby places to cluster (limit cluster size to avoid overwhelming)
      const maxClusterSize = 4; // Maximum places per cluster
      const selectedNearby = scoredNearbyPlaces.slice(0, maxClusterSize - 1); // -1 for center place
      
      for (const { place } of selectedNearby) {
        cluster.push(place);
        processedPlaces.add(place.place_id);
      }
      
      if (cluster.length > 1) {
        console.log(`📍 Created cluster around ${centerPlace.name}: ${cluster.length} places (${cluster.map(p => p.name).join(', ')})`);
      }
      
      // Add all places in cluster to final selection
      // For clusters with multiple places, we include them all but they'll be optimized for routing
      clusteredPlaces.push(...cluster);
    }
    
    console.log(`✅ Clustering complete: ${clusteredPlaces.length} places in optimized groups`);
    return clusteredPlaces;
  }

  /**
   * Extract coordinates from place object with fallback handling
   */
  private getPlaceCoordinates(place: any): { latitude: number; longitude: number } {
    // Try different coordinate structures
    if (place.coordinates) {
      // Check for latitude/longitude format
      if (typeof place.coordinates.latitude === 'number' && typeof place.coordinates.longitude === 'number') {
        return {
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude
        };
      }
      // Check for lat/lng format  
      if (typeof place.coordinates.lat === 'number' && typeof place.coordinates.lng === 'number') {
        return {
          latitude: place.coordinates.lat,
          longitude: place.coordinates.lng
        };
      }
    }
    
    // Try basic_info.latitude/longitude as fallback
    if (place.basic_info?.latitude && place.basic_info?.longitude) {
      return {
        latitude: parseFloat(place.basic_info.latitude),
        longitude: parseFloat(place.basic_info.longitude)
      };
    }
    
    // If no coordinates found, return Philadelphia center as fallback
    console.warn(`⚠️ No coordinates found for place: ${place.name || 'unknown'}, using Philadelphia center`);
    return {
      latitude: 39.9526,
      longitude: -75.1652
    };
  }

  /**
   * Calculate distance between two coordinates in kilometers using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Enhance clustered places with proximity metadata for better routing
   * Adds cluster information to help route optimization keep nearby places together
   */
  private enhancePlacesWithClusterInfo(places: PlaceRecommendation[]): PlaceRecommendation[] {
    const CLUSTER_RADIUS_KM = 0.8; // Same radius as clustering
    
    return places.map((place, index) => {
      // Find other places within cluster radius
      const nearbyPlaces = places.filter((otherPlace, otherIndex) => {
        if (index === otherIndex) return false;
        
        const placeCoords = this.getPlaceCoordinates(place);
        const otherCoords = this.getPlaceCoordinates(otherPlace);
        const distance = this.calculateDistance(
          placeCoords.latitude,
          placeCoords.longitude,
          otherCoords.latitude,
          otherCoords.longitude
        );
        
        return distance <= CLUSTER_RADIUS_KM;
      });
      
      // Add cluster metadata to place
      return {
        ...place,
        clusterSize: nearbyPlaces.length + 1, // +1 for itself
        nearbyPlaceIds: nearbyPlaces.map(p => p.place_id),
        clusterId: `cluster_${Math.min(index, ...nearbyPlaces.map(p => places.indexOf(p)))}` // Use lowest index as cluster ID
      };
    });
  }

  /**
   * Select optimal places within time constraints using intelligent algorithms
   */
  private selectOptimalPlaces(
    places: PlaceRecommendation[], 
    availableHours: number,
    selectedInterests: string[]
  ): PlaceRecommendation[] {
    const availableMinutes = availableHours * 60;
    
    // Step 1: Group nearby places into clusters for efficient travel
    const clusteredPlaces = this.clusterPlacesByProximity(places, selectedInterests);
    console.log(`📍 Proximity clustering: ${places.length} places → ${clusteredPlaces.length} places in clusters`);
    
    // Step 2: Enhance places with cluster metadata for better routing
    const enhancedPlaces = this.enhancePlacesWithClusterInfo(clusteredPlaces);
    console.log(`🔗 Enhanced ${enhancedPlaces.length} places with cluster relationship data`);
    
    // Step 3: Use knapsack algorithm to maximize value within time constraints
    return this.knapsackPlaceSelection(enhancedPlaces, availableMinutes, selectedInterests);
  }

  /**
   * Advanced selection algorithm with absolute priority for high-popularity open places
   */
  private knapsackPlaceSelection(
    places: PlaceRecommendation[],
    availableMinutes: number,
    selectedInterests: string[]
  ): PlaceRecommendation[] {
    // Reserve generous time buffer for return travel - actual optimization will calculate precise times
    // Use 10% of available time or minimum 20 minutes for return travel buffer
    const returnTravelBuffer = Math.max(20, Math.round(availableMinutes * 0.1));
    const availableTimeForPlaces = availableMinutes - returnTravelBuffer;
    
    console.log(`⏰ Time allocation: ${availableMinutes}min total, ${returnTravelBuffer}min for return travel buffer, ${availableTimeForPlaces}min for places`);
    // Calculate comprehensive scores for each place
    const scoredPlaces = places.map(place => {
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      const value = this.calculatePlaceValue(place, selectedInterests);
      const timeRequired = this.estimateTimeRequired(place);
      const isHighPopularity = this.isHighPopularityPlace(place);
      const matchingInterests = selectedInterests.filter(interest => 
        this.placeMatchesInterest(place, interest)
      );

      return {
        place,
        value,
        timeRequired,
        reviewCount,
        isHighPopularity,
        matchingInterests,
        popularityTier: this.getPopularityTier(reviewCount),
        efficiency: value / timeRequired
      };
    }).filter(item => item.timeRequired <= availableTimeForPlaces);

    // ABSOLUTE PRIORITY SORTING: Ultra-high popularity places first, regardless of other factors
    scoredPlaces.sort((a, b) => {
      // Tier 1: Ultra-high popularity (10k+ reviews) that match interests - GUARANTEED INCLUSION
      const aUltraPopularWithInterest = a.popularityTier >= 4 && a.matchingInterests.length > 0;
      const bUltraPopularWithInterest = b.popularityTier >= 4 && b.matchingInterests.length > 0;
      if (aUltraPopularWithInterest && !bUltraPopularWithInterest) return -1;
      if (!aUltraPopularWithInterest && bUltraPopularWithInterest) return 1;

      // Tier 2: Very high popularity (5k+ reviews) that match interests
      const aVeryPopularWithInterest = a.popularityTier >= 3 && a.matchingInterests.length > 0;
      const bVeryPopularWithInterest = b.popularityTier >= 3 && b.matchingInterests.length > 0;
      if (aVeryPopularWithInterest && !bVeryPopularWithInterest) return -1;
      if (!aVeryPopularWithInterest && bVeryPopularWithInterest) return 1;

      // Tier 3: High popularity (2k+ reviews) that match interests
      const aHighPopularWithInterest = a.popularityTier >= 2 && a.matchingInterests.length > 0;
      const bHighPopularWithInterest = b.popularityTier >= 2 && b.matchingInterests.length > 0;
      if (aHighPopularWithInterest && !bHighPopularWithInterest) return -1;
      if (!aHighPopularWithInterest && bHighPopularWithInterest) return 1;

      // Within same tier, sort by review count descending
      if (a.popularityTier === b.popularityTier) {
        return b.reviewCount - a.reviewCount;
      }

      // Then by popularity tier
      if (a.popularityTier !== b.popularityTier) {
        return b.popularityTier - a.popularityTier;
      }

      // Finally by efficiency
      return b.efficiency - a.efficiency;
    });

    // GUARANTEED INCLUSION PHASE: Force include top popular places that match interests
    const selectedPlaces: PlaceRecommendation[] = [];
    const coveredInterests = new Set<string>();
    let remainingTime = availableTimeForPlaces; // Use time excluding return travel

    // Phase 1: ABSOLUTE PRIORITY - Include top popular places (5k+ reviews) that match interests
    const topPopularPlaces = scoredPlaces.filter(item => 
      item.reviewCount >= 5000 && item.matchingInterests.length > 0
    );

    console.log(`Found ${topPopularPlaces.length} top popular places (5k+ reviews) that match interests`);
    
    for (const item of topPopularPlaces) {
      if (item.timeRequired <= remainingTime && selectedPlaces.length < 16) {
        selectedPlaces.push(item.place);
        remainingTime -= item.timeRequired;
        item.matchingInterests.forEach(interest => coveredInterests.add(interest));
        console.log(`GUARANTEED INCLUSION: ${item.place.name} (${item.reviewCount.toLocaleString()} reviews)`);
      } else {
        console.log(`Could not fit popular place: ${item.place.name} (${item.reviewCount.toLocaleString()} reviews) - needs ${item.timeRequired}min, have ${remainingTime}min`);
      }
    }

    // Phase 2: Include other high popularity places (1k+ reviews) that match interests
    const otherHighPopularPlaces = scoredPlaces.filter(item => 
      item.reviewCount >= 1000 && 
      item.reviewCount < 5000 && 
      item.matchingInterests.length > 0 &&
      !selectedPlaces.includes(item.place)
    );

    for (const item of otherHighPopularPlaces) {
      if (item.timeRequired <= remainingTime && selectedPlaces.length < 16) {
        selectedPlaces.push(item.place);
        remainingTime -= item.timeRequired;
        item.matchingInterests.forEach(interest => coveredInterests.add(interest));
        console.log(`HIGH PRIORITY: ${item.place.name} (${item.reviewCount.toLocaleString()} reviews)`);
      }
    }

    // Phase 3: Ensure each remaining interest is covered
    for (const interestId of selectedInterests) {
      if (!coveredInterests.has(interestId)) {
        const bestPlaceForInterest = scoredPlaces.find(item => 
          !selectedPlaces.includes(item.place) &&
          this.placeMatchesInterest(item.place, interestId) &&
          item.timeRequired <= remainingTime
        );

        if (bestPlaceForInterest) {
          selectedPlaces.push(bestPlaceForInterest.place);
          remainingTime -= bestPlaceForInterest.timeRequired;
          coveredInterests.add(interestId);
          console.log(`INTEREST COVERAGE: ${bestPlaceForInterest.place.name} for ${interestId}`);
        }
      }
    }

    // Phase 4: Fill remaining time with highest value places (cluster-aware)
    // Re-score remaining places with cluster proximity bonus
    const remainingPlaces = scoredPlaces
      .filter(item => !selectedPlaces.includes(item.place) && item.timeRequired <= remainingTime)
      .map(item => {
        let clusterBonus = 0;
        
        // Check if this place is near any already selected place
        for (const selectedPlace of selectedPlaces) {
          const itemCoords = this.getPlaceCoordinates(item.place);
          const selectedCoords = this.getPlaceCoordinates(selectedPlace);
          const distance = this.calculateDistance(
            itemCoords.latitude,
            itemCoords.longitude,
            selectedCoords.latitude,
            selectedCoords.longitude
          );
          
          if (distance <= 0.8) { // Within cluster radius
            clusterBonus += 1000; // Significant bonus for being near selected places
            console.log(`🎯 Cluster synergy: ${item.place.name} is near selected ${selectedPlace.name} (${distance.toFixed(2)}km)`);
            break; // One bonus per place is enough
          }
        }
        
        return {
          ...item,
          clusterAdjustedEfficiency: item.efficiency + clusterBonus
        };
      })
      .sort((a, b) => b.clusterAdjustedEfficiency - a.clusterAdjustedEfficiency);

    for (const item of remainingPlaces) {
      if (selectedPlaces.length < 16) {
        selectedPlaces.push(item.place);
        remainingTime -= item.timeRequired;
        const bonusText = item.clusterAdjustedEfficiency > item.efficiency ? " (CLUSTER BONUS)" : "";
        console.log(`REMAINING FILL: ${item.place.name} (efficiency: ${item.efficiency.toFixed(1)})${bonusText}`);
      }
    }

    console.log(`Final selection: ${selectedPlaces.length} places, ${remainingTime}min remaining`);
    return selectedPlaces;
  }

  /**
   * Get popularity tier based on review count
   */
  private getPopularityTier(reviewCount: number): number {
    if (reviewCount >= 10000) return 4; // Ultra-high (10k+)
    if (reviewCount >= 5000) return 3;  // Very high (5k-10k)
    if (reviewCount >= 2000) return 2;  // High (2k-5k)
    if (reviewCount >= 1000) return 1;  // Moderate (1k-2k)
    return 0; // Normal (<1k)
  }

  /**
   * Check if a place is considered high popularity
   */
  private isHighPopularityPlace(place: PlaceRecommendation): boolean {
    const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
    return reviewCount >= 1000; // Threshold for high popularity
  }

  /**
   * Calculate comprehensive value score for a place with heavy weighting for high popularity
   */
  private calculatePlaceValue(place: PlaceRecommendation, selectedInterests: string[]): number {
    let value = 0;

    // Base value from rating (0-50 points)
    const rating = DataService.extractRating(place.rating);
    value += rating * 10;

    // MASSIVE Fame/popularity value with exponential scaling for high review counts
    const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
    
    // Give exponential bonus for high review counts
    if (reviewCount >= 10000) {
      value += 500; // Massive boost for 10k+ reviews
    } else if (reviewCount >= 5000) {
      value += 300; // Large boost for 5k+ reviews
    } else if (reviewCount >= 2000) {
      value += 200; // Big boost for 2k+ reviews
    } else if (reviewCount >= 1000) {
      value += 150; // Significant boost for 1k+ reviews
    } else if (reviewCount >= 500) {
      value += 75;  // Moderate boost for 500+ reviews
    } else {
      value += Math.min(30, Math.log10(reviewCount + 1) * 10); // Original calculation for lower counts
    }
    
    // CRITICAL: Massive bonus for tourist attractions (100 points)
    const isTouristAttraction = place.types.some(type => 
      type.toLowerCase().includes('tourist_attraction') ||
      type.toLowerCase().includes('point_of_interest')
    );
    if (isTouristAttraction) {
      value += 100; // Tourist attractions are must-see places
      // Additional bonus if it's a popular tourist attraction
      if (reviewCount >= 5000) {
        value += 100; // Double bonus for famous tourist attractions
      }
    }

    // Interest match bonus (0-40 points)
    value += place.matchScore * 10;

    // Interest coverage bonus (20 points for covering new interest)
    const matchedInterests = selectedInterests.filter(interest => 
      this.placeMatchesInterest(place, interest)
    );
    value += matchedInterests.length * 20;

    // JSON data bonus (5 points for having detailed data)
    if (place.popular_times?.typical_time_spent) {
      value += 5;
    }

    // Additional massive bonus for super high popularity places that match interests
    if (reviewCount >= 5000 && matchedInterests.length > 0) {
      value += 200; // Extra bonus for very popular places that match interests
    }

    return value;
  }

  /**
   * Estimate total time required for a place (visit + buffer for travel)
   */
  private estimateTimeRequired(place: PlaceRecommendation): number {
    const visitDuration = place.estimatedVisitDuration || 60;
    // Use actual travel time if available, otherwise use adaptive buffer
    const travelTime = place.travelTimeFromPrevious || Math.max(10, Math.round(visitDuration * 0.25));
    // Note: Return travel time is handled separately in time constraint functions
    // This function estimates individual place requirements for knapsack optimization
    return visitDuration + travelTime;
  }

  /**
   * Check if place matches specific interest
   */
  private placeMatchesInterest(place: PlaceRecommendation, interestId: string): boolean {
    const category = INTEREST_CATEGORIES.find(cat => cat.id === interestId);
    if (!category) return false;
    
    return place.types.some(type => 
      category.placeTypes.some(targetType => 
        type.toLowerCase().includes(targetType.toLowerCase())
      )
    );
  }

  /**
   * Optimize route order with time constraints using Google Distance Matrix.
   */
  private async optimizeRouteWithTimeConstraints(
    places: PlaceRecommendation[],
    startingAddress: string,
    availableHours: number,
    returnAddress?: string,
    hasDifferentReturn: boolean = false,
    date?: string,
    startTime?: string
  ): Promise<PlaceRecommendation[]> {
    if (places.length <= 1) return places;
    
    try {
      console.log(`🔄 Starting route optimization for ${places.length} places`);
      const optimizedRoute = await this.optimizeRoute(places, startingAddress, returnAddress, hasDifferentReturn, date, startTime);
      console.log(`✅ Route optimization succeeded, ${optimizedRoute.length} places optimized`);
      return this.adjustRouteForTimeConstraints(optimizedRoute, availableHours);
    } catch (error) {
      console.warn('❌ Route optimization failed, using fallback with basic travel time calculation:', error);
      
      // When optimization fails, we need to ensure travel times are set for fallback
      const fallbackRoute = await this.setBasicTravelTimes(places, startingAddress, date, startTime);
      console.log(`🔄 Fallback route created with ${fallbackRoute.length} places`);
      return this.adjustRouteForTimeConstraints(fallbackRoute, availableHours);
    }
  }

  /**
   * Set basic travel times for places when full optimization fails
   */
  private async setBasicTravelTimes(
    places: PlaceRecommendation[],
    startingAddress: string,
    date?: string,
    startTime?: string
  ): Promise<PlaceRecommendation[]> {
    if (places.length === 0) return places;

    const fallbackRoute = [...places]; // Copy the array
    let currentOrigin = startingAddress;

    for (let i = 0; i < fallbackRoute.length; i++) {
      const place = fallbackRoute[i];
      
      try {
        // Calculate departure time for this leg
        const departureTime = (date && startTime) ? 
          this.calculateDepartureTime(date, startTime, i * 45) : // Estimate 45min per previous place
          undefined;
          
        const travelResult = await DistanceMatrixService.calculateTravelTime(
          currentOrigin,
          DistanceMatrixService.getPlaceIdentifier(place, this.getCurrentCityInfo()),
          'driving',
          departureTime
        );
        
        place.travelTimeFromPrevious = travelResult.duration;
        place.distanceFromPrevious = Math.round(travelResult.distance / 1000);
        place.travelMode = travelResult.distance < 800 ? 'walking' : 'driving';
        
        console.log(`✅ FALLBACK: Set travel time for ${place.name}: ${place.travelTimeFromPrevious}min from ${currentOrigin.substring(0, 30)}`);
        
        // Update origin for next iteration
        currentOrigin = DistanceMatrixService.getPlaceIdentifier(place, this.getCurrentCityInfo());
        
      } catch (error) {
        console.error(`Failed to calculate travel time for ${place.name}:`, error);
        // Use conservative estimate as last resort
        place.travelTimeFromPrevious = i === 0 ? 25 : 15; // 25min from start, 15min between places
        place.distanceFromPrevious = 2; // 2km estimate
        place.travelMode = 'driving';
        place.travelCalculationFailed = true;
        place.travelError = `Fallback calculation failed: ${error.message}`;
      }
    }

    return fallbackRoute;
  }

  /**
   * Adjust route to ensure it fits within time constraints
   */
  private adjustRouteForTimeConstraints(
    places: PlaceRecommendation[],
    availableHours: number
  ): PlaceRecommendation[] {
    const availableMinutes = availableHours * 60;
    // Use same adaptive buffer as knapsack selection
    const returnTravelBuffer = Math.max(20, Math.round(availableMinutes * 0.1));
    const availableTimeForPlaces = availableMinutes - returnTravelBuffer; // Account for return travel
    const adjustedRoute: PlaceRecommendation[] = [];
    let cumulativeTime = 0;

    for (const place of places) {
      const visitDuration = place.estimatedVisitDuration || 60;
      let travelTime = place.travelTimeFromPrevious;
      
      if (travelTime === null || travelTime === undefined) {
        console.error(`❌ Travel time not available for ${place.name} - this should not happen after optimization`);
        // If travel time is missing, this indicates a serious issue in the optimization process
        // Mark the place as having failed travel calculation
        place.travelCalculationFailed = true;
        place.travelError = 'Travel time was not calculated during route optimization';
        
        // Skip this place rather than using a hardcoded estimate
        console.warn(`⚠️ SKIPPING ${place.name} due to missing travel time - cannot provide accurate time estimates`);
        continue;
      }
      
      const totalTimeForPlace = visitDuration + travelTime;

      // Check if adding this place would exceed available time (excluding return travel)
      if (cumulativeTime + totalTimeForPlace <= availableTimeForPlaces) {
        adjustedRoute.push(place);
        cumulativeTime += totalTimeForPlace;
      } else {
        // Try to fit a shorter version of the place
        const remainingTime = availableTimeForPlaces - cumulativeTime - travelTime;
        const minVisitTime = Math.min(15, place.estimatedVisitDuration || 15);
        if (remainingTime >= minVisitTime) { // Minimum meaningful visit time
          const adjustedPlace = {
            ...place,
            estimatedVisitDuration: Math.max(minVisitTime, remainingTime)
          };
          adjustedRoute.push(adjustedPlace);
          break; // This is the last place we can fit
        }
        break; // Cannot fit any more places
      }
    }

    return adjustedRoute;
  }

  /**
   * Original route optimization method using Google Distance Matrix
   */
  private async optimizeRoute(
    places: PlaceRecommendation[],
    startingAddress: string,
    returnAddress?: string,
    hasDifferentReturn: boolean = false,
    date?: string,
    startTime?: string
  ): Promise<PlaceRecommendation[]> {
    if (places.length <= 1) return places;
    let startCoords: { lat: number; lng: number } | undefined;
    try {
      const geocodeResult = await GoogleMapsService.geocodeAddress(startingAddress);
      if (!geocodeResult) {
        // Fallback to current city center if geocoding fails
        startCoords = this.getCurrentCityCenter();
      } else {
        startCoords = geocodeResult;
      }

      // Use place identifiers (names/addresses) instead of coordinates as requested
      const originIdentifiers = [
        startingAddress, // Use the actual starting address
        ...places.map(p => DistanceMatrixService.getPlaceIdentifier(p, this.getCurrentCityInfo()))
      ];
      const destinationIdentifiers = places.map(p => DistanceMatrixService.getPlaceIdentifier(p, this.getCurrentCityInfo()));

      // Calculate travel time matrix using the new DistanceMatrixService
      const matrix: Array<Array<{duration: number, distance: number}>> = [];
      
      // Debug: Log matrix dimensions
      console.log(`📊 Matrix dimensions will be: ${originIdentifiers.length} × ${destinationIdentifiers.length}`);
      console.log(`📊 Origins: ${originIdentifiers.length} (${originIdentifiers.map((o, i) => `${i}: ${o.substring(0, 20)}...`).join(', ')})`);
      console.log(`📊 Destinations: ${destinationIdentifiers.length} (${destinationIdentifiers.map((d, i) => `${i}: ${d.substring(0, 20)}...`).join(', ')})`);
      
      for (let originIndex = 0; originIndex < originIdentifiers.length; originIndex++) {
        const origin = originIdentifiers[originIndex];
        matrix[originIndex] = [];
        
        console.log(`📍 Calculating row ${originIndex} from origin: ${origin.substring(0, 30)}...`);
        
        // Calculate travel times from this origin to all destinations
        try {
          // Calculate departure time for this leg of the journey
          const departureTime = (date && startTime) ? 
            this.calculateDepartureTime(date, startTime, originIndex * 30) : // Estimate 30min per previous place
            undefined;
            
          const results = await DistanceMatrixService.calculateMultipleDestinations(
            origin,
            destinationIdentifiers,
            'driving',
            departureTime
          );
          
          console.log(`📍 Results for row ${originIndex}:`, results.map((r, i) => `${i}: ${r.duration}min`).join(', '));
          
          for (let destIndex = 0; destIndex < destinationIdentifiers.length; destIndex++) {
            const result = results[destIndex];
            if (result && result.duration !== undefined && result.distance !== undefined) {
              matrix[originIndex][destIndex] = {
                duration: result.duration,
                distance: result.distance
              };
            } else {
              console.error(`❌ Failed to get travel time from ${originIdentifiers[originIndex]} to ${destinationIdentifiers[destIndex]}:`, result);
              // Instead of fallback, mark this route as failed - optimization will exclude it
              matrix[originIndex][destIndex] = {
                duration: Infinity, // Mark as impossible route
                distance: Infinity, // Mark as impossible route
                failed: true
              };
            }
          }
        } catch (error) {
          console.error(`❌ Failed to calculate travel times for row ${originIndex}:`, error);
          // Mark all destinations from this origin as impossible routes
          for (let destIndex = 0; destIndex < destinationIdentifiers.length; destIndex++) {
            matrix[originIndex][destIndex] = {
              duration: Infinity, // Mark as impossible route  
              distance: Infinity, // Mark as impossible route
              failed: true
            };
          }
        }
      }

      // Verify matrix structure and count failed routes
      console.log(`🔍 Final matrix verification: ${matrix.length} × ${matrix[0]?.length || 0}`);
      let failedRoutes = 0;
      let totalRoutes = 0;
      
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          totalRoutes++;
          if (matrix[i][j].duration === undefined || matrix[i][j].distance === undefined) {
            console.error(`❌ Matrix has undefined values at [${i}][${j}]:`, matrix[i][j]);
            // Mark as failed route instead of fixing with hardcoded values
            matrix[i][j] = {
              duration: Infinity,
              distance: Infinity,
              failed: true
            };
            failedRoutes++;
          } else if (matrix[i][j].duration === Infinity) {
            failedRoutes++;
          }
        }
      }
      
      console.log(`📊 Matrix verification: ${failedRoutes}/${totalRoutes} routes failed travel time calculation`);
      
      if (failedRoutes === totalRoutes) {
        throw new Error('All travel time calculations failed - cannot optimize route without any valid travel times');
      }

      const optimized: PlaceRecommendation[] = [];
      const visited: boolean[] = new Array(places.length).fill(false);
      let currentOriginIndex = 0; // 0 corresponds to the starting address

      while (optimized.length < places.length) {
        let nextIndex = -1;
        let bestScore = Infinity;
        let bestDuration = 0;
        let bestDistance = 0;
        
        for (let i = 0; i < places.length; i++) {
          if (!visited[i]) {
            // Check bounds before accessing (safety check)
            if (currentOriginIndex >= matrix.length || i >= matrix[0]?.length) {
              console.error(`❌ Matrix bounds error: trying to access [${currentOriginIndex}][${i}] but matrix is ${matrix.length} × ${matrix[0]?.length || 0}`);
              continue;
            }
            
            const { duration, distance } = matrix[currentOriginIndex][i];
            
            // Check for invalid duration (undefined, null, or failed route)
            if (duration === undefined || duration === null || duration === Infinity || !isFinite(duration)) {
              console.warn(`⚠️ Invalid duration for route to ${places[i].name}: ${duration} - skipping this place`);
              continue; // Skip this place if we can't calculate travel time
            }
            
            // Enhanced scoring: prioritize nearby places and cluster relationships
            let score = duration; // Base score is travel time
            
            // Cluster bonus: If we're visiting a place in the same cluster as the last place
            if (optimized.length > 0) {
              const lastPlace = optimized[optimized.length - 1];
              const currentPlace = places[i];
              
              // Check if places are in the same cluster (within 0.8km)
              const lastCoords = this.getPlaceCoordinates(lastPlace);
              const currentCoords = this.getPlaceCoordinates(currentPlace);
              const distanceBetween = this.calculateDistance(
                lastCoords.latitude,
                lastCoords.longitude,
                currentCoords.latitude,
                currentCoords.longitude
              );
              
              if (distanceBetween <= 0.8) {
                score *= 0.7; // 30% bonus for staying in same cluster
                console.log(`🔗 Cluster bonus: ${currentPlace.name} is near ${lastPlace.name} (${distanceBetween.toFixed(2)}km)`);
              }
            }
            
            // Interest match bonus: prioritize places that match user interests
            const reviewCount = DataService.extractReviewCount(places[i].user_ratings_total?.toString() || '0');
            if (reviewCount >= 1000) {
              score *= 0.9; // 10% bonus for popular places
            }
            
            if (score < bestScore) {
              bestScore = score;
              nextIndex = i;
              bestDuration = duration; // Store the duration for the best choice
              bestDistance = distance; // Store the distance for the best choice
            }
          }
        }

        if (nextIndex === -1) break;

        visited[nextIndex] = true;
        const nextPlace = places[nextIndex];
        nextPlace.travelTimeFromPrevious = Math.max(0, Math.round(bestDuration)); // Already in minutes from DistanceMatrixService
        nextPlace.distanceFromPrevious = Math.max(0, Math.round(bestDistance / 1000)); // Convert meters to km
        nextPlace.travelMode = bestDistance < 800 ? 'walking' : 'driving'; // Add travel mode
        optimized.push(nextPlace);
        
        // Debug: Log the update
        console.log(`🎯 Selected place ${nextIndex} (${nextPlace.name}) - rawTravelTime: ${bestDuration}`);
        console.log(`📍 Current origin index was: ${currentOriginIndex}, will become: ${nextIndex + 1}`);
        console.log(`✅ ASSIGNED travelTimeFromPrevious to ${nextPlace.name}: ${nextPlace.travelTimeFromPrevious}min`);
        
        currentOriginIndex = nextIndex + 1; // next place row in matrix
      }

      // Debug: Final optimization results
      console.log(`🏁 OPTIMIZATION COMPLETE: Selected ${optimized.length} out of ${places.length} places`);
      optimized.forEach((place, index) => {
        console.log(`   ${index}: ${place.name} - travelTime: ${place.travelTimeFromPrevious}min`);
      });

      // Add travel icons and mode information based on the accurate travel times already calculated
      for (let i = 0; i < optimized.length; i++) {
        const place = optimized[i];
        
        // Set travel mode and icon based on distance (already calculated accurately from matrix)
        if (place.distanceFromPrevious && place.distanceFromPrevious < 0.8) {
          place.travelMode = 'walking';
          place.travelIcon = '🚶';
        } else {
          place.travelMode = 'driving';
          place.travelIcon = '🚗';
        }
        
        console.log(`✅ ${place.name}: ${place.travelTimeFromPrevious}min ${place.travelIcon} (${place.distanceFromPrevious}km)`);
      }

      // Calculate return journey time (last place back to return destination)
      if (optimized.length > 0) {
        const lastPlace = optimized[optimized.length - 1];
        const lastPlaceCoords = this.getPlaceCoordinates(lastPlace);
        const lastPlaceCoordsStr = `${lastPlaceCoords.latitude},${lastPlaceCoords.longitude}`;
        
        // Determine return destination address
        let destinationAddress: string;
        
        if (hasDifferentReturn && returnAddress) {
          // Different return location specified - use the return address directly
          destinationAddress = returnAddress;
          console.log(`🔄 Calculating return travel to different location: ${returnAddress}`);
        } else {
          // Return to starting location - use the starting address directly
          destinationAddress = startingAddress;
          console.log(`🔄 Calculating return travel to starting location: ${startingAddress}`);
        }
        
        try {
          // Get place identifiers for Distance Matrix API
          const originPlace = DistanceMatrixService.getPlaceIdentifier(lastPlace, this.getCurrentCityInfo());
          
          // Create a proper destination place object for getPlaceIdentifier
          const destinationPlace = {
            address: destinationAddress,
            name: destinationAddress
          };
          const destinationIdentifier = DistanceMatrixService.getPlaceIdentifier(destinationPlace, this.getCurrentCityInfo());
          
          // Calculate return travel time using place names/addresses
          // Estimate departure time for return journey (end of day)
          const returnDepartureTime = (date && startTime) ? 
            this.calculateDepartureTime(date, startTime, optimized.length * 60) : // Estimate 60min per place
            undefined;
            
          const returnTravelInfo = await DistanceMatrixService.calculateTravelTime(
            originPlace,
            destinationIdentifier,
            'driving',
            returnDepartureTime
          );
          // Store return travel info for later use in time calculations
          optimized[optimized.length - 1].returnTravelTime = returnTravelInfo.duration;
          optimized[optimized.length - 1].returnTravelMode = returnTravelInfo.mode;
          optimized[optimized.length - 1].returnTravelIcon = returnTravelInfo.mode === 'walking' ? '🚶' : '🚗';
          
          // Check if calculation failed
          if (returnTravelInfo.status !== 'OK') {
            optimized[optimized.length - 1].returnTravelCalculationFailed = true;
            optimized[optimized.length - 1].returnTravelError = `Return travel status: ${returnTravelInfo.status}`;
            console.warn(`⚠️ Return travel calculation issue: ${returnTravelInfo.status}`);
          }
          
          console.log(`✅ Return travel time calculated: ${returnTravelInfo.duration}min via ${returnTravelInfo.mode} to ${destinationAddress}`);
        } catch (error) {
          console.error(`❌ Failed to calculate return travel time: ${error.message}`);
          // Mark return travel as failed instead of using hardcoded fallback
          optimized[optimized.length - 1].returnTravelTime = null; // No fallback - show actual error
          optimized[optimized.length - 1].returnTravelCalculationFailed = true;
          optimized[optimized.length - 1].returnTravelError = `Return travel time calculation failed: ${error.message}`;
          
          console.warn(`⚠️ Return travel time unknown for ${optimized[optimized.length - 1].name} - user will see error message`);
        }
      }

      return optimized;
    } catch (error) {
      console.warn('Google routing failed, falling back to simple routing:', error);
      return await this.simpleOptimizeRoute(places, startingAddress, date, startTime);
    }
  }

  /**
   * Simple nearest neighbor fallback when Google routing is unavailable
   */
  private async simpleOptimizeRoute(
    places: PlaceRecommendation[],
    startingAddress: string,
    date?: string,
    startTime?: string
  ): Promise<PlaceRecommendation[]> {
    if (places.length <= 1) return places;

    const optimized: PlaceRecommendation[] = [];
    const remaining = [...places];

    // Get the first place using actual travel time calculation
    let currentOrigin = startingAddress;
    let current = remaining.shift()!;
    
    try {
      // Calculate departure time for the first place
      const departureTime = (date && startTime) ? 
        this.calculateDepartureTime(date, startTime, 0) : 
        undefined;
        
      const firstTravelResult = await DistanceMatrixService.calculateTravelTime(
        currentOrigin,
        DistanceMatrixService.getPlaceIdentifier(current, this.getCurrentCityInfo()),
        'driving',
        departureTime
      );
      current.travelTimeFromPrevious = firstTravelResult.duration;
      current.distanceFromPrevious = Math.round(firstTravelResult.distance / 1000); // Convert to km
    } catch (error) {
      console.error('Failed to calculate travel time for first place:', error);
      // Mark as failed instead of using hardcoded fallback
      current.travelCalculationFailed = true;
      current.travelError = `Travel time calculation failed: ${error.message}`;
      
      // Throw error to indicate that simple optimization cannot proceed without travel times
      throw new Error(`Cannot proceed with route optimization: Travel time calculation failed for ${current.name}`);
    }
    
    optimized.push(current);

    // Process remaining places using nearest-neighbor with actual travel times
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let shortestTravelTime = Infinity;

      // Try to calculate actual travel times to all remaining places
      const currentIdentifier = DistanceMatrixService.getPlaceIdentifier(current, this.getCurrentCityInfo());
      const remainingIdentifiers = remaining.map(p => DistanceMatrixService.getPlaceIdentifier(p, this.getCurrentCityInfo()));
      
      try {
        // Calculate departure time for subsequent places (cumulative time)
        const cumulativeMinutes = optimized.length * 60; // Estimate 60min per previous place
        const departureTime = (date && startTime) ? 
          this.calculateDepartureTime(date, startTime, cumulativeMinutes) : 
          undefined;
          
        const travelResults = await DistanceMatrixService.calculateMultipleDestinations(
          currentIdentifier,
          remainingIdentifiers,
          'driving',
          departureTime
        );

        // Find the place with shortest travel time
        travelResults.forEach((result, index) => {
          if (result.duration < shortestTravelTime) {
            shortestTravelTime = result.duration;
            nearestIndex = index;
          }
        });

        current = remaining.splice(nearestIndex, 1)[0];
        current.travelTimeFromPrevious = Math.max(0, Math.round(shortestTravelTime));
        current.distanceFromPrevious = Math.round(travelResults[nearestIndex].distance / 1000); // Convert to km
        
      } catch (error) {
        console.error('Failed to calculate travel times in simple optimization:', error);
        
        // Cannot proceed without actual travel time data
        // Mark remaining places as having failed travel calculation
        remaining.forEach(place => {
          place.travelCalculationFailed = true;
          place.travelError = `Travel time calculation failed during simple optimization: ${error.message}`;
        });
        
        // Stop processing remaining places rather than using inaccurate estimates
        console.error(`❌ Simple optimization failed - cannot calculate accurate travel times for remaining ${remaining.length} places`);
        break; // Exit the while loop
      }
      
      optimized.push(current);
    }

    return optimized;
  }

  /**
   * Generate timed schedule
   */
  private generateSchedule(
    places: PlaceRecommendation[], 
    startTime: string, 
    availableHours: number
  ) {
    const schedule: Array<{
      place: PlaceRecommendation;
      arrivalTime: string;
      departureTime: string;
      visitDuration: number;
    }> = [];
    let currentTime = this.parseTimeToMinutes(startTime);
    const endTime = currentTime + (availableHours * 60);
    
    places.forEach((place, index) => {
      // Early exit if we've reached the end time
      if (currentTime >= endTime) return;
      
      // Add travel time
      const travelTime = place.travelTimeFromPrevious || 0;
      const timeAfterTravel = currentTime + travelTime;
      
      // Check if we have enough time for travel + the requested visit duration
      const minVisitTime = Math.min(30, place.estimatedVisitDuration || 30);
      if (timeAfterTravel + minVisitTime > endTime) return;
      
      currentTime = timeAfterTravel;
      const arrivalTime = this.minutesToTimeString(currentTime);
      
      // Calculate visit duration - ensure it doesn't exceed remaining time
      const remainingTime = endTime - currentTime;
      const requestedDuration = place.estimatedVisitDuration || 60;
      const visitDuration = Math.min(requestedDuration, remainingTime);
      
      // Final check: ensure we don't exceed end time
      if (currentTime + visitDuration > endTime) {
        const maxVisitDuration = endTime - currentTime;
        const minAcceptableTime = Math.min(15, place.estimatedVisitDuration || 15);
        if (maxVisitDuration < minAcceptableTime) return; // Skip if less than minimum meaningful time
        
        schedule.push({
          place,
          arrivalTime,
          departureTime: this.minutesToTimeString(endTime),
          visitDuration: maxVisitDuration,
          travelTimeFromPrevious: place.travelTimeFromPrevious || 0,
          travelMode: place.travelMode,
          travelIcon: place.travelIcon
        });
        return; // This is the last place we can fit
      }
      
      const departureTime = this.minutesToTimeString(currentTime + visitDuration);
      
      schedule.push({
        place,
        arrivalTime,
        departureTime,
        visitDuration,
        travelTimeFromPrevious: place.travelTimeFromPrevious || 0,
        travelMode: place.travelMode,
        travelIcon: place.travelIcon
      });
      
      currentTime += visitDuration;
    });
    
    return schedule;
  }

  /**
   * Calculate visit duration based on place type
   */
  public calculateVisitDuration(place: PlaceData): number {
    // First try to get duration from JSON data
    const jsonDuration = this.extractVisitDurationFromJSON(place);
    if (jsonDuration > 0) {
      return jsonDuration;
    }
    
    // Fallback to type-based defaults
    const placeType = place.types[0]?.toLowerCase() || '';
    
    if (placeType.includes('museum')) return DEFAULT_VISIT_DURATIONS.museum;
    if (placeType.includes('park')) return DEFAULT_VISIT_DURATIONS.park;
    if (placeType.includes('historical')) return DEFAULT_VISIT_DURATIONS.historical;
    if (placeType.includes('restaurant')) return DEFAULT_VISIT_DURATIONS.restaurant;
    if (placeType.includes('store') || placeType.includes('market')) return DEFAULT_VISIT_DURATIONS.store;
    if (placeType.includes('tourist')) return DEFAULT_VISIT_DURATIONS.tourist_attraction;
    
    return DEFAULT_VISIT_DURATIONS.default;
  }

  /**
   * Extract visit duration from JSON popular_times data
   */
  public extractVisitDurationFromJSON(place: PlaceData): number {
    try {
      // Check if popular_times exists and has typical_time_spent
      const typicalTimeSpent = place.popular_times?.typical_time_spent;
      console.log(`🔍 Extracting visit duration for ${place.name}:`, {
        hasPopularTimes: !!place.popular_times,
        typicalTimeSpent,
        basicInfo: place.basic_info
      });
      
      if (typicalTimeSpent && typeof typicalTimeSpent === 'string') {
        const duration = this.parseDurationString(typicalTimeSpent);
        console.log(`✅ Extracted duration for ${place.name}: ${typicalTimeSpent} -> ${duration} minutes`);
        return duration;
      }
      
      // Also check if it's in basic_info (as user mentioned)
      const basicInfoDuration = (place.basic_info as any)?.typical_time_spent;
      if (basicInfoDuration && typeof basicInfoDuration === 'string') {
        const duration = this.parseDurationString(basicInfoDuration);
        console.log(`✅ Extracted duration from basic_info for ${place.name}: ${basicInfoDuration} -> ${duration} minutes`);
        return duration;
      }
      
      console.log(`❌ No visit duration found for ${place.name}`);
      return 0;
    } catch (error) {
      console.warn(`Error extracting visit duration for ${place.name}:`, error);
      return 0;
    }
  }

  /**
   * Parse duration string to minutes
   * Examples: "1 hour" -> 60, "45 min" -> 45, "2.5 hours" -> 150
   */
  private parseDurationString(durationStr: string): number {
    try {
      const str = durationStr.toLowerCase().trim();
      
      // Match patterns like "1 hour", "1.5 hours", "45 min", "30 minutes"
      const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*h(?:our|rs?)?/);
      const minMatch = str.match(/(\d+(?:\.\d+)?)\s*m(?:in|inute|inutes)?/);
      
      if (hourMatch) {
        return Math.round(parseFloat(hourMatch[1]) * 60);
      } else if (minMatch) {
        return Math.round(parseFloat(minMatch[1]));
      }
      
      // If no match found, return 0 to use fallback
      return 0;
    } catch (error) {
      console.warn(`Error parsing duration string "${durationStr}":`, error);
      return 0;
    }
  }

  /**
   * Find uncovered interests
   */
  private findUncoveredInterests(
    selectedInterests: string[], 
    places: PlaceRecommendation[]
  ): string[] {
    return selectedInterests.filter(interestId => 
      !places.some(place => this.placeMatchesInterest(place, interestId))
    );
  }

  /**
   * Find missed high-popularity places with reasons
   */
  private findMissedHighPopularityPlaces(
    allMatchingPlaces: PlaceRecommendation[],
    selectedPlaces: PlaceRecommendation[],
    selectedInterests: string[],
    date: string
  ): Array<{place: PlaceRecommendation; reason: string}> {
    const highPopularityPlaces = this.getHighPopularityPlaces(allMatchingPlaces);
    const selectedPlaceIds = new Set(selectedPlaces.map(p => p.place_id));
    
    const missedPlaces: Array<{place: PlaceRecommendation; reason: string}> = [];
    
    for (const place of highPopularityPlaces) {
      if (!selectedPlaceIds.has(place.place_id)) {
        // Determine why this place was missed
        let reason = '';
        
        // Check if it matches user interests
        const matchesInterests = selectedInterests.some(interest => 
          this.placeMatchesInterest(place, interest)
        );
        
        if (!matchesInterests) {
          reason = "doesn't match your selected interests";
        } else {
          // Check opening hours
          const isOpen = this.isPlaceOpenOnDate(place, date);
          if (!isOpen) {
            const workingHours = this.getPlaceHoursForDate(place, date);
            reason = `is closed on your visit date (${workingHours})`;
          } else {
            // Likely missed due to time constraints
            reason = 'was excluded due to time constraints - consider extending your available time';
          }
        }
        
        if (reason) {
          missedPlaces.push({ place, reason });
        }
      }
    }
    
    return missedPlaces.slice(0, 5); // Limit to top 5 missed popular places
  }

  /**
   * Check if place is open on specific date with detailed logging
   */
  private isPlaceOpenOnDate(place: PlaceRecommendation, date: string): boolean {
    try {
      // Use timezone-safe date parsing
      const dayOfWeek = this.getDayOfWeekSafe(date);
      const dayOfWeekCapitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
      
      if (!place.opening_hours) {
        if (reviewCount >= 2000) {
          console.log(`    ${place.name} on ${dayOfWeekCapitalized} (${date}): No hours data - assuming OPEN`);
        }
        return true; // Assume open if no hours data
      }
      
      if (typeof place.opening_hours === 'object') {
        const dayHours = place.opening_hours[dayOfWeek];
        const isOpen = dayHours && typeof dayHours === 'object' && dayHours.opens !== 'Closed';
        
        if (reviewCount >= 2000) {
          if (dayHours && typeof dayHours === 'object') {
            console.log(`    ${place.name} on ${dayOfWeekCapitalized} (${date}): ${dayHours.opens} - ${dayHours.closes} → ${isOpen ? 'OPEN' : 'CLOSED'}`);
          } else {
            console.log(`    ${place.name} on ${dayOfWeekCapitalized} (${date}): No data for this day → CLOSED`);
          }
        }
        
        return isOpen;
      }
      
      if (typeof place.opening_hours === 'string') {
        const hoursText = place.opening_hours.toLowerCase();
        const isOpen = !hoursText.includes('closed') || !hoursText.includes(dayOfWeek);
        
        if (reviewCount >= 2000) {
          console.log(`    ${place.name} on ${dayOfWeekCapitalized} (${date}): "${place.opening_hours}" → ${isOpen ? 'OPEN' : 'CLOSED'}`);
        }
        
        return isOpen;
      }
      
      return true;
    } catch (error) {
      console.warn(`Error checking hours for ${place.name} on ${date}:`, error);
      return true; // Assume open if parsing fails
    }
  }

  /**
   * Get place hours for specific date
   */
  private getPlaceHoursForDate(place: PlaceRecommendation, date: string): string {
    try {
      const dayOfWeek = this.getDayOfWeekSafe(date);
      
      if (!place.opening_hours) return 'Hours not available';
      
      if (typeof place.opening_hours === 'object') {
        const dayHours = place.opening_hours[dayOfWeek];
        if (dayHours && typeof dayHours === 'object') {
          return dayHours.opens === 'Closed' ? 'Closed' : `${dayHours.opens} - ${dayHours.closes}`;
        }
      }
      
      if (typeof place.opening_hours === 'string') {
        return place.opening_hours;
      }
      
      return 'Hours not available';
    } catch (error) {
      return 'Hours not available';
    }
  }

  /**
   * Generate optimization notes
   */
  private generateOptimizationNotes(
    places: PlaceRecommendation[], 
    formData: ItineraryFormData
  ): string[] {
    const notes = [];
    
    if (places.length < formData.selectedInterests.length) {
      notes.push(`Selected ${places.length} places to fit within ${formData.availableHours} hours`);
    }
    
    if (places.some(place => place.travelTimeFromPrevious && place.travelTimeFromPrevious > 15)) {
      notes.push('Route optimized to minimize travel time between locations');
    }
    
    const avgRating = places.reduce((sum, place) => 
      sum + DataService.extractRating(place.rating), 0) / places.length;
    
    if (avgRating >= 4.5) {
      notes.push('Selected high-rated attractions (4.5+ stars average)');
    }
    
    return notes;
  }

  /**
   * Parse time string to minutes from midnight
   */
  private parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * Convert minutes to time string
   */
  private minutesToTimeString(minutes: number): string {
    // Ensure valid numeric input
    const validMinutes = Math.max(0, Math.floor(minutes || 0));
    const hours = Math.floor(validMinutes / 60) % 24; // Wrap hours to 24-hour format
    const mins = validMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Parse flexible time strings like "9 AM", "5:30PM" or "17:00" to minutes
   * from midnight. Returns NaN if parsing fails.
   */
  private parseFlexibleTime(timeStr: string): number {
    if (!timeStr) return NaN;
    // Normalize strange spaces and trim
    const cleaned = timeStr.replace(/[\u202f\u00a0]/g, ' ').trim().toLowerCase();

    // 24 hour format e.g. 17:00
    const twentyFour = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFour) {
      const h = parseInt(twentyFour[1], 10);
      const m = parseInt(twentyFour[2], 10);
      return h * 60 + m;
    }

    // 12 hour format with optional minutes
    const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2] || '0', 10);
      const ampm = (match[3] || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return h * 60 + m;
    }

    return NaN;
  }

  /**
   * Parse split opening hours like "12, 5" and "3 PM, 11 PM" to get time periods
   * Returns array of {opens, closes} periods for places with split hours
   */
  private parseSplitHours(opensStr: string, closesStr: string): Array<{opens: number, closes: number}> {
    const periods: Array<{opens: number, closes: number}> = [];
    
    // Split by comma and clean up
    const openTimes = opensStr.split(',').map(t => t.trim());
    const closeTimes = closesStr.split(',').map(t => t.trim());
    
    // Match opening and closing times
    for (let i = 0; i < Math.min(openTimes.length, closeTimes.length); i++) {
      const openMins = this.parseFlexibleTime(openTimes[i]);
      const closeMins = this.parseFlexibleTime(closeTimes[i]);
      
      if (!isNaN(openMins) && !isNaN(closeMins)) {
        periods.push({ opens: openMins, closes: closeMins });
      }
    }
    
    return periods;
  }

  /**
   * Check if a given time (in minutes from midnight) falls within any of the operating periods
   */
  private isTimeWithinOperatingHours(timeInMinutes: number, periods: Array<{opens: number, closes: number}>): boolean {
    return periods.some(period => {
      return timeInMinutes >= period.opens && timeInMinutes <= period.closes;
    });
  }

  /**
   * Get opening and closing times for a place on a given date in minutes.
   * Now supports split hours (e.g., lunch and dinner periods)
   */
  private getOpeningHoursForDateInMinutes(
    place: PlaceRecommendation,
    date: string
  ): { opens: number; closes: number; periods?: Array<{opens: number, closes: number}> } | null {
    try {
      if (!place.opening_hours || typeof place.opening_hours !== 'object') {
        return null;
      }

      const dayKey = this.getDayOfWeekSafe(date);
      const dayHours: any = (place.opening_hours as any)[dayKey];
      if (!dayHours || dayHours.opens === 'Closed') return null;

      // Check if this place has split hours (contains commas)
      if (dayHours.opens && dayHours.closes && 
          (dayHours.opens.includes(',') || dayHours.closes.includes(','))) {
        
        const periods = this.parseSplitHours(dayHours.opens, dayHours.closes);
        if (periods.length > 0) {
          // Return the earliest opening and latest closing for compatibility
          const earliestOpen = Math.min(...periods.map(p => p.opens));
          const latestClose = Math.max(...periods.map(p => p.closes));
          
          return { 
            opens: earliestOpen, 
            closes: latestClose,
            periods: periods  // Include detailed periods for advanced scheduling
          };
        }
      }

      // Handle regular single-period hours
      const openMins = this.parseFlexibleTime(dayHours.opens);
      const closeMins = this.parseFlexibleTime(dayHours.closes);
      if (isNaN(openMins) || isNaN(closeMins)) return null;

      return { opens: openMins, closes: closeMins };
    } catch (err) {
      return null;
    }
  }

  /**
   * Calculate precise time metrics with mathematical accuracy
   * 
   * Time Components:
   * 1. Visiting Time: Sum of all place visit durations
   * 2. Travel Time: Start→First + Place-to-Place + Last→Return
   * 3. Total Duration: Visiting Time + Travel Time
   */
  private calculatePreciseTimeMetrics(
    route: PlaceRecommendation[],
    startingAddress: string,
    returnAddress?: string,
    hasDifferentReturn: boolean = false
  ): {
    visitingTime: number;
    travelTime: number;
    totalDuration: number;
    breakdown: {
      startToFirst: number;
      placesToPlaces: number;
      lastToReturn: number;
    };
  } {
    // 1. Calculate pure visiting time (sum of all visit durations)
    const visitingTime = route.reduce((sum, place) => {
      return sum + (place.estimatedVisitDuration || 60);
    }, 0);

    // 2. Calculate comprehensive travel time
    let startToFirst = 0;
    let placesToPlaces = 0;
    let lastToReturn = 0;

    if (route.length > 0) {
      // Travel from starting address to first place
      const firstPlaceTravelTime = route[0].travelTimeFromPrevious;
      console.log(`🔍 DEBUG: First place ${route[0].name} has travelTimeFromPrevious: ${firstPlaceTravelTime}`);
      if (firstPlaceTravelTime === null || firstPlaceTravelTime === undefined) {
        console.error(`❌ Travel time not calculated for first place: ${route[0].name} - this indicates optimization failure`);
        // Return null to indicate calculation failure instead of using estimate
        startToFirst = null;
      } else {
        startToFirst = firstPlaceTravelTime;
      }

      // Travel between places
      for (let i = 1; i < route.length; i++) {
        const travelTime = route[i].travelTimeFromPrevious;
        if (travelTime === null || travelTime === undefined) {
          console.warn(`⚠️ Travel time not available between ${route[i-1].name} → ${route[i].name}, using 20min estimate`);
          placesToPlaces += 20;
        } else {
          placesToPlaces += travelTime;
        }
      }

      // Travel from last place back to start OR to different return address
      if (route.length > 0) {
        const lastPlace = route[route.length - 1];
        // Use the accurately calculated return travel time from optimization
        lastToReturn = lastPlace.returnTravelTime || startToFirst; // Use actual calculated time or fallback
        
        if (hasDifferentReturn && returnAddress) {
          console.log(`🔄 Using calculated return travel time to different location: ${lastToReturn}min`);
        } else {
          console.log(`🔄 Using calculated return travel time to starting point: ${lastToReturn}min`);
        }
      }
    }

    const travelTime = startToFirst + placesToPlaces + lastToReturn;
    const totalDuration = visitingTime + travelTime;

    return {
      visitingTime,
      travelTime,
      totalDuration,
      breakdown: {
        startToFirst,
        placesToPlaces,
        lastToReturn
      }
    };
  }

  /**
   * Advanced optimization algorithm for time constraints using dynamic programming
   * and mathematical optimization principles
   */
  private async optimizeForTimeConstraints(
    route: PlaceRecommendation[],
    startingAddress: string,
    returnAddress?: string,
    hasDifferentReturn: boolean = false,
    availableMinutes: number = 0
  ): Promise<PlaceRecommendation[]> {
    
    // Phase 1: Binary search for optimal number of places
    const maxPlaces = Math.min(route.length, 16);
    let optimalPlaceCount = this.binarySearchOptimalPlaceCount(route, availableMinutes, maxPlaces);
    
    // Phase 2: Select best places using value optimization
    const selectedPlaces = route.slice(0, optimalPlaceCount);
    
    // Phase 3: Apply intelligent visit duration adjustment algorithm
    return this.optimizeVisitDurations(selectedPlaces, availableMinutes, hasDifferentReturn);
  }

  /**
   * Binary search algorithm to find optimal number of places
   */
  private binarySearchOptimalPlaceCount(
    route: PlaceRecommendation[],
    availableMinutes: number,
    maxPlaces: number
  ): number {
    let left = 1;
    let right = maxPlaces;
    let optimal = 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testRoute = route.slice(0, mid);
      
      // Calculate minimum time needed for this number of places
      const minTimeNeeded = this.calculateMinimumTimeRequired(testRoute);
      
      if (minTimeNeeded <= availableMinutes) {
        optimal = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return optimal;
  }

  /**
   * Calculate minimum time required for a route (with minimal visit times)
   * Now includes return travel time in the calculation
   */
  private calculateMinimumTimeRequired(route: PlaceRecommendation[]): number {
    const minVisitTime = 15; // Minimum meaningful visit
    
    if (route.length === 0) return 0;
    
    const totalMinVisitTime = route.length * minVisitTime;
    // Calculate travel time using actual travel times when available
    const totalTravelTime = route.reduce((sum, place) => {
      const travelTime = place.travelTimeFromPrevious;
      if (travelTime === null || travelTime === undefined) {
        throw new Error(`Travel time not available for place ${place.name} during route time estimation`);
      }
      return sum + travelTime;
    }, 0);
    
    // Add return travel time
    const returnTravelTime = route.length > 0 ? (route[route.length - 1].returnTravelTime || 
      (() => { throw new Error('Return travel time not available during route time estimation'); })()) : 0;
    
    return totalMinVisitTime + totalTravelTime + returnTravelTime;
  }

  /**
   * Optimize visit durations using mathematical optimization
   * This uses a greedy approach with proportional allocation
   */
  private optimizeVisitDurations(
    places: PlaceRecommendation[],
    availableMinutes: number,
    _hasDifferentReturn: boolean
  ): PlaceRecommendation[] {
    if (places.length === 0) return [];

    const minVisitTime = 15;
    
    // Calculate total travel time using actual travel times when available
    // Always include return travel time, regardless of different return location
    const travelBetweenPlaces = places.reduce((sum, place) => {
      if (place.travelTimeFromPrevious) {
        return sum + place.travelTimeFromPrevious;
      }
      // If no travel time available, throw error - this should not happen after route optimization
      throw new Error(`Travel time not available for place ${place.name} during visit duration optimization`);
    }, 0);
    
    const returnTravelTime = places.length > 0 ? (places[places.length - 1].returnTravelTime || 
      (() => { throw new Error('Return travel time not available during visit duration optimization'); })()) : 0;
    const totalTravelTime = travelBetweenPlaces + returnTravelTime;
    
    // Available time for visits
    const availableVisitTime = availableMinutes - totalTravelTime;
    
    if (availableVisitTime < places.length * minVisitTime) {
      // Reduce number of places if not enough time
      const maxPlacesForTime = Math.floor(availableVisitTime / minVisitTime);
      places = places.slice(0, Math.max(1, maxPlacesForTime));
    }

    // Get original visit durations
    const originalDurations = places.map(place => place.estimatedVisitDuration || 60);
    const totalOriginalTime = originalDurations.reduce((sum, duration) => sum + duration, 0);
    
    // Apply proportional scaling if needed
    const scalingFactor = Math.min(1.0, (availableVisitTime - places.length * minVisitTime) / (totalOriginalTime - places.length * minVisitTime));
    
    return places.map((place, index) => {
      const originalDuration = originalDurations[index];
      const scaledDuration = minVisitTime + (originalDuration - minVisitTime) * scalingFactor;
      
      return {
        ...place,
        estimatedVisitDuration: Math.max(minVisitTime, Math.round(scaledDuration)),
        travelTimeFromPrevious: place.travelTimeFromPrevious || 
          (() => { throw new Error(`Travel time not available for place ${place.name} during visit duration optimization`); })()
      };
    });
  }

  /**
   * Generate optimized schedule with precise timing
   */
  private generateOptimizedSchedule(
    places: PlaceRecommendation[],
    startTime: string,
    availableHours: number,
    date: string,
    allCandidatePlaces?: PlaceRecommendation[],
    selectedInterests?: string[]
  ) {
    const schedule: Array<{
      place: PlaceRecommendation;
      arrivalTime: string;
      departureTime: string;
      visitDuration: number;
    }> = [];
    let currentTime = this.parseTimeToMinutes(startTime);
    const endTime = currentTime + (availableHours * 60);
    
    places.forEach((place, index) => {
      // Add travel time before arriving at this place
      const travelTime = place.travelTimeFromPrevious || 0;
      
      // Calculate arrival time: current departure time + travel time
      let arrival = currentTime + travelTime;
      const duration = place.estimatedVisitDuration || 60;
      
      // STRICT TIME CONSTRAINT: Ensure the entire visit (including departure) fits before endTime
      // Only check return travel time for last place in the route
      const departureTime = arrival + duration;
      let timeNeededIncludingReturn = departureTime;
      
      // For the last place, we need to account for return travel time
      if (index === places.length - 1 && place.returnTravelTime) {
        timeNeededIncludingReturn += place.returnTravelTime;
      }
      
      if (timeNeededIncludingReturn > endTime) {
        const returnTimeInfo = (index === places.length - 1 && place.returnTravelTime) ? `, including ${place.returnTravelTime}min return travel` : '';
        console.log(`⏰ SKIPPING ${place.name}: visit would end at ${this.minutesToTimeString(departureTime)}${returnTimeInfo}. EndTime: ${this.minutesToTimeString(endTime)}`);
        return; // Skip this place as it would exceed available time
      }

      // ADDITIONAL CHECK: Ensure place is not marked as "Closed" for this day
      const dayOfWeek = this.getDayOfWeekSafe(date);
      if (place.opening_hours && typeof place.opening_hours === 'object') {
        const dayHours = (place.opening_hours as any)[dayOfWeek];
        if (dayHours && dayHours.opens === 'Closed') {
          console.log(`🚫 SKIPPING ${place.name}: marked as CLOSED on ${dayOfWeek}`);
          return; // place is closed on this day
        }
      }

      const hours = this.getOpeningHoursForDateInMinutes(place, date);
      if (hours) {
        // Handle split hours (e.g., lunch and dinner periods)
        if (hours.periods && hours.periods.length > 0) {
          // Find the best period for this arrival time
          let bestPeriod = null;
          let adjustedArrival = arrival;
          
          for (const period of hours.periods) {
            if (arrival >= period.opens && arrival + duration <= period.closes) {
              // Arrival fits perfectly in this period
              bestPeriod = period;
              adjustedArrival = arrival;
              break;
            } else if (arrival < period.opens && period.opens + duration <= period.closes) {
              // Can schedule at start of this period
              bestPeriod = period;
              adjustedArrival = period.opens;
              break;
            }
          }
          
          if (!bestPeriod) {
            console.log(`⏰ SKIPPING ${place.name}: no suitable period for ${this.minutesToTimeString(arrival)}-${this.minutesToTimeString(arrival + duration)} (periods: ${hours.periods.map(p => `${this.minutesToTimeString(p.opens)}-${this.minutesToTimeString(p.closes)}`).join(', ')})`);
            return; // No suitable operating period
          }
          
          arrival = adjustedArrival;
          console.log(`✅ SCHEDULED ${place.name} (split hours): arrival ${this.minutesToTimeString(arrival)}, departure ${this.minutesToTimeString(arrival + duration)} in period ${this.minutesToTimeString(bestPeriod.opens)}-${this.minutesToTimeString(bestPeriod.closes)}`);
        } else {
          // Handle regular single-period hours
          if (arrival < hours.opens) arrival = hours.opens;
          
          // Check if there's enough time for a meaningful visit before closing
          const requiredVisitTime = duration;
          const latestArrivalTime = hours.closes - requiredVisitTime;
          
          if (arrival > latestArrivalTime) {
            console.log(`⏰ SKIPPING ${place.name}: arrives at ${this.minutesToTimeString(arrival)}, closes at ${this.minutesToTimeString(hours.closes)}, needs ${duration}min visit time`);
            return; // not enough time for meaningful visit
          }
          
          // Additional check: Ensure arrival is not at or after closing time
          if (arrival >= hours.closes) {
            console.log(`⏰ SKIPPING ${place.name}: arrives at ${this.minutesToTimeString(arrival)}, but closes at ${this.minutesToTimeString(hours.closes)}`);
            return; // place would be closed
          }
          
          console.log(`✅ SCHEDULED ${place.name}: arrival ${this.minutesToTimeString(arrival)}, departure ${this.minutesToTimeString(arrival + duration)}, closes ${this.minutesToTimeString(hours.closes)}`);
        }
      }

      // This check is now redundant since we have the stricter check above,
      // but keeping it for safety with return travel time consideration
      if (arrival + duration + returnTravelTime > endTime) return; // not enough remaining time including return travel

      schedule.push({
        place,
        arrivalTime: this.minutesToTimeString(arrival),
        departureTime: this.minutesToTimeString(arrival + duration),
        visitDuration: duration,
        travelTimeFromPrevious: travelTime,
        travelMode: place.travelMode,
        travelIcon: place.travelIcon
      });

      // Update currentTime to departure time for next iteration
      currentTime = arrival + duration;
    });
    
    // Fill remaining time with additional places if available
    // Account for return travel time when calculating remaining time
    const lastPlace = schedule.length > 0 ? schedule[schedule.length - 1].place : null;
    const returnTravelTime = lastPlace?.returnTravelTime || 20; // Use reasonable buffer if return time unknown
    const remainingTime = endTime - currentTime - returnTravelTime;
    if (remainingTime > 45 && allCandidatePlaces) { // At least 45 minutes left after return travel
      console.log(`\n🕐 FILLING REMAINING TIME: ${remainingTime} minutes available (${returnTravelTime}min reserved for return travel)`);
      this.fillRemainingTimeWithPlaces(schedule, currentTime, endTime, date, allCandidatePlaces, selectedInterests);
    }
    
    return schedule;
  }

  /**
   * Fill remaining time with additional places that fit the available time
   */
  private fillRemainingTimeWithPlaces(
    schedule: Array<{
      place: PlaceRecommendation;
      arrivalTime: string;
      departureTime: string;
      visitDuration: number;
    }>,
    currentTime: number,
    endTime: number,
    date: string,
    allPlaces: PlaceRecommendation[],
    selectedInterests?: string[]
  ) {
    const scheduledPlaceIds = new Set(schedule.map(item => item.place.place_id));
    const remainingTime = endTime - currentTime;
    
    // Find unscheduled places that could fit in remaining time
    console.log(`\n🔍 === FILL REMAINING TIME DEBUG ===`);
    console.log(`Scheduled place IDs in current day: ${Array.from(scheduledPlaceIds).join(', ')}`);
    console.log(`Total candidate places available: ${allPlaces.length}`);
    
    const candidatePlaces = allPlaces
      .filter(place => {
        const isScheduled = scheduledPlaceIds.has(place.place_id);
        if (isScheduled) {
          console.log(`  ❌ Skipping ${place.name} - already scheduled today`);
        }
        return !isScheduled;
      })
      .filter(place => {
        // STRICT INTEREST FILTERING: Only include places that match selected interests
        if (selectedInterests && selectedInterests.length > 0) {
          // First check if place matches any selected interests
          const matchesSelectedInterests = selectedInterests.some(interestId => 
            this.placeMatchesInterest(place, interestId)
          );
          
          if (!matchesSelectedInterests) return false;
          
          // NEGATIVE FILTERING: Exclude places that primarily belong to unselected categories
          // If parks is not selected, exclude places that are primarily parks
          if (!selectedInterests.includes('parks')) {
            const isPrimaryPark = place.types.some(type => {
              const lowerType = type.toLowerCase();
              return lowerType.includes('park') || 
                     lowerType.includes('zoo') || 
                     lowerType.includes('garden') ||
                     lowerType === 'park' ||
                     lowerType === 'zoo' ||
                     lowerType === 'garden';
            });
            if (isPrimaryPark) {
              console.log(`🚫 REMAINING TIME EXCLUDING park ${place.name} - parks not selected, types: ${place.types.join(', ')}`);
              return false;
            }
          }
          
          // If museums is not selected, exclude places that are primarily museums
          if (!selectedInterests.includes('museums')) {
            const isPrimaryMuseum = place.types.some(type => {
              const lowerType = type.toLowerCase();
              return lowerType.includes('museum') || 
                     lowerType.includes('art_gallery') ||
                     lowerType === 'museum' ||
                     lowerType === 'art_gallery';
            });
            if (isPrimaryMuseum) {
              console.log(`🚫 REMAINING TIME EXCLUDING museum ${place.name} - museums not selected, types: ${place.types.join(', ')}`);
              return false;
            }
          }
          
          return true;
        }
        // Fallback: Only include places with strong match scores if no interests provided
        return place.matchScore >= 3;
      })
      .filter(place => {
        // Check if place is open
        const hours = this.getOpeningHoursForDateInMinutes(place, date);
        if (hours) {
          const duration = place.estimatedVisitDuration || 60;
          const latestArrivalTime = hours.closes - duration;
          return currentTime <= latestArrivalTime;
        }
        return true;
      })
      .filter(place => {
        // Must fit in remaining time (including travel time buffer AND return travel)
        const duration = place.estimatedVisitDuration || 60;
        const travelTime = place.travelTimeFromPrevious || Math.max(10, Math.round(duration * 0.25)); // Adaptive buffer
        const returnTravelTime = place.returnTravelTime || Math.max(15, Math.round(duration * 0.3)); // Adaptive return buffer
        const totalTimeNeeded = duration + travelTime + returnTravelTime;
        return totalTimeNeeded <= remainingTime;
      })
      .sort((a, b) => {
        // Primary: Number of reviews (prioritize popular places)
        const reviewsA = DataService.extractReviewCount(a.user_ratings_total?.toString() || '0');
        const reviewsB = DataService.extractReviewCount(b.user_ratings_total?.toString() || '0');
        
        // If significant difference in reviews, use that
        if (Math.abs(reviewsB - reviewsA) > 1000) {
          return reviewsB - reviewsA;
        }
        
        // Secondary: Interest match score
        if (Math.abs(b.matchScore - a.matchScore) > 0.5) {
          return b.matchScore - a.matchScore;
        }
        
        // Tertiary: How well they fit the remaining time
        const durationA = a.estimatedVisitDuration || 60;
        const durationB = b.estimatedVisitDuration || 60;
        const fitA = Math.abs(remainingTime - durationA);
        const fitB = Math.abs(remainingTime - durationB);
        return fitA - fitB;
      });

    console.log(`📍 Found ${candidatePlaces.length} candidate places for remaining ${remainingTime} minutes`);
    console.log(`🎯 Filtering by selected interests: ${selectedInterests ? selectedInterests.join(', ') : 'None provided'}`);
    
    // Log top candidates for debugging
    if (candidatePlaces.length > 0) {
      console.log('=== TOP CANDIDATE PLACES FOR REMAINING TIME ===');
      candidatePlaces.slice(0, 8).forEach((place, index) => {
        const reviewCount = DataService.extractReviewCount(place.user_ratings_total?.toString() || '0');
        const duration = place.estimatedVisitDuration || 60;
        const types = place.types?.slice(0, 2).join(', ') || 'Unknown';
        const matchingInterests = selectedInterests?.filter(interestId => 
          this.placeMatchesInterest(place, interestId)
        ).join(', ') || 'None';
        console.log(`${index + 1}. ${place.name}: ${reviewCount.toLocaleString()} reviews, ${duration}min visit, ${types}, matches: ${matchingInterests}`);
      });
      console.log('==============================================');
    }
    
    // Add places that fit in remaining time (accounting for return travel)
    let timeLeft = remainingTime;
    for (const place of candidatePlaces) {
      const duration = place.estimatedVisitDuration || 60;
      const travelTime = place.travelTimeFromPrevious || Math.max(10, Math.round(duration * 0.25)); // Adaptive buffer
      const returnTravelTime = place.returnTravelTime || Math.max(15, Math.round(duration * 0.3)); // Adaptive return buffer
      const totalTime = duration + travelTime + returnTravelTime;
      
      if (totalTime <= timeLeft) {
        const arrival = currentTime + travelTime;
        
        // FIRST CHECK: Ensure place is not marked as "Closed" for this day
        const dayOfWeek = this.getDayOfWeekSafe(date);
        if (place.opening_hours && typeof place.opening_hours === 'object') {
          const dayHours = (place.opening_hours as any)[dayOfWeek];
          if (dayHours && dayHours.opens === 'Closed') {
            console.log(`🚫 REMAINING TIME SKIPPING ${place.name}: marked as CLOSED on ${dayOfWeek}`);
            continue;
          }
        }

        // STRICT VALIDATION: Ensure place is actually open when we would arrive
        const hours = this.getOpeningHoursForDateInMinutes(place, date);
        if (hours) {
          // Check 1: Must arrive before closing time minus visit duration
          const latestArrivalTime = hours.closes - duration;
          if (arrival > latestArrivalTime) {
            console.log(`⏰ SKIPPING ${place.name}: would arrive at ${this.minutesToTimeString(arrival)}, but needs ${duration}min visit time, closes at ${this.minutesToTimeString(hours.closes)}`);
            continue;
          }
          
          // Check 2: Must arrive after opening time
          if (arrival < hours.opens) {
            console.log(`⏰ SKIPPING ${place.name}: would arrive at ${this.minutesToTimeString(arrival)}, but doesn't open until ${this.minutesToTimeString(hours.opens)}`);
            continue;
          }
          
          // Check 3: Place must still be open at arrival time
          if (arrival >= hours.closes) {
            console.log(`⏰ SKIPPING ${place.name}: would arrive at ${this.minutesToTimeString(arrival)}, but closes at ${this.minutesToTimeString(hours.closes)}`);
            continue;
          }
        }
        
        // Calculate travel time from the last place in the schedule to this new place
        let travelTimeFromPrevious = travelTime; // Use the calculated travel time from distance matrix
        if (schedule.length > 0) {
          const lastPlace = schedule[schedule.length - 1].place;
          // For now, use the estimated travel time. In a full implementation, you could
          // call DistanceMatrixService.calculateTravelTime here for more accuracy
          travelTimeFromPrevious = travelTime;
        }

        // IMPORTANT: Set travel time on the place object itself so calculatePreciseTimeMetrics can find it
        place.travelTimeFromPrevious = travelTimeFromPrevious;
        place.travelMode = place.travelMode || 'driving'; // Set to driving instead of walking for 15min+ travel
        place.travelIcon = place.travelIcon || '🚗';
        
        console.log(`🔧 FILL REMAINING TIME - Setting travel data for ${place.name}:`, {
          travelTimeFromPrevious: place.travelTimeFromPrevious,
          travelMode: place.travelMode,
          travelIcon: place.travelIcon
        });

        schedule.push({
          place,
          arrivalTime: this.minutesToTimeString(arrival),
          departureTime: this.minutesToTimeString(arrival + duration),
          visitDuration: duration,
          travelTimeFromPrevious: travelTimeFromPrevious,
          travelMode: place.travelMode || 'walking',
          travelIcon: place.travelIcon || '🚶'
        });
        
        currentTime = arrival + duration;
        // Reserve return travel time when calculating remaining time
        timeLeft = endTime - currentTime - returnTravelTime;
        
        console.log(`✅ ADDED ${place.name} (${place.place_id}) (${duration}min) - ${timeLeft}min remaining (${returnTravelTime}min reserved for return)`);
        
        // Stop if less than 30 minutes left after accounting for return travel
        if (timeLeft < 30) break;
      }
    }
  }

  /**
   * Adjust schedule when total duration exceeds available time by reducing visit times
   * for places with more than 2 hours and adding warnings
   */
  private adjustScheduleTimeWithWarnings(
    schedule: Array<{
      place: PlaceRecommendation;
      arrivalTime: string;
      departureTime: string;
      visitDuration: number;
    }>,
    timeMetrics: any,
    availableMinutes: number,
    dayNumber: number
  ): Array<{
    place: PlaceRecommendation;
    arrivalTime: string;
    departureTime: string;
    visitDuration: number;
    warning?: string;
  }> {
    const overage = timeMetrics.totalDuration - availableMinutes;
    console.log(`⚠️  Need to reduce ${overage} minutes from Day ${dayNumber} schedule`);
    
    // Find places with more than 2 hours (120 minutes) visit time
    const longVisitPlaces = schedule.filter(item => item.visitDuration > 120);
    
    if (longVisitPlaces.length === 0) {
      console.log(`⚠️  No places with 2+ hour visits to reduce. Keeping schedule as is.`);
      return schedule.map(item => ({ ...item })); // Return unchanged
    }
    
    // Calculate total time that can be reduced (only from places with 2+ hours)
    const totalReducibleTime = longVisitPlaces.reduce((sum, item) => {
      return sum + Math.max(0, item.visitDuration - 120); // Can reduce down to 2 hours (120 min)
    }, 0);
    
    if (totalReducibleTime < overage) {
      console.log(`⚠️  Can only reduce ${totalReducibleTime}min but need ${overage}min. Reducing as much as possible.`);
    }
    
    const actualReduction = Math.min(overage, totalReducibleTime);
    
    // Create adjusted schedule with warnings
    const adjustedSchedule = schedule.map(item => {
      if (item.visitDuration <= 120) {
        // Place has 2 hours or less - no reduction needed
        return { ...item };
      }
      
      // Calculate this place's share of the reduction (proportional to excess time)
      const excessTime = item.visitDuration - 120;
      const reductionShare = (excessTime / totalReducibleTime) * actualReduction;
      const newDuration = Math.round(item.visitDuration - reductionShare);
      const finalDuration = Math.max(120, newDuration); // Don't go below 2 hours
      
      const actualReduced = item.visitDuration - finalDuration;
      
      if (actualReduced > 0) {
        const originalHours = (item.visitDuration / 60).toFixed(1);
        const newHours = (finalDuration / 60).toFixed(1);
        
        console.log(`🔧 Reducing ${item.place.name}: ${originalHours}h → ${newHours}h (reduced ${actualReduced}min)`);
        
        return {
          ...item,
          visitDuration: finalDuration,
          warning: `⚠️ Due to time constraints, spending ${newHours}h here instead of recommended ${originalHours}h`
        };
      }
      
      return { ...item };
    });
    
    // Recalculate arrival/departure times with new durations
    let currentTime = this.parseTimeToMinutes(schedule[0].arrivalTime);
    
    adjustedSchedule.forEach((item, index) => {
      if (index > 0) {
        // Add travel time between places
        const travelTime = item.place.travelTimeFromPrevious || 15;
        currentTime += travelTime;
      }
      
      item.arrivalTime = this.minutesToTimeString(currentTime);
      item.departureTime = this.minutesToTimeString(currentTime + item.visitDuration);
      currentTime += item.visitDuration;
    });
    
    console.log(`✅ Successfully reduced schedule by ${actualReduction} minutes`);
    return adjustedSchedule;
  }

  /**
   * Build precise itinerary response with accurate metrics
   */
  private buildPreciseItineraryResponse(
    route: PlaceRecommendation[],
    schedule: any[],
    timeMetrics: {
      visitingTime: number;
      travelTime: number;
      totalDuration: number;
      breakdown: {
        startToFirst: number;
        placesToPlaces: number;
        lastToReturn: number;
      };
    },
    formData: ItineraryFormData,
    missedPopularPlaces?: Array<{place: PlaceRecommendation; reason: string}>
  ) {
    // Extract all places from the schedule (includes both original route + added places)
    const allScheduledPlaces = schedule.map(item => item.place);
    const uncoveredInterests = this.findUncoveredInterests(formData.selectedInterests, allScheduledPlaces);
    
    // CRITICAL FIX: Recalculate time metrics using the actual scheduled places (not just the route)
    // This ensures places added by fillRemainingTimeWithPlaces are included in time calculations
    const actualTimeMetrics = this.calculatePreciseTimeMetrics(
      allScheduledPlaces, 
      formData.startingAddress,
      formData.returnAddress,
      formData.differentReturnLocation
    );
    
    console.log(`🔧 TIME METRICS FIX: Recalculated for ${allScheduledPlaces.length} scheduled places (was ${route.length} route places)`);
    
    return {
      places: allScheduledPlaces,
      visitingTime: actualTimeMetrics.visitingTime,           // FIX: Use actual scheduled places
      travelTime: actualTimeMetrics.travelTime,               // FIX: Use actual scheduled places  
      totalDuration: actualTimeMetrics.totalDuration,         // FIX: Use actual scheduled places
      travelBreakdown: actualTimeMetrics.breakdown,           // FIX: Use actual scheduled places
      route: {
        waypoints: route.map(place => {
          const coords = this.getPlaceCoordinates(place);
          return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            name: place.name
          };
        }),
        optimizedOrder: route.map((_, index) => index)
      },
      schedule,
      uncoveredInterests,
      optimizationNotes: this.generatePreciseOptimizationNotes(route, timeMetrics, formData, missedPopularPlaces),
      missedPopularPlaces: missedPopularPlaces || []
    };
  }

  /**
   * Generate precise optimization notes with detailed metrics
   */
  private generatePreciseOptimizationNotes(
    places: PlaceRecommendation[],
    timeMetrics: any,
    formData: ItineraryFormData,
    missedPopularPlaces?: Array<{place: PlaceRecommendation; reason: string}>
  ): string[] {
    const notes = [];
    
    // Time efficiency note
    const efficiency = (timeMetrics.visitingTime / timeMetrics.totalDuration) * 100;
    notes.push(`Time efficiency: ${efficiency.toFixed(1)}% (${(timeMetrics.visitingTime/60).toFixed(1)}h visiting / ${(timeMetrics.totalDuration/60).toFixed(1)}h total)`);
    
    // Place optimization note
    if (places.length < formData.selectedInterests.length) {
      notes.push(`Optimized to ${places.length} places to fit within ${formData.availableHours} hours`);
    }
    
    // Travel optimization note
    if (timeMetrics.breakdown.placesToPlaces > 0) {
      const avgTravelBetween = timeMetrics.breakdown.placesToPlaces / Math.max(1, places.length - 1);
      notes.push(`Average travel time between locations: ${avgTravelBetween.toFixed(0)} minutes`);
    }
    
    // Quality note
    const avgRating = places.reduce((sum, place) => 
      sum + DataService.extractRating(place.rating), 0) / places.length;
    
    if (avgRating >= 4.5) {
      notes.push(`High-quality selection: ${avgRating.toFixed(1)}⭐ average rating`);
    }
    
    // Missed popular places notifications
    if (missedPopularPlaces && missedPopularPlaces.length > 0) {
      notes.push(`📍 Popular places you're missing:`);
      missedPopularPlaces.forEach(missed => {
        const reviewCount = DataService.extractReviewCount(missed.place.user_ratings_total?.toString() || '0');
        notes.push(`• ${missed.place.name} (${reviewCount.toLocaleString()} reviews) - ${missed.reason}`);
      });
    }
    
    return notes;
  }

  /**
   * Remove dining stop from the last place in an itinerary
   * @param itinerary - The itinerary to modify
   * @returns Updated itinerary without the return dining stop
   */
  async removeReturnDiningStopFromItinerary(
    itinerary: GeneratedItinerary | MultiDayItinerary
  ): Promise<GeneratedItinerary | MultiDayItinerary> {
    try {
      if ('dailyItineraries' in itinerary) {
        // Multi-day itinerary - remove from the last day
        const updatedDailyItineraries = [...itinerary.dailyItineraries];
        const lastDayIndex = updatedDailyItineraries.length - 1;
        const lastDay = updatedDailyItineraries[lastDayIndex];
        
        if (lastDay.places.length > 0) {
          const lastPlace = lastDay.places[lastDay.places.length - 1];
          if (lastPlace.returnDiningStop) {
            console.log(`🗑️ Removing return dining stop: ${lastPlace.returnDiningStop.name}`);
            delete lastPlace.returnDiningStop;
          }
        }
        
        return {
          ...itinerary,
          dailyItineraries: updatedDailyItineraries
        };
      } else {
        // Single-day itinerary
        if (itinerary.places.length > 0) {
          const lastPlace = itinerary.places[itinerary.places.length - 1];
          if (lastPlace.returnDiningStop) {
            console.log(`🗑️ Removing return dining stop: ${lastPlace.returnDiningStop.name}`);
            
            // Create updated places array without dining stop
            const updatedPlaces = [...itinerary.places];
            updatedPlaces[updatedPlaces.length - 1] = {
              ...lastPlace,
              returnDiningStop: undefined
            };
            
            return {
              ...itinerary,
              places: updatedPlaces
            };
          }
        }
        
        return itinerary;
      }
    } catch (error) {
      console.error('Failed to remove return dining stop from itinerary:', error);
      return itinerary;
    }
  }

  /**
   * Check if the last place in an itinerary has a return dining stop
   * @param itinerary - The itinerary to check
   * @returns boolean - True if the last place has a return dining stop
   */
  hasReturnDiningStop(itinerary: GeneratedItinerary | MultiDayItinerary): boolean {
    if ('dailyItineraries' in itinerary) {
      // Multi-day itinerary - check the last day
      const lastDay = itinerary.dailyItineraries[itinerary.dailyItineraries.length - 1];
      if (lastDay.places.length > 0) {
        const lastPlace = lastDay.places[lastDay.places.length - 1];
        return !!lastPlace.returnDiningStop;
      }
    } else {
      // Single-day itinerary
      if (itinerary.places.length > 0) {
        const lastPlace = itinerary.places[itinerary.places.length - 1];
        return !!lastPlace.returnDiningStop;
      }
    }
    return false;
  }

  /**
   * Get current city info for place identification
   */
  private getCurrentCityInfo(): { name: string; displayName: string } | undefined {
    const currentCity = DataService.getCurrentCity();
    if (currentCity) {
      return {
        name: currentCity.id,
        displayName: currentCity.displayName
      };
    }
    return undefined;
  }
}

export default new ItineraryService();

