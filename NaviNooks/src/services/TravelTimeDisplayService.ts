/**
 * TravelTimeDisplayService - Unified UI display for travel times
 * 
 * This service ensures consistent display of travel times across all UI components:
 * - Travel indicators
 * - Schedule displays  
 * - Travel mode selectors
 * - Debugging information
 */

import { TravelOptions } from '../types';

export interface TravelDisplayInfo {
  segmentId: string;
  mode: 'driving' | 'walking';
  duration: number;
  distance: number;
  icon: string;
  isAvailable: boolean;
  alternativeMode?: {
    mode: 'driving' | 'walking';
    duration: number;
    icon: string;
  };
}

export interface TravelModeOption {
  mode: 'driving' | 'walking';
  duration: number;
  distance: number;
  icon: string;
  label: string;
  isSelected: boolean;
  isRecommended?: boolean;
}

class TravelTimeDisplayService {
  
  /**
   * Get display information for a travel segment
   */
  static getTravelDisplayInfo(
    segmentId: string,
    selectedMode: 'driving' | 'walking',
    travelOptions: Record<string, TravelOptions>
  ): TravelDisplayInfo {
    const options = travelOptions[segmentId];
    
    if (!options) {
      return {
        segmentId,
        mode: selectedMode,
        duration: 0,
        distance: 0,
        icon: selectedMode === 'driving' ? '🚗' : '🚶',
        isAvailable: false
      };
    }

    const modeData = options[selectedMode];
    const alternativeMode = selectedMode === 'driving' ? 'walking' : 'driving';
    const alternativeData = options[alternativeMode];

    return {
      segmentId,
      mode: selectedMode,
      duration: modeData?.duration || 0,
      distance: modeData?.distance || 0,
      icon: modeData?.icon || (selectedMode === 'driving' ? '🚗' : '🚶'),
      isAvailable: !!modeData,
      alternativeMode: alternativeData ? {
        mode: alternativeMode,
        duration: alternativeData.duration,
        icon: alternativeData.icon
      } : undefined
    };
  }

  /**
   * Get both travel mode options for selection UI
   */
  static getTravelModeOptions(
    segmentId: string,
    selectedMode: 'driving' | 'walking',
    travelOptions: Record<string, TravelOptions>
  ): TravelModeOption[] {
    const options = travelOptions[segmentId];
    
    if (!options) {
      return [
        {
          mode: 'driving',
          duration: 0,
          distance: 0,
          icon: '🚗',
          label: 'Drive',
          isSelected: selectedMode === 'driving'
        },
        {
          mode: 'walking',
          duration: 0,
          distance: 0,
          icon: '🚶',
          label: 'Walk',
          isSelected: selectedMode === 'walking'
        }
      ];
    }

    const drivingData = options.driving;
    const walkingData = options.walking;

    // Determine which mode is recommended
    const recommended = this.getRecommendedMode(drivingData, walkingData);

    return [
      {
        mode: 'driving',
        duration: drivingData?.duration || 0,
        distance: drivingData?.distance || 0,
        icon: drivingData?.icon || '🚗',
        label: 'Drive',
        isSelected: selectedMode === 'driving',
        isRecommended: recommended === 'driving'
      },
      {
        mode: 'walking',
        duration: walkingData?.duration || 0,
        distance: walkingData?.distance || 0,
        icon: walkingData?.icon || '🚶',
        label: 'Walk',
        isSelected: selectedMode === 'walking',
        isRecommended: recommended === 'walking'
      }
    ];
  }

  /**
   * Format travel time for display
   */
  static formatTravelTime(duration: number): string {
    if (duration === 0) return '0min';
    if (duration < 60) return `${duration}min`;
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  /**
   * Format distance for display
   */
  static formatDistance(distance: number): string {
    if (distance < 1000) return `${distance}m`;
    const km = (distance / 1000).toFixed(1);
    return `${km}km`;
  }

  /**
   * Get complete travel segment description
   */
  static getTravelDescription(
    fromPlace: string,
    toPlace: string,
    displayInfo: TravelDisplayInfo
  ): string {
    const timeStr = this.formatTravelTime(displayInfo.duration);
    const distanceStr = this.formatDistance(displayInfo.distance);
    const modeStr = displayInfo.mode === 'driving' ? 'drive' : 'walk';
    
    return `${modeStr} ${timeStr} (${distanceStr}) from ${fromPlace} to ${toPlace}`;
  }

  /**
   * Get travel time comparison text
   */
  static getTravelComparison(
    segmentId: string,
    travelOptions: Record<string, TravelOptions>
  ): string {
    const options = travelOptions[segmentId];
    if (!options?.driving || !options?.walking) {
      return '';
    }

    const drivingTime = options.driving.duration;
    const walkingTime = options.walking.duration;
    const difference = walkingTime - drivingTime;
    const ratio = walkingTime / drivingTime;

    if (difference <= 2) {
      return `Walking takes only ${difference} minutes longer`;
    } else if (ratio <= 2) {
      return `Walking takes ${this.formatTravelTime(difference)} longer`;
    } else {
      return `Driving is ${ratio.toFixed(1)}x faster than walking`;
    }
  }

  /**
   * Determine recommended travel mode based on travel times
   */
  private static getRecommendedMode(
    drivingData: any,
    walkingData: any
  ): 'driving' | 'walking' {
    if (!drivingData || !walkingData) {
      return 'driving'; // Default if data missing
    }

    const drivingTime = drivingData.duration;
    const walkingTime = walkingData.duration;

    // Recommend walking if:
    // 1. Walking is faster (traffic/parking issues)
    // 2. Walking is very short (≤ 5 minutes)
    // 3. Walking is only slightly longer (≤ 3 minutes difference)
    
    if (walkingTime <= drivingTime) {
      return 'walking'; // Walking is faster
    }
    
    if (walkingTime <= 5) {
      return 'walking'; // Very short walk
    }
    
    if (walkingTime - drivingTime <= 3) {
      return 'walking'; // Only slightly longer
    }
    
    return 'driving';
  }

  /**
   * Get debug information for travel segment
   */
  static getDebugInfo(
    segmentId: string,
    selectedMode: 'driving' | 'walking',
    travelOptions: Record<string, TravelOptions>
  ): any {
    const options = travelOptions[segmentId];
    
    return {
      segmentId,
      selectedMode,
      hasOptions: !!options,
      drivingTime: options?.driving?.duration || 'N/A',
      walkingTime: options?.walking?.duration || 'N/A',
      selectedModeTime: options?.[selectedMode]?.duration || 'N/A',
      drivingDistance: options?.driving?.distance || 'N/A',
      walkingDistance: options?.walking?.distance || 'N/A',
      recommendation: options ? this.getRecommendedMode(options.driving, options.walking) : 'unknown'
    };
  }

  /**
   * Validate that display matches calculation
   */
  static validateDisplayConsistency(
    segmentId: string,
    displayedTime: number,
    calculatedTime: number,
    mode: 'driving' | 'walking'
  ): { isConsistent: boolean; error?: string } {
    if (Math.abs(displayedTime - calculatedTime) <= 1) {
      return { isConsistent: true };
    }
    
    return {
      isConsistent: false,
      error: `Display inconsistency for ${segmentId} (${mode}): UI shows ${displayedTime}min but calculation uses ${calculatedTime}min`
    };
  }
}

export default TravelTimeDisplayService;