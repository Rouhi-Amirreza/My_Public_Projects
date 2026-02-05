/**
 * UnifiedTravelCalculator - Single source of truth for all travel time calculations
 * 
 * This service handles ALL travel time scenarios:
 * - Place to place travel
 * - Travel with dining stops
 * - Mixed travel modes (walking/driving)
 * - Schedule calculations
 * - UI display consistency
 */

import { GeneratedItinerary, MultiDayItinerary, DailyItinerary, TravelOptions } from '../types';

export interface TravelSegment {
  id: string;
  fromPlace: string;
  toPlace: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  mode: 'driving' | 'walking';
  duration: number; // minutes
  distance: number; // meters
  icon: string;
}

export interface ScheduleCalculationResult {
  segments: TravelSegment[];
  schedule: ScheduleItem[];
  totalDuration: number;
  warnings: string[];
}

export interface ScheduleItem {
  place: any;
  arrivalTime: string;
  departureTime: string;
  visitDuration: number;
  travelSegment?: TravelSegment;
  diningStops?: any[];
}

export interface TravelCalculationOptions {
  startTime: string;
  availableTravelOptions: Record<string, TravelOptions>;
  selectedTravelModes: Record<string, 'driving' | 'walking'>;
  enableDebugLogging?: boolean;
}

class UnifiedTravelCalculator {
  private static debugEnabled = true;

  /**
   * Main entry point: Calculate complete itinerary schedule
   */
  static calculateCompleteSchedule(
    itinerary: GeneratedItinerary | MultiDayItinerary,
    options: TravelCalculationOptions,
    dayIndex?: number
  ): GeneratedItinerary | MultiDayItinerary {
    this.debug('🔄 Starting unified schedule calculation', { 
      isMultiDay: 'dailyItineraries' in itinerary,
      dayIndex,
      optionsCount: Object.keys(options.availableTravelOptions).length,
      modesCount: Object.keys(options.selectedTravelModes).length
    });
    
    // Force console log for travel mode tracking
    console.log('🔄 UnifiedTravelCalculator: Schedule calculation started', {
      selectedModes: options.selectedTravelModes,
      availableOptions: Object.keys(options.availableTravelOptions)
    });

    if ('dailyItineraries' in itinerary) {
      return this.calculateMultiDaySchedule(itinerary, options, dayIndex);
    } else {
      return this.calculateSingleDaySchedule(itinerary, options);
    }
  }

  /**
   * Calculate schedule for multi-day itinerary
   */
  private static calculateMultiDaySchedule(
    itinerary: MultiDayItinerary,
    options: TravelCalculationOptions,
    dayIndex?: number
  ): MultiDayItinerary {
    const updatedDays = itinerary.dailyItineraries.map((day, index) => {
      if (dayIndex === undefined || index === dayIndex) {
        return this.calculateSingleDaySchedule(day, {
          ...options,
          startTime: day.startTime || options.startTime
        }) as DailyItinerary;
      }
      return day;
    });

    return {
      ...itinerary,
      dailyItineraries: updatedDays,
      totalDuration: this.calculateMultiDayTotals(updatedDays)
    };
  }

  /**
   * Calculate schedule for single day
   */
  private static calculateSingleDaySchedule(
    day: GeneratedItinerary | DailyItinerary,
    options: TravelCalculationOptions
  ): GeneratedItinerary | DailyItinerary {
    if (!day.places || day.places.length === 0) {
      return day;
    }

    // Step 1: Generate all travel segments
    const travelSegments = this.generateTravelSegments(day.places, options);
    
    // Step 2: Calculate schedule with travel times
    const scheduleResult = this.calculateScheduleFromSegments(
      day.places,
      travelSegments,
      options.startTime,
      day,
      options
    );

    // Step 3: Format results
    return {
      ...day,
      schedule: scheduleResult.schedule,
      totalDuration: this.formatDuration(scheduleResult.totalDuration),
      travelSegments // Store for UI reference
    } as any;
  }

  /**
   * Generate travel segments for all place-to-place movements
   */
  private static generateTravelSegments(
    places: any[],
    options: TravelCalculationOptions
  ): TravelSegment[] {
    const segments: TravelSegment[] = [];
    
    this.debug('🔧 Generating travel segments', {
      placesCount: places.length,
      availableOptionsCount: Object.keys(options.availableTravelOptions).length,
      selectedModesCount: Object.keys(options.selectedTravelModes).length
    });

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      let segmentId: string;
      let fromPlace: string;
      let fromCoordinates: { latitude: number; longitude: number };

      if (i === 0) {
        // First place: start → place
        segmentId = `start_${this.cleanName(place.name)}_${i}`;
        fromPlace = 'start';
        fromCoordinates = { latitude: 0, longitude: 0 }; // Will be set by caller
      } else {
        // Subsequent places: previous → current
        const prevPlace = places[i - 1];
        segmentId = `${this.cleanName(prevPlace.name)}_${this.cleanName(place.name)}_${i}`;
        fromPlace = prevPlace.name;
        fromCoordinates = prevPlace.coordinates;
      }

      const segment = this.createTravelSegment(
        segmentId,
        fromPlace,
        place.name,
        fromCoordinates,
        place.coordinates,
        options,
        place // Pass place data for fallback
      );

      if (segment) {
        segments.push(segment);
        this.debug('✅ Travel segment created', {
          index: i,
          segmentId: segment.id,
          duration: segment.duration,
          mode: segment.mode
        });
      } else {
        this.debug('❌ Failed to create travel segment', {
          index: i,
          place: place.name,
          attemptedSegmentId: segmentId
        });
      }
    }

    this.debug('🎯 Travel segment generation complete', {
      totalSegments: segments.length,
      placesCount: places.length,
      success: segments.length === places.length
    });

    return segments;
  }

  /**
   * Create a single travel segment with correct travel time
   */
  private static createTravelSegment(
    segmentId: string,
    fromPlace: string,
    toPlace: string,
    fromCoordinates: { latitude: number; longitude: number },
    toCoordinates: { latitude: number; longitude: number },
    options: TravelCalculationOptions,
    place?: any // Place data for fallback
  ): TravelSegment | null {
    // Get selected travel mode for this segment
    const selectedMode = options.selectedTravelModes[segmentId] || 'driving';
    
    // Get travel options for this segment
    const travelOptions = options.availableTravelOptions[segmentId];
    
    this.debug('🔍 Creating travel segment', {
      segmentId,
      fromPlace,
      toPlace,
      selectedMode,
      hasOptions: !!travelOptions,
      drivingTime: travelOptions?.driving?.duration,
      walkingTime: travelOptions?.walking?.duration,
      availableOptionKeys: Object.keys(options.availableTravelOptions).slice(0, 5), // Show first 5 keys for comparison
      allSelectedModes: options.selectedTravelModes, // Show all selected modes for debugging
      selectedModeForThisSegment: options.selectedTravelModes[segmentId]
    });

    if (!travelOptions) {
      this.debug('📋 Using place data fallback (normal during initial load)', { 
        segmentId, 
        placeTravelTime: place?.travelTimeFromPrevious,
        note: 'Travel options will be calculated by Google Maps API asynchrously'
      });
      
      // Fallback: use place travel time if available
      const fallbackDuration = place?.travelTimeFromPrevious || 15;
      const fallbackDistance = place?.distanceFromPrevious ? place.distanceFromPrevious * 1000 : 1000;
      const fallbackIcon = place?.travelIcon || (selectedMode === 'driving' ? '🚗' : '🚶');
      
      return {
        id: segmentId,
        fromPlace,
        toPlace,
        fromCoordinates,
        toCoordinates,
        mode: selectedMode,
        duration: fallbackDuration,
        distance: fallbackDistance,
        icon: fallbackIcon
      };
    }

    const modeData = travelOptions[selectedMode];
    if (!modeData) {
      this.debug('⚠️ No data for selected mode, using fallback', { 
        segmentId, 
        selectedMode,
        availableModes: Object.keys(travelOptions)
      });
      // Fallback: try the other mode or use default
      const alternativeMode = selectedMode === 'driving' ? 'walking' : 'driving';
      const alternativeData = travelOptions[alternativeMode];
      
      if (alternativeData) {
        this.debug('📋 Using alternative mode data', { alternativeMode });
        return {
          id: segmentId,
          fromPlace,
          toPlace,
          fromCoordinates,
          toCoordinates,
          mode: alternativeMode,
          duration: alternativeData.duration,
          distance: alternativeData.distance,
          icon: alternativeData.icon
        };
      }
      
      // Last resort fallback: use place data
      const fallbackDuration = place?.travelTimeFromPrevious || 15;
      const fallbackDistance = place?.distanceFromPrevious ? place.distanceFromPrevious * 1000 : 1000;
      const fallbackIcon = place?.travelIcon || (selectedMode === 'driving' ? '🚗' : '🚶');
      
      return {
        id: segmentId,
        fromPlace,
        toPlace,
        fromCoordinates,
        toCoordinates,
        mode: selectedMode,
        duration: fallbackDuration,
        distance: fallbackDistance,
        icon: fallbackIcon
      };
    }

    this.debug('✅ Using Google Maps travel data', {
      segmentId,
      mode: selectedMode,
      duration: modeData.duration,
      distance: modeData.distance
    });
    
    // Force console log for travel mode changes
    console.log(`🎯 Travel segment created: ${segmentId} using ${selectedMode} mode (${modeData.duration}min)`);

    return {
      id: segmentId,
      fromPlace,
      toPlace,
      fromCoordinates,
      toCoordinates,
      mode: selectedMode,
      duration: modeData.duration,
      distance: modeData.distance,
      icon: modeData.icon
    };
  }

  /**
   * Calculate complete schedule from travel segments
   */
  private static calculateScheduleFromSegments(
    places: any[],
    travelSegments: TravelSegment[],
    startTime: string,
    dayData?: any,
    options?: TravelCalculationOptions
  ): ScheduleCalculationResult {
    const schedule: ScheduleItem[] = [];
    const warnings: string[] = [];
    let currentTime = this.timeToMinutes(startTime);
    let totalDuration = 0;

    this.debug('🔍 Schedule calculation starting', {
      placesCount: places.length,
      segmentsCount: travelSegments.length,
      startTime,
      initialTimeMinutes: currentTime
    });

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const travelSegment = travelSegments[i];
      
      this.debug('📍 Processing place', {
        index: i,
        placeName: place.name,
        hasTravelSegment: !!travelSegment,
        segmentDuration: travelSegment?.duration,
        segmentId: travelSegment?.id
      });
      
      // CRITICAL FIX: Calculate arrival time based on previous place's departure time
      // This ensures that dining stop time changes properly cascade to subsequent places
      if (i === 0) {
        // First place: use start time + travel time from starting location to first place
        currentTime = this.timeToMinutes(startTime);
        if (travelSegment) {
          currentTime += travelSegment.duration;
          totalDuration += travelSegment.duration;
          
          this.debug('📍 First place calculation - start time + travel time', {
            place: place.name,
            travelMode: travelSegment.mode,
            travelTime: travelSegment.duration,
            startTime: startTime,
            arrivalTime: this.minutesToTime(currentTime),
            calculation: `${startTime} + ${travelSegment.duration}min = ${this.minutesToTime(currentTime)}`
          });
        } else {
          this.debug('📍 First place calculation - no travel segment', {
            place: place.name,
            startTime: startTime,
            arrivalTime: this.minutesToTime(currentTime)
          });
        }
      } else {
        // Subsequent places: use previous place's departure time + travel time
        const previousScheduleItem = schedule[i - 1];
        if (previousScheduleItem) {
          const previousDepartureMinutes = this.timeToMinutes(previousScheduleItem.departureTime);
          if (travelSegment) {
            currentTime = previousDepartureMinutes + travelSegment.duration;
            totalDuration += travelSegment.duration;
            
            this.debug('📍 Place calculation - based on previous departure', {
              place: place.name,
              travelMode: travelSegment.mode,
              travelTime: travelSegment.duration,
              previousDepartureTime: previousScheduleItem.departureTime,
              arrivalTime: this.minutesToTime(currentTime),
              calculation: `${previousScheduleItem.departureTime} + ${travelSegment.duration}min = ${this.minutesToTime(currentTime)}`
            });
          } else {
            // No travel segment, use previous departure time
            currentTime = previousDepartureMinutes;
            this.debug('📍 Place calculation - no travel segment', {
              place: place.name,
              previousDepartureTime: previousScheduleItem.departureTime,
              arrivalTime: this.minutesToTime(currentTime)
            });
          }
        } else {
          // Fallback to start time
          currentTime = this.timeToMinutes(startTime);
        }
      }

      // CRITICAL FIX: Recalculate dining stop times if this place has dining stops
      // This must happen BEFORE we calculate the arrival time, because dining stops affect the arrival time
      if (place.diningStops && place.diningStops.length > 0) {
        console.log(`🔧 Processing dining stops for place ${place.name}:`, {
          diningStopsCount: place.diningStops.length,
          hasOptions: !!options,
          hasSelectedTravelModes: !!(options && options.selectedTravelModes),
          selectedTravelModesCount: options && options.selectedTravelModes ? Object.keys(options.selectedTravelModes).length : 0,
          firstDiningStopName: place.diningStops[0]?.name
        });
        place.diningStops.forEach((diningStop, diningIndex) => {
          if (diningStop.travel_breakdown) {
            const diningDuration = diningStop.dining_duration || 45;
            
            // CRITICAL FIX: Use current travel modes to get correct travel times
            // Generate the dining stop rideId to match the UI format exactly
            const cleanDiningName = diningStop.name.replace(/\s/g, '');
            const cleanPlaceName = place.name.replace(/\s/g, '');
            
            // Get travel times based on current travel modes
            let travelToRestaurant = diningStop.travel_breakdown.travel_to_restaurant || 0;
            let travelFromRestaurant = diningStop.travel_breakdown.travel_from_restaurant || 0;
            
            if (options && options.selectedTravelModes) {
              // Generate rideIds to match UI format exactly
              // UI uses: generateRideId(from, to, index) => `${from.replace(/\s/g, '')}_${to.replace(/\s/g, '')}_${index}`
              let rideIdTo: string;
              let rideIdFrom: string;
              
              if (i === 0) {
                // For first place: special handling for pre-first dining stops
                // generateRideId('start', diningStop.name, 'pre_first_dining_to')
                rideIdTo = `start_${cleanDiningName}_pre_first_dining_to`;
                // generateRideId(diningStop.name, currentItinerary.places[0].name, 'first_dining_from')
                rideIdFrom = `${cleanDiningName}_${cleanPlaceName}_first_dining_from`;
              } else {
                // For other places: use the standard format
                // In the UI, the dining stops are displayed between places with the previous place as the starting point
                // The dining stops are actually "attached" to the destination place but start from the previous place
                // So for place i, the dining stops start from place i-1
                const prevPlace = places[i - 1];
                const cleanPrevPlaceName = prevPlace.name.replace(/\s/g, '');
                
                // generateRideId(currentItinerary.places[index].name, diningStop.name, `${index}_${diningIndex}_to`)
                // where index is the previous place index (i-1 in our iteration)
                rideIdTo = `${cleanPrevPlaceName}_${cleanDiningName}_${i - 1}_${diningIndex}_to`;
                // generateRideId(diningStop.name, nextPlace.name, `${index}_${diningIndex}_from`)
                rideIdFrom = `${cleanDiningName}_${cleanPlaceName}_${i - 1}_${diningIndex}_from`;
              }
              
              // Get current travel modes (default to stored mode if not found)
              const currentModeToRestaurant = options.selectedTravelModes[rideIdTo] || 
                                            diningStop.travel_breakdown.travel_to_mode || 'driving';
              const currentModeFromRestaurant = options.selectedTravelModes[rideIdFrom] || 
                                             diningStop.travel_breakdown.travel_from_mode || 'driving';
              
              // Use the appropriate travel time based on current mode
              if (diningStop.travel_breakdown.travelToOptions) {
                const toOptions = diningStop.travel_breakdown.travelToOptions;
                travelToRestaurant = toOptions[currentModeToRestaurant]?.duration || travelToRestaurant;
              }
              
              if (diningStop.travel_breakdown.travelFromOptions) {
                const fromOptions = diningStop.travel_breakdown.travelFromOptions;
                travelFromRestaurant = fromOptions[currentModeFromRestaurant]?.duration || travelFromRestaurant;
              }
              
              console.log(`🔧 DINING STOP TRAVEL MODE UPDATE for ${place.name}:`, {
                diningStopName: diningStop.name,
                placeIndex: i,
                diningIndex: diningIndex,
                rideIdTo,
                rideIdFrom,
                currentModeToRestaurant,
                currentModeFromRestaurant,
                travelToRestaurant,
                travelFromRestaurant,
                storedModeToRestaurant: diningStop.travel_breakdown.travel_to_mode,
                storedModeFromRestaurant: diningStop.travel_breakdown.travel_from_mode,
                hasRideIdTo: !!options.selectedTravelModes[rideIdTo],
                hasRideIdFrom: !!options.selectedTravelModes[rideIdFrom],
                fromOptionsDriving: diningStop.travel_breakdown.travelFromOptions?.driving?.duration,
                fromOptionsWalking: diningStop.travel_breakdown.travelFromOptions?.walking?.duration,
                selectedFromTime: diningStop.travel_breakdown.travelFromOptions?.[currentModeFromRestaurant]?.duration
              });
            }
            
            let restaurantArrivalMinutes;
            let baseTimeDescription;
            
            if (i === 0) {
              // For first place: dining stops are "before first place" - start from trip start time
              restaurantArrivalMinutes = this.timeToMinutes(startTime) + travelToRestaurant;
              baseTimeDescription = `trip start time (${startTime})`;
            } else {
              // For other places: dining stops are "between places" - start from PREVIOUS place departure time
              // CRITICAL FIX: Get the actual departure time from the previous place's schedule item
              const previousScheduleItem = schedule[i - 1];
              if (previousScheduleItem) {
                const previousDepartureMinutes = this.timeToMinutes(previousScheduleItem.departureTime);
                restaurantArrivalMinutes = previousDepartureMinutes + travelToRestaurant;
                baseTimeDescription = `previous place departure time (${previousScheduleItem.departureTime})`;
                
                // DEBUG: Let's see what's actually happening
                console.log(`🔧 DINING STOP DEBUG for ${place.name}:`, {
                  currentTime: currentTime,
                  currentTimeFormatted: this.minutesToTime(currentTime),
                  travelSegmentDuration: travelSegment?.duration,
                  previousPlaceName: previousScheduleItem.place.name,
                  previousDepartureTime: previousScheduleItem.departureTime,
                  previousDepartureMinutes: previousDepartureMinutes,
                  travelToRestaurant: travelToRestaurant,
                  calculatedRestaurantArrival: restaurantArrivalMinutes,
                  calculatedRestaurantArrivalFormatted: this.minutesToTime(restaurantArrivalMinutes),
                  DEBUG_SCHEDULE_LENGTH: schedule.length,
                  DEBUG_CURRENT_INDEX: i,
                  DEBUG_PREVIOUS_INDEX: i - 1,
                  DEBUG_SCHEDULE_ITEM_EXISTS: !!schedule[i - 1],
                  DEBUG_SCHEDULE_ITEM_DEPARTURE: schedule[i - 1]?.departureTime,
                  DEBUG_TRAVEL_TIMES_UPDATED: options && options.selectedTravelModes ? 'YES' : 'NO'
                });
              } else {
                // Fallback to start time if no previous schedule item
                restaurantArrivalMinutes = this.timeToMinutes(startTime) + travelToRestaurant;
                baseTimeDescription = `trip start time (${startTime})`;
              }
            }
            
            const restaurantDepartureMinutes = restaurantArrivalMinutes + diningDuration;
            
            // Update the dining stop with fresh calculated times
            diningStop.arrival_time = this.minutesToTime(restaurantArrivalMinutes);
            diningStop.departure_time = this.minutesToTime(restaurantDepartureMinutes);
            
            // CRITICAL FIX: Update the travel_breakdown with the new calculated values
            // This ensures that the currentTime calculation later uses the updated travel times
            if (diningStop.travel_breakdown) {
              diningStop.travel_breakdown.travel_to_restaurant = travelToRestaurant;
              diningStop.travel_breakdown.travel_from_restaurant = travelFromRestaurant;
            }
            
            console.log(`🔧 DINING STOP TIMES RECALCULATED for ${place.name} (stop ${diningIndex}):`, {
              baseTime: baseTimeDescription,
              travelToRestaurant: travelToRestaurant,
              restaurantArrival: diningStop.arrival_time,
              diningDuration: diningDuration,
              restaurantDeparture: diningStop.departure_time,
              travelFromRestaurant: travelFromRestaurant,
              reason: i === 0 ? 'Before first place dining stop' : 'Between places dining stop',
              // DEBUG: Show the actual calculated values
              actualRestaurantArrival: this.minutesToTime(restaurantArrivalMinutes),
              UPDATED_TRAVEL_BREAKDOWN: 'YES - travel_to_restaurant and travel_from_restaurant updated with new values'
            });
          }
        });
        
        // CRITICAL FIX: Calculate the arrival time at this place correctly
        // The dining stop happens between the previous place and this place
        // So we need to calculate: previous departure + travel to restaurant + dining + travel from restaurant
        const diningStopInfo = place.diningStops[0]; // Assuming one dining stop per place
        
        // CRITICAL FIX: Use the updated travel times from the dining stop processing above
        // These values have been updated with the current travel modes
        const travelToRestaurant = diningStopInfo.travel_breakdown?.travel_to_restaurant || 0;
        const diningDuration = diningStopInfo.dining_duration || 45;
        const travelFromRestaurant = diningStopInfo.travel_breakdown?.travel_from_restaurant || 0;
        
        // Calculate the actual arrival time at the place after the dining stop
        if (i === 0) {
          // For first place: start time + travel to restaurant + dining + travel from restaurant
          currentTime = this.timeToMinutes(startTime) + travelToRestaurant + diningDuration + travelFromRestaurant;
        } else {
          // CRITICAL FIX: For other places, use the previous place's departure time as the base
          // NOT the currentTime which includes travel time already
          const previousScheduleItem = schedule[i - 1];
          if (previousScheduleItem) {
            const previousDepartureMinutes = this.timeToMinutes(previousScheduleItem.departureTime);
            currentTime = previousDepartureMinutes + travelToRestaurant + diningDuration + travelFromRestaurant;
          }
        }
        
        console.log(`🔧 DINING STOP FINAL ARRIVAL CALCULATION for ${place.name}:`, {
          previousDepartureTime: i > 0 ? schedule[i - 1]?.departureTime : 'start',
          travelToRestaurant: travelToRestaurant,
          restaurantArrival: diningStopInfo.arrival_time,
          diningDuration: diningDuration,
          restaurantDeparture: diningStopInfo.departure_time,
          travelFromRestaurant: travelFromRestaurant,
          finalPlaceArrival: this.minutesToTime(currentTime),
          reason: 'Dining stop times recalculated dynamically based on current schedule',
          DEBUG_ACTUAL_PREVIOUS_DEPARTURE: i > 0 ? schedule[i - 1]?.departureTime : 'N/A',
          DEBUG_EXPECTED_RESTAURANT_ARRIVAL: i > 0 ? this.minutesToTime(this.timeToMinutes(schedule[i - 1]?.departureTime || '09:00') + travelToRestaurant) : 'N/A',
          DEBUG_CALCULATION_BREAKDOWN: {
            previousDepartureMinutes: i > 0 ? this.timeToMinutes(schedule[i - 1]?.departureTime || '09:00') : this.timeToMinutes(startTime),
            plusTravelToRestaurant: (i > 0 ? this.timeToMinutes(schedule[i - 1]?.departureTime || '09:00') : this.timeToMinutes(startTime)) + travelToRestaurant,
            plusDiningDuration: (i > 0 ? this.timeToMinutes(schedule[i - 1]?.departureTime || '09:00') : this.timeToMinutes(startTime)) + travelToRestaurant + diningDuration,
            plusTravelFromRestaurant: (i > 0 ? this.timeToMinutes(schedule[i - 1]?.departureTime || '09:00') : this.timeToMinutes(startTime)) + travelToRestaurant + diningDuration + travelFromRestaurant,
            finalCurrentTime: currentTime
          }
        });
      } else {
        console.log(`🔧 NO DINING STOPS for ${place.name} - using direct arrival time: ${this.minutesToTime(currentTime)}`);
      }

      // Calculate arrival time at this place
      let arrivalTime = this.minutesToTime(currentTime);
      this.debug(`TIMING_DEBUG ${place.name} arrival`, {
        arrivalTime: arrivalTime,
        currentTime: currentTime,
        step: 'arrival'
      });
      
      // Add visit duration (starting from the arrival time)
      // PRIORITY ORDER: Manual changes (estimatedVisitDuration) > visitDuration > typical_time_spent > default
      let visitDuration = 60; // Default
      
      if (place.estimatedVisitDuration) {
        // Manual changes have highest priority
        visitDuration = place.estimatedVisitDuration;
        console.log(`📊 Using manual visit duration for ${place.name}: ${visitDuration} minutes (user-set)`);
      } else if (place.visitDuration) {
        visitDuration = place.visitDuration;
        console.log(`📊 Using place.visitDuration for ${place.name}: ${visitDuration} minutes`);
      } else if (place.popular_times?.typical_time_spent) {
        // Parse typical_time_spent (e.g., "1 hour", "2 hours", "30 minutes")
        visitDuration = this.parseDuration(place.popular_times.typical_time_spent);
        console.log(`📊 Using typical visit time for ${place.name}: ${place.popular_times.typical_time_spent} (${visitDuration} minutes)`);
      } else {
        console.log(`📊 Using default visit time for ${place.name}: ${visitDuration} minutes`);
      }
      
      // Update currentTime to include visit duration
      currentTime += visitDuration;
      totalDuration += visitDuration;
      this.debug(`TIMING_DEBUG ${place.name} after visit`, {
        afterVisitTime: this.minutesToTime(currentTime),
        visitDuration,
        currentTime,
        step: 'after_visit'
      });
      
      // Add dining stops if any
      const diningTime = this.calculateDiningTime(place.diningStops || []);
      this.debug(`TIMING_DEBUG ${place.name} dining calculation`, {
        diningTime,
        diningStopsCount: (place.diningStops || []).length,
        step: 'dining_calculation'
      });
      
      currentTime += diningTime;
      totalDuration += diningTime;
      this.debug(`TIMING_DEBUG ${place.name} after dining`, {
        afterDiningTime: this.minutesToTime(currentTime),
        diningTime,
        currentTime,
        step: 'after_dining'
      });

      // Calculate departure time AFTER including dining time
      const departureTime = this.minutesToTime(currentTime);
      
      // CRITICAL FIX: Force console log to verify fix is working
      console.log(`🔧 DEPARTURE TIME FIX: ${place.name}`, {
        arrivalTime,
        visitDuration,
        diningTime,
        departureTime,
        totalTimeAtPlace: visitDuration + diningTime,
        SHOULD_INCLUDE_DINING: 'YES - dining time is now included in departure calculation'
      });
      
      this.debug(`TIMING_DEBUG ${place.name} final departure`, {
        departureTime,
        totalTimeAtPlace: visitDuration + diningTime,
        step: 'final_departure'
      });

      this.debug('DINING_DEBUG: Final timing calculation', {
        place: place.name,
        arrivalTime: arrivalTime,
        afterVisitTime: this.minutesToTime(currentTime - diningTime),
        afterDiningTime: this.minutesToTime(currentTime),
        departureTime: departureTime,
        totalTimeAtPlace: visitDuration + diningTime
      });

      const scheduleItem = {
        place,
        arrivalTime,
        departureTime,
        visitDuration,
        travelSegment,
        diningStops: place.diningStops || []
      };
      
      this.debug(`TIMING_DEBUG ${place.name} schedule item created`, {
        scheduleItem: {
          placeName: place.name,
          arrivalTime: scheduleItem.arrivalTime,
          departureTime: scheduleItem.departureTime,
          visitDuration: scheduleItem.visitDuration,
          diningStopsCount: scheduleItem.diningStops.length,
          totalTimeAtPlace: visitDuration + diningTime
        }
      });
      
      schedule.push(scheduleItem);

      this.debug('✅ Place scheduled', {
        place: place.name,
        arrival: arrivalTime,
        departure: departureTime,
        visit: visitDuration,
        dining: diningTime,
        CRITICAL_DEBUG_currentTime_before_departure_calc: currentTime,
        CRITICAL_DEBUG_departure_time_should_be: this.minutesToTime(currentTime),
        CRITICAL_DEBUG_total_time_at_place: visitDuration + diningTime
      });
    }

    // Handle return dining stops (extra schedule items beyond places)  
    // This handles dining stops that occur after the last place (return dining)
    if (dayData && dayData.schedule && dayData.schedule.length > places.length) {
      const returnDiningItem = dayData.schedule[dayData.schedule.length - 1];
      if (returnDiningItem && returnDiningItem.diningStops && returnDiningItem.diningStops.length > 0) {
        console.log('🍽️ Processing return dining stop:', returnDiningItem.diningStops[0].name);
        
        // Calculate travel time to the dining stop from the last place
        const lastPlace = schedule[schedule.length - 1];
        const diningStop = returnDiningItem.diningStops[0];
        const travelToRestaurant = diningStop.travel_breakdown?.travel_to_restaurant || 10;
        const diningDuration = diningStop.dining_duration || 45;
        const travelFromRestaurant = diningStop.travel_breakdown?.travel_from_restaurant || 10;
        
        // Calculate timing based on last place departure
        const lastDepartureMinutes = this.timeToMinutes(lastPlace.departureTime);
        const restaurantArrivalMinutes = lastDepartureMinutes + travelToRestaurant;
        const restaurantDepartureMinutes = restaurantArrivalMinutes + diningDuration;
        
        // CRITICAL FIX: Update the dining stop object with recalculated times
        diningStop.arrival_time = this.minutesToTime(restaurantArrivalMinutes);
        diningStop.departure_time = this.minutesToTime(restaurantDepartureMinutes);
        
        console.log(`🔧 RETURN DINING STOP TIMES RECALCULATED:`, {
          lastPlaceDepartureTime: this.minutesToTime(lastDepartureMinutes),
          travelToRestaurant: travelToRestaurant,
          restaurantArrival: diningStop.arrival_time,
          diningDuration: diningDuration,
          restaurantDeparture: diningStop.departure_time,
          reason: 'Return dining stop times calculated from last place departure + travel time'
        });
        
        // Create return dining schedule item
        const returnDiningScheduleItem = {
          place: returnDiningItem.place,
          arrivalTime: this.minutesToTime(restaurantArrivalMinutes),
          departureTime: this.minutesToTime(restaurantDepartureMinutes),
          visitDuration: 0, // No visit duration for dining stop
          diningStops: returnDiningItem.diningStops,
          isReturnDining: true
        };
        
        schedule.push(returnDiningScheduleItem);
        
        // Update total duration
        totalDuration += travelToRestaurant + diningDuration;
        
        console.log('✅ Return dining stop processed:', {
          restaurantName: diningStop.name,
          arrivalTime: returnDiningScheduleItem.arrivalTime,
          departureTime: returnDiningScheduleItem.departureTime,
          totalDuration: travelToRestaurant + diningDuration
        });
      }
    }

    return {
      segments: travelSegments,
      schedule,
      totalDuration,
      warnings
    };
  }

  /**
   * Get travel time for any segment (for UI display)
   */
  static getTravelTimeForSegment(
    segmentId: string,
    options: TravelCalculationOptions
  ): { duration: number; mode: string; available: boolean } {
    const selectedMode = options.selectedTravelModes[segmentId] || 'driving';
    const travelOptions = options.availableTravelOptions[segmentId];
    
    if (!travelOptions || !travelOptions[selectedMode]) {
      return { duration: 0, mode: selectedMode, available: false };
    }

    return {
      duration: travelOptions[selectedMode].duration,
      mode: selectedMode,
      available: true
    };
  }

  /**
   * Validate schedule consistency
   */
  static validateScheduleConsistency(
    schedule: ScheduleItem[],
    travelSegments: TravelSegment[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 1; i < schedule.length; i++) {
      const currentItem = schedule[i];
      const previousItem = schedule[i - 1];
      const travelSegment = travelSegments[i];

      if (!travelSegment) continue;

      const expectedArrival = this.timeToMinutes(previousItem.departureTime) + travelSegment.duration;
      const actualArrival = this.timeToMinutes(currentItem.arrivalTime);
      const difference = Math.abs(expectedArrival - actualArrival);

      if (difference > 1) { // Allow 1 minute tolerance
        errors.push(
          `${currentItem.place.name}: Expected ${this.minutesToTime(expectedArrival)}, got ${currentItem.arrivalTime} (${difference}min difference)`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper methods
   */
  private static calculateDiningTime(diningStops: any[]): number {
    this.debug('TIMING_DEBUG dining stops calculation start', {
      diningStopsCount: diningStops.length,
      diningStops: diningStops
    });
    
    return diningStops.reduce((total, stop) => {
      const stopImpact = stop.total_stop_impact || 
                        (stop.dining_duration || 0) + (stop.detour_time || 0);
      
      this.debug(`TIMING_DEBUG dining stop impact for ${stop.name}`, {
        stopName: stop.name,
        total_stop_impact: stop.total_stop_impact,
        dining_duration: stop.dining_duration,
        detour_time: stop.detour_time,
        calculatedImpact: stopImpact,
        runningTotal: total + stopImpact
      });
      
      return total + stopImpact;
    }, 0);
  }

  private static calculateMultiDayTotals(days: DailyItinerary[]): number {
    return days.reduce((total, day) => {
      return total + this.parseDuration(day.totalDuration || 0);
    }, 0);
  }

  private static cleanName(name: string): string {
    return name.replace(/\s/g, ''); // Match UI's generateRideId logic exactly - ONLY remove spaces, keep parentheses
  }

  private static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
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
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  private static parseDuration(durationStr: string | number): number {
    if (typeof durationStr === 'number') return durationStr;
    if (!durationStr) return 0;
    
    const str = durationStr.toLowerCase();
    
    // Handle typical_time_spent formats like "1 hour", "2 hours", "30 minutes"
    const hourMatches = str.match(/(\d+(?:\.\d+)?)\s*hours?/);
    const minuteMatches = str.match(/(\d+(?:\.\d+)?)\s*minutes?/);
    
    // Also handle shorthand formats like "1h", "30m"
    const shortHourMatch = str.match(/(\d+)h/);
    const shortMinuteMatch = str.match(/(\d+)m/);
    
    let hours = 0;
    let minutes = 0;
    
    if (hourMatches) {
      hours = parseFloat(hourMatches[1]);
    } else if (shortHourMatch) {
      hours = parseInt(shortHourMatch[1], 10);
    }
    
    if (minuteMatches) {
      minutes = parseFloat(minuteMatches[1]);
    } else if (shortMinuteMatch) {
      minutes = parseInt(shortMinuteMatch[1], 10);
    }
    
    // Convert to total minutes
    const totalMinutes = Math.round(hours * 60 + minutes);
    
    // Ensure reasonable bounds (15 min to 4 hours)
    return Math.max(15, Math.min(240, totalMinutes));
  }

  private static debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(`[UnifiedTravelCalculator] ${message}`, data);
      } else {
        console.log(`[UnifiedTravelCalculator] ${message}`);
      }
    }
  }

  /**
   * Enable/disable debug logging
   */
  static setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }
}

export default UnifiedTravelCalculator;