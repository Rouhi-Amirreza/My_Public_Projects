import React from 'react';
import { Platform } from 'react-native';

// Singleton pattern to ensure map components are only loaded once
class MapComponentsSingleton {
  private static instance: MapComponentsSingleton;
  private MapView: any = null;
  private Marker: any = null;
  private Polyline: any = null;
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): MapComponentsSingleton {
    if (!MapComponentsSingleton.instance) {
      MapComponentsSingleton.instance = new MapComponentsSingleton();
    }
    return MapComponentsSingleton.instance;
  }

  public loadComponents() {
    if (this.isLoaded) {
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        const ReactNativeMaps = require('react-native-maps');
        this.MapView = ReactNativeMaps.default;
        this.Marker = ReactNativeMaps.Marker;
        this.Polyline = ReactNativeMaps.Polyline;
        this.isLoaded = true;
      } catch (error) {
        console.warn('react-native-maps not available:', error);
      }
    }
  }

  public getMapView() {
    if (!this.isLoaded) {
      this.loadComponents();
    }
    return this.MapView;
  }

  public getMarker() {
    if (!this.isLoaded) {
      this.loadComponents();
    }
    return this.Marker;
  }

  public getPolyline() {
    if (!this.isLoaded) {
      this.loadComponents();
    }
    return this.Polyline;
  }
}

// Create singleton instance
const mapComponents = MapComponentsSingleton.getInstance();

// Export components as functions to ensure single loading
export const getMapView = () => mapComponents.getMapView();
export const getMarker = () => mapComponents.getMarker();
export const getPolyline = () => mapComponents.getPolyline();

// Create a reusable map component to avoid duplicate registrations
export const ItineraryMapComponent: React.FC<{
  places: any[];
  routeWaypoints: any[];
  onMarkerPress?: (place: any, index: number) => void;
  style?: any;
  initialRegion?: any;
}> = ({ places, routeWaypoints, onMarkerPress, style, initialRegion }) => {
  const mapRef = React.useRef<any>(null);
  const MapView = getMapView();
  const Marker = getMarker();
  const Polyline = getPolyline();

  const fitToCoordinates = () => {
    if (mapRef.current && places.length > 0) {
      const coordinates = places.map(place => ({
        latitude: place.coordinates.latitude,
        longitude: place.coordinates.longitude,
      }));
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(fitToCoordinates, 500);
    return () => clearTimeout(timer);
  }, [places]);

  if (!MapView) {
    return null; // Return null if map components aren't available
  }

  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      onMapReady={fitToCoordinates}
    >
      {places.map((place, index) => (
        <Marker
          key={place.place_id || index}
          coordinate={{
            latitude: place.coordinates.latitude,
            longitude: place.coordinates.longitude,
          }}
          title={place.name}
          description={place.vicinity}
          onPress={() => onMarkerPress?.(place, index)}
        />
      ))}
      
      {routeWaypoints.length > 1 && (
        <Polyline
          coordinates={routeWaypoints.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude,
          }))}
          strokeWidth={3}
          strokeColor="#007bff"
          lineDashPattern={[5, 5]}
        />
      )}
    </MapView>
  );
}; 