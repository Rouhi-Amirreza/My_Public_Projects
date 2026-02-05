import { useState, useMemo } from 'react';
import { GeneratedItinerary, MultiDayItinerary } from '../types';

interface UseItineraryStateProps {
  itinerary: GeneratedItinerary | MultiDayItinerary;
}

export const useItineraryState = ({ itinerary }: UseItineraryStateProps) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [itineraryState, setItineraryState] = useState(itinerary);

  // Type guard to check if it's a multi-day itinerary
  const isMultiDay = (checkItinerary: GeneratedItinerary | MultiDayItinerary): checkItinerary is MultiDayItinerary => {
    return 'dailyItineraries' in checkItinerary;
  };

  // Memoized current itinerary to prevent unnecessary recalculations
  const currentItinerary = useMemo((): GeneratedItinerary => {
    if (isMultiDay(itineraryState)) {
      const dayItinerary = itineraryState.dailyItineraries.find(day => day.day === activeDay);
      if (dayItinerary) {
        return {
          places: dayItinerary.places,
          schedule: dayItinerary.schedule,
          total_duration: dayItinerary.total_duration,
          total_walking_time: dayItinerary.total_walking_time,
          total_driving_time: dayItinerary.total_driving_time,
          optimization_notes: dayItinerary.optimization_notes,
          startTime: dayItinerary.startTime,
          endTime: dayItinerary.endTime,
          total_cost: dayItinerary.total_cost,
          weather_conditions: dayItinerary.weather_conditions,
          route_waypoints: dayItinerary.route_waypoints,
        };
      }
      // Fallback to empty itinerary
      return {
        places: [],
        schedule: [],
        total_duration: '0 hours',
        total_walking_time: 0,
        total_driving_time: 0,
        optimization_notes: [],
        startTime: '09:00',
        endTime: '17:00',
        total_cost: 0,
        weather_conditions: null,
        route_waypoints: [],
      };
    } else {
      return itineraryState as GeneratedItinerary;
    }
  }, [itineraryState, activeDay]);

  // Handle day switching for multi-day itineraries
  const handleDayChange = (dayNumber: number) => {
    if (isMultiDay(itineraryState)) {
      const newActiveDay = Math.max(1, Math.min(dayNumber, itineraryState.days));
      setActiveDay(newActiveDay);
    }
  };

  // Get total number of days
  const getTotalDays = (): number => {
    return isMultiDay(itineraryState) ? itineraryState.days : 1;
  };

  // Get current day data
  const getCurrentDayData = () => {
    if (isMultiDay(itineraryState)) {
      return itineraryState.dailyItineraries.find(day => day.day === activeDay);
    }
    return itineraryState;
  };

  return {
    // State
    activeDay,
    itineraryState,
    currentItinerary,
    
    // Actions
    setActiveDay,
    setItineraryState,
    handleDayChange,
    
    // Computed
    isMultiDay: isMultiDay(itineraryState),
    totalDays: getTotalDays(),
    currentDayData: getCurrentDayData(),
    
    // Utils
    isMultiDayCheck: isMultiDay,
  };
};