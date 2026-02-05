import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { getMapView, getMarker, getPolyline } from './MapComponents';
import { PlaceRecommendation } from '../types';
import { PHILADELPHIA_CENTER } from '../utils/constants';

const { width } = Dimensions.get('window');

interface ItineraryMapProps {
  places: PlaceRecommendation[];
  routeWaypoints: any[];
  onMarkerPress?: (place: PlaceRecommendation, index: number) => void;
}

const ItineraryMap: React.FC<ItineraryMapProps> = ({
  places,
  routeWaypoints,
  onMarkerPress,
}) => {
  const MapView = getMapView();
  const Marker = getMarker();
  const Polyline = getPolyline();
  const mapRef = React.useRef<any>(null);

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
    // Fit to coordinates when component mounts or places change
    const timer = setTimeout(fitToCoordinates, 500);
    return () => clearTimeout(timer);
  }, [places]);

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: PHILADELPHIA_CENTER.latitude,
          longitude: PHILADELPHIA_CENTER.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
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
          description={place.address}
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
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 300,
    width: width - 40,
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
  },
});

export default ItineraryMap;
