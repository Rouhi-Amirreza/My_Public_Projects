import { useState, useRef, useEffect } from 'react';
import { GeneratedItinerary, MultiDayItinerary } from '../types';
import { PHILADELPHIA_CENTER } from '../utils/constants';
import DataService from '../services/DataService';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface UseMapStateProps {
  currentItinerary: GeneratedItinerary;
  startingLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  returnLocation?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export const useMapState = ({ currentItinerary, startingLocation, returnLocation }: UseMapStateProps) => {
  // Initialize map region with a basic region - will be updated in useEffect
  const [mapRegion, setMapRegion] = useState<MapRegion>(() => {
    const currentCity = DataService.getCurrentCity();
    const cityCenter = currentCity?.coordinates || PHILADELPHIA_CENTER;
    return {
      latitude: cityCenter.latitude,
      longitude: cityCenter.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  });

  // Map ref for controlling zoom
  const mapRef = useRef(null);

  // Helper function to extract coordinates safely from different place formats
  const extractCoordinates = async (place: any): Promise<{ lat: number; lng: number }> => {
    // Handle multiple coordinate formats that might exist after place replacement
    if (place.coordinates?.latitude && place.coordinates?.longitude) {
      return {
        lat: parseFloat(place.coordinates.latitude),
        lng: parseFloat(place.coordinates.longitude),
      };
    }
    if (place.coordinates?.lat && place.coordinates?.lng) {
      return {
        lat: parseFloat(place.coordinates.lat),
        lng: parseFloat(place.coordinates.lng),
      };
    }
    if (place.basic_info?.coordinates?.lat && place.basic_info?.coordinates?.lng) {
      return {
        lat: parseFloat(place.basic_info.coordinates.lat),
        lng: parseFloat(place.basic_info.coordinates.lng),
      };
    }
    if (place.latitude && place.longitude) {
      return {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
      };
    }
    if (place.lat && place.lng) {
      return {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lng),
      };
    }
    
    throw new Error(`No valid coordinates found for place: ${place.name}`);
  };

  // Generate complete route coordinates for Polyline
  const generateCompleteRouteCoordinates = () => {
    const routeCoordinates = [];
    
    // Add starting location
    routeCoordinates.push({
      latitude: startingLocation.coordinates.latitude,
      longitude: startingLocation.coordinates.longitude,
    });
    
    // Add all places
    if (currentItinerary.places) {
      currentItinerary.places.forEach(place => {
        if (place.basic_info?.coordinates?.lat && place.basic_info?.coordinates?.lng) {
          routeCoordinates.push({
            latitude: parseFloat(place.basic_info.coordinates.lat),
            longitude: parseFloat(place.basic_info.coordinates.lng),
          });
        } else if (place.coordinates?.lat && place.coordinates?.lng) {
          routeCoordinates.push({
            latitude: parseFloat(place.coordinates.lat),
            longitude: parseFloat(place.coordinates.lng),
          });
        }
      });
    }
    
    // Add return location if it exists and is different from starting
    if (returnLocation && 
        (returnLocation.coordinates.latitude !== startingLocation.coordinates.latitude ||
         returnLocation.coordinates.longitude !== startingLocation.coordinates.longitude)) {
      routeCoordinates.push({
        latitude: returnLocation.coordinates.latitude,
        longitude: returnLocation.coordinates.longitude,
      });
    }
    
    return routeCoordinates;
  };

  // Calculate map region to include all markers (places + dining stops)
  const calculateMapRegion = async (): Promise<MapRegion> => {
    const allCoordinates = [];
    
    // Add starting location
    allCoordinates.push(startingLocation.coordinates);
    
    // Add return location if different
    if (returnLocation) {
      allCoordinates.push(returnLocation.coordinates);
    }
    
    // Add all places with safe coordinate extraction
    if (currentItinerary.places) {
      for (const place of currentItinerary.places) {
        try {
          const coords = await extractCoordinates(place);
          // Only add valid Philadelphia-area coordinates (avoid 0,0 or invalid coords)
          if (coords.lat > 39 && coords.lat < 41 && coords.lng > -76 && coords.lng < -74) {
            allCoordinates.push({ latitude: coords.lat, longitude: coords.lng });
          }
        } catch (error) {
          console.warn('⚠️ Could not get coordinates for map region:', place.name, error);
        }
      }
    }
    
    // Add all dining stops
    if (currentItinerary.schedule) {
      currentItinerary.schedule.forEach(scheduleItem => {
        scheduleItem.diningStops?.forEach(diningStop => {
          // Validate dining stop coordinates too
          if (diningStop.coordinates && 
              diningStop.coordinates.latitude > 39 && diningStop.coordinates.latitude < 41 &&
              diningStop.coordinates.longitude > -76 && diningStop.coordinates.longitude < -74) {
            allCoordinates.push(diningStop.coordinates);
          }
        });
      });
    }
    
    if (allCoordinates.length === 0) {
      // Fallback to current city
      const currentCity = DataService.getCurrentCity();
      const cityCenter = currentCity?.coordinates || PHILADELPHIA_CENTER;
      return {
        latitude: cityCenter.latitude,
        longitude: cityCenter.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    
    // Calculate bounds
    const latitudes = allCoordinates.map(coord => coord.latitude);
    const longitudes = allCoordinates.map(coord => coord.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const latDelta = Math.max(maxLat - minLat, 0.01) * 1.2; // Add 20% padding
    const lngDelta = Math.max(maxLng - minLng, 0.01) * 1.2; // Add 20% padding
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  // Zoom functions
  const zoomIn = () => {
    if (mapRef.current) {
      const currentRegion = mapRegion;
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 0.5,
        longitudeDelta: currentRegion.longitudeDelta * 0.5,
      };
      (mapRef.current as any).animateToRegion(newRegion, 300);
      setMapRegion(newRegion);
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      const currentRegion = mapRegion;
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      };
      (mapRef.current as any).animateToRegion(newRegion, 300);
      setMapRegion(newRegion);
    }
  };

  // Initialize and update map region
  useEffect(() => {
    const updateMapRegion = async () => {
      try {
        const newRegion = await calculateMapRegion();
        setMapRegion(newRegion);
      } catch (error) {
        console.warn('⚠️ Error updating map region, using fallback:', error);
        // Fallback to current city
        const currentCity = DataService.getCurrentCity();
        const cityCenter = currentCity?.coordinates || PHILADELPHIA_CENTER;
        setMapRegion({
          latitude: cityCenter.latitude,
          longitude: cityCenter.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    };

    updateMapRegion();
  }, [currentItinerary]);

  return {
    // State
    mapRegion,
    mapRef,
    
    // Actions
    setMapRegion,
    extractCoordinates,
    generateCompleteRouteCoordinates,
    calculateMapRegion,
    zoomIn,
    zoomOut,
  };
};