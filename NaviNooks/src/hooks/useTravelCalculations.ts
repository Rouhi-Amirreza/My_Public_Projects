import { useState, useCallback } from 'react';
import { TravelOptions, GeneratedItinerary, MultiDayItinerary } from '../types';
import GoogleMapsService from '../services/GoogleMapsService';
import UnifiedTravelCalculator from '../services/UnifiedTravelCalculator';
import TravelTimeDisplayService from '../services/TravelTimeDisplayService';
import { 
  updateSubsequentArrivalTimes, 
  calculateTravelTimeDifference, 
  extractPlaceIndexFromRideId 
} from '../utils/itinerary/scheduleUtils';

interface UseTravelCalculationsProps {
  itineraryState: GeneratedItinerary | MultiDayItinerary;
  setItineraryState: (state: GeneratedItinerary | MultiDayItinerary) => void;
  activeDay: number;
}

export const useTravelCalculations = ({ 
  itineraryState, 
  setItineraryState, 
  activeDay 
}: UseTravelCalculationsProps) => {
  const [travelModes, setTravelModes] = useState<Record<string, 'driving' | 'walking'>>({});
  const [travelOptions, setTravelOptions] = useState<Record<string, TravelOptions>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Type guard for multi-day itinerary
  const isMultiDay = (checkItinerary: GeneratedItinerary | MultiDayItinerary): checkItinerary is MultiDayItinerary => {
    return 'days' in checkItinerary;
  };

  // Calculate both walking and driving times for a travel segment
  const calculateTravelOptions = async (
    rideId: string,
    fromLocation: string,
    toLocation: string,
    fromCoordinates: { latitude: number; longitude: number },
    toCoordinates: { latitude: number; longitude: number }
  ): Promise<TravelOptions | null> => {
    try {
      const origin = `${fromCoordinates.latitude},${fromCoordinates.longitude}`;
      const destination = `${toCoordinates.latitude},${toCoordinates.longitude}`;

      const drivingResult = await GoogleMapsService.getPreciseTravelTime(origin, destination, 'driving');
      const walkingResult = await GoogleMapsService.getPreciseTravelTime(origin, destination, 'walking');

      const travelOptions: TravelOptions = {
        driving: {
          duration: drivingResult.duration,
          distance: drivingResult.distance,
          icon: drivingResult.icon,
        },
        walking: {
          duration: walkingResult.duration,
          distance: walkingResult.distance,
          icon: walkingResult.icon,
        },
        rideId,
        fromLocation,
        toLocation,
        fromCoordinates,
        toCoordinates,
      };

      // Determine smart default mode
      let defaultMode: 'driving' | 'walking' = 'driving';
      
      if (walkingResult.duration < drivingResult.duration) {
        defaultMode = 'walking';
      } else if (walkingResult.duration <= 5) {
        defaultMode = 'walking';
      } else if (walkingResult.duration <= 10 && drivingResult.duration >= 15) {
        defaultMode = 'walking';
      }

      if (!travelModes[rideId]) {
        setTravelModes(prev => ({ ...prev, [rideId]: defaultMode }));
      }

      return travelOptions;
    } catch (error) {
      console.error(`❌ Failed to calculate travel options for ${rideId}:`, error);
      return null;
    }
  };

  // Unified travel calculation using new system
  const calculateUnifiedSchedule = useCallback((
    state: any, 
    dayIndex?: number, 
    overrideTravelOptions?: Record<string, any>, 
    overrideTravelModes?: Record<string, any>
  ) => {
    try {
      const startTime = state.startTime || state.schedule?.[0]?.arrivalTime || '09:00';
      const finalTravelOptions = overrideTravelOptions || travelOptions;
      const finalTravelModes = overrideTravelModes || travelModes;
      
      // Transfer dining stops from schedule back to places before recalculation
      const stateWithDiningStops = { ...state };
      
      if (isMultiDay(state) && dayIndex !== undefined) {
        const day = state.dailyItineraries[dayIndex];
        if (day && day.schedule && day.places) {
          const updatedPlaces = day.places.map((place: any, index: number) => {
            const scheduleItem = day.schedule[index];
            if (scheduleItem) {
              const updatedPlace = { ...place };
              
              if (scheduleItem.diningStops && scheduleItem.diningStops.length > 0) {
                updatedPlace.diningStops = scheduleItem.diningStops;
              }
              
              if (scheduleItem.visitDuration && scheduleItem.visitDuration !== place.estimatedVisitDuration) {
                updatedPlace.estimatedVisitDuration = scheduleItem.visitDuration;
              }
              
              return updatedPlace;
            }
            return place;
          });
          
          const updatedDay = { ...day, places: updatedPlaces };
          const updatedDailyItineraries = [...state.dailyItineraries];
          updatedDailyItineraries[dayIndex] = updatedDay;
          stateWithDiningStops.dailyItineraries = updatedDailyItineraries;
        }
      } else if (state.schedule && state.places) {
        const updatedPlaces = state.places.map((place: any, index: number) => {
          const scheduleItem = state.schedule[index];
          if (scheduleItem) {
            const updatedPlace = { ...place };
            
            if (scheduleItem.diningStops && scheduleItem.diningStops.length > 0) {
              updatedPlace.diningStops = scheduleItem.diningStops;
            }
            
            if (scheduleItem.visitDuration && scheduleItem.visitDuration !== place.estimatedVisitDuration) {
              updatedPlace.estimatedVisitDuration = scheduleItem.visitDuration;
            }
            
            return updatedPlace;
          }
          return place;
        });
        stateWithDiningStops.places = updatedPlaces;
      }
      
      const options = {
        startTime,
        availableTravelOptions: finalTravelOptions,
        selectedTravelModes: finalTravelModes,
        enableDebugLogging: true
      };
      
      const result = UnifiedTravelCalculator.calculateCompleteSchedule(
        stateWithDiningStops,
        options,
        dayIndex
      );
      
      return result;
    } catch (error) {
      console.error('❌ UnifiedTravelCalculator error:', error);
      return state;
    }
  }, [travelOptions, travelModes, isMultiDay]);

  // Handle travel mode change - FIXED: Only affects subsequent locations
  const handleTravelModeChange = (rideId: string, newMode: 'driving' | 'walking') => {
    const currentMode = travelModes[rideId] || 'driving';
    
    if (currentMode === newMode) return;
    
    console.log(`🔄 Travel mode change: ${rideId} from ${currentMode} to ${newMode}`);
    
    // Update travel modes first
    const updatedModes = {
      ...travelModes,
      [rideId]: newMode
    };
    
    setTravelModes(updatedModes);
    
    // For single-day trips, use proper schedule recalculation instead of time offsets
    // This ensures that only the affected travel segment and subsequent places are recalculated correctly
    console.log(`🔄 Recalculating schedule with updated travel mode: ${rideId} = ${newMode}`);
    
    // Use the existing calculateUnifiedSchedule function which properly handles travel mode changes
    const recalculatedItinerary = calculateUnifiedSchedule(
      itineraryState,
      isMultiDay(itineraryState) ? activeDay - 1 : undefined,
      travelOptions,
      updatedModes
    );
    
    setItineraryState(recalculatedItinerary);
  };

  // Handle dining stop travel mode change
  const handleDiningStopTravelModeChange = (
    rideId: string, 
    newMode: 'driving' | 'walking', 
    diningStopIndex: number, 
    itemIndex: number, 
    travelDirection: 'to' | 'from'
  ) => {
    const currentMode = travelModes[rideId] || 'driving';
    
    if (currentMode === newMode) return;
    
    const updatedModes = {
      ...travelModes,
      [rideId]: newMode
    };
    
    setTravelModes(updatedModes);
    
    // Update the dining stop's travel_breakdown properties for UI display
    setItineraryState(prevState => {
      try {
        let updatedState;
        
        if (isMultiDay(prevState)) {
          const updatedDailyItineraries = prevState.dailyItineraries.map(day => {
            if (day.day === activeDay) {
              const updatedSchedule = day.schedule.map((item, index) => {
                if (index === itemIndex && item.diningStops && item.diningStops[diningStopIndex]) {
                  const updatedDiningStops = [...item.diningStops];
                  const diningStop = { ...updatedDiningStops[diningStopIndex] };
                  
                  if (diningStop.travel_breakdown) {
                    diningStop.travel_breakdown = {
                      ...diningStop.travel_breakdown,
                      [`travel_${travelDirection}_mode`]: newMode,
                      [`travel_${travelDirection}_icon`]: newMode === 'walking' ? '🚶' : '🚗'
                    };
                  }
                  
                  updatedDiningStops[diningStopIndex] = diningStop;
                  return { ...item, diningStops: updatedDiningStops };
                }
                return item;
              });
              return { ...day, schedule: updatedSchedule };
            }
            return day;
          });
          updatedState = { ...prevState, dailyItineraries: updatedDailyItineraries };
        } else {
          const updatedSchedule = prevState.schedule.map((item, index) => {
            if (index === itemIndex && item.diningStops && item.diningStops[diningStopIndex]) {
              const updatedDiningStops = [...item.diningStops];
              const diningStop = { ...updatedDiningStops[diningStopIndex] };
              
              if (diningStop.travel_breakdown) {
                diningStop.travel_breakdown = {
                  ...diningStop.travel_breakdown,
                  [`travel_${travelDirection}_mode`]: newMode,
                  [`travel_${travelDirection}_icon`]: newMode === 'walking' ? '🚶' : '🚗'
                };
              }
              
              updatedDiningStops[diningStopIndex] = diningStop;
              return { ...item, diningStops: updatedDiningStops };
            }
            return item;
          });
          updatedState = { ...prevState, schedule: updatedSchedule };
        }
        
        return updatedState;
      } catch (error) {
        console.error('Error updating dining stop travel mode for UI:', error);
        return prevState;
      }
    });
    
    // Apply targeted time updates for dining stop travel changes
    setTimeout(() => {
      console.log(`🍽️ Applying targeted time update for dining stop travel mode change: ${rideId}`);
      
      // Calculate the time difference for this dining stop travel segment
      const timeDifference = calculateTravelTimeDifference(rideId, currentMode, newMode, travelOptions);
      
      if (timeDifference !== 0) {
        // For dining stops, determine which place's arrival time should be affected
        // Dining stops between places affect the next place's arrival time
        const affectedPlaceIndex = itemIndex + 1; // The place after the dining stop
        
        console.log(`⏰ Dining stop travel change affects place index ${affectedPlaceIndex} with ${timeDifference} minutes difference`);
        
        if (affectedPlaceIndex < (isMultiDay(itineraryState) ? 
            (itineraryState as any).dailyItineraries[activeDay - 1]?.places?.length || 0 : 
            (itineraryState as any).places?.length || 0)) {
          
          // Update subsequent arrival times without full recalculation
          const updatedItinerary = updateSubsequentArrivalTimes(
            itineraryState,
            affectedPlaceIndex,
            timeDifference,
            isMultiDay(itineraryState),
            isMultiDay(itineraryState) ? activeDay : undefined
          );
          
          setItineraryState(updatedItinerary);
        }
      }
    }, 50);
  };

  // Get unified travel display information
  const getTravelDisplayInfo = (segmentId: string, selectedMode: 'driving' | 'walking') => {
    return TravelTimeDisplayService.getTravelDisplayInfo(
      segmentId,
      selectedMode,
      travelOptions
    );
  };

  // Get travel mode options for UI
  const getTravelModeOptions = (segmentId: string, selectedMode: 'driving' | 'walking') => {
    const options = travelOptions[segmentId];
    if (!options) return null;
    
    return {
      driving: options.driving,
      walking: options.walking,
      selected: selectedMode
    };
  };

  // Format travel time for display
  const formatTravelTime = (duration: number) => {
    return duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`;
  };

  return {
    // State
    travelModes,
    travelOptions,
    isRecalculating,
    
    // Actions
    setTravelModes,
    setTravelOptions,
    setIsRecalculating,
    calculateTravelOptions,
    calculateUnifiedSchedule,
    handleTravelModeChange,
    handleDiningStopTravelModeChange,
    getTravelDisplayInfo,
    getTravelModeOptions,
    formatTravelTime,
  };
};