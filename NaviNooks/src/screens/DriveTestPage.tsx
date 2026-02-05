import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import GooglePlacesAutocomplete from '../components/GooglePlacesAutocomplete';
import UberService from '../services/UberService';

interface UberPriceEstimate {
  product_id: string;
  display_name: string;
  estimate: string;
  minimum?: string;
  maximum?: string;
  currency_code: string;
  duration?: number;
  distance?: number;
}

const DriveTestPage: React.FC = () => {
  const [startLocation, setStartLocation] = useState<{
    address: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  
  const [destination, setDestination] = useState<{
    address: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  
  const [priceEstimates, setPriceEstimates] = useState<UberPriceEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentRide, setCurrentRide] = useState<any>(null);

  // Check authentication status on component mount
  React.useEffect(() => {
    setIsAuthenticated(UberService.isAuthenticated());
  }, []);

  const handleStartLocationSelected = (address: string, coordinates?: { lat: number; lng: number }) => {
    if (coordinates) {
      setStartLocation({ address, coordinates });
      console.log('Start location selected:', address, coordinates);
    }
  };

  const handleDestinationSelected = (address: string, coordinates?: { lat: number; lng: number }) => {
    if (coordinates) {
      setDestination({ address, coordinates });
      console.log('Destination selected:', address, coordinates);
    }
  };

  const clearLocations = () => {
    setStartLocation(null);
    setDestination(null);
    setPriceEstimates([]);
    setSelectedProductId(null);
    setCurrentRide(null);
  };

  const handleAuthentication = async () => {
    setLoading(true);
    try {
      const result = await UberService.authenticateUser();
      if (result.success) {
        setIsAuthenticated(true);
        Alert.alert('Success', `Welcome ${result.user?.first_name || 'User'}!`);
      } else {
        Alert.alert('Authentication Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate with Uber');
    } finally {
      setLoading(false);
    }
  };

  const handleRideRequest = async (productId: string) => {
    if (!startLocation || !destination) {
      Alert.alert('Error', 'Please select both start location and destination');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please authenticate with Uber first');
      return;
    }

    setLoading(true);
    try {
      const result = await UberService.requestRide({
        product_id: productId,
        start_latitude: startLocation.coordinates.lat,
        start_longitude: startLocation.coordinates.lng,
        end_latitude: destination.coordinates.lat,
        end_longitude: destination.coordinates.lng
      });

      if (result.success && result.ride) {
        setCurrentRide(result.ride);
        Alert.alert('Ride Requested!', `Your ${result.ride.status} ride has been requested. ETA: ${result.ride.eta} minutes`);
      } else {
        Alert.alert('Request Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  const cancelCurrentRide = async () => {
    if (!currentRide) return;

    try {
      const result = await UberService.cancelRide(currentRide.request_id);
      if (result.success) {
        setCurrentRide(null);
        Alert.alert('Ride Canceled', 'Your ride has been canceled successfully');
      } else {
        Alert.alert('Cancellation Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };

  const getPriceEstimates = async () => {
    if (!startLocation || !destination) {
      Alert.alert('Error', 'Please select both start location and destination');
      return;
    }

    setLoading(true);
    setPriceEstimates([]);

    try {
      console.log('Getting Uber price estimates...');
      console.log('From:', startLocation);
      console.log('To:', destination);

      const estimates = await UberService.getPriceEstimates(
        startLocation.coordinates.lat,
        startLocation.coordinates.lng,
        destination.coordinates.lat,
        destination.coordinates.lng
      );

      if (estimates && estimates.length > 0) {
        setPriceEstimates(estimates);
        console.log('Received price estimates:', estimates);
      } else {
        Alert.alert('No Results', 'No Uber price estimates available for this route');
      }
    } catch (error) {
      console.error('Error getting price estimates:', error);
      Alert.alert(
        'Error', 
        'Unable to get Uber price estimates. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Unknown';
    const kilometers = (meters / 1000).toFixed(1);
    return `${kilometers} km`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚗 Drive Test</Text>
        <Text style={styles.headerSubtitle}>Get Uber price estimates for your journey</Text>
      </View>

      {/* Start Location Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>📍 Start Location</Text>
        <GooglePlacesAutocomplete
          placeholder="Enter start location"
          value={startLocation?.address || ''}
          onPlaceSelected={handleStartLocationSelected}
        />
      </View>

      {/* Destination Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>🎯 Destination</Text>
        <GooglePlacesAutocomplete
          placeholder="Enter destination"
          value={destination?.address || ''}
          onPlaceSelected={handleDestinationSelected}
        />
      </View>

      {/* Authentication Status */}
      <View style={styles.authStatus}>
        <Text style={[styles.authText, { color: isAuthenticated ? '#4ECDC4' : '#e74c3c' }]}>
          {isAuthenticated ? '✅ Authenticated with Uber' : '❌ Not authenticated'}
        </Text>
        {!isAuthenticated && (
          <TouchableOpacity
            style={[styles.button, styles.authButton]}
            onPress={handleAuthentication}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Login with Uber</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={getPriceEstimates}
          disabled={loading || !startLocation || !destination}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Get Price Estimates</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearLocations}
        >
          <Text style={styles.secondaryButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Locations Display */}
      {(startLocation || destination) && (
        <View style={styles.locationsDisplay}>
          <Text style={styles.sectionTitle}>Selected Locations</Text>
          
          {startLocation && (
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>From:</Text>
              <Text style={styles.locationText}>{startLocation.address}</Text>
            </View>
          )}
          
          {destination && (
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>To:</Text>
              <Text style={styles.locationText}>{destination.address}</Text>
            </View>
          )}
        </View>
      )}

      {/* Price Estimates Results */}
      {priceEstimates.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>🚕 Uber Price Estimates</Text>
          
          {priceEstimates.map((estimate, index) => (
            <View key={estimate.product_id || index} style={styles.estimateCard}>
              <View style={styles.estimateHeader}>
                <Text style={styles.productName}>{estimate.display_name}</Text>
                <Text style={styles.price}>{estimate.estimate}</Text>
              </View>
              
              <View style={styles.estimateDetails}>
                {estimate.duration && (
                  <Text style={styles.detailText}>
                    ⏱️ {formatDuration(estimate.duration)}
                  </Text>
                )}
                
                {estimate.distance && (
                  <Text style={styles.detailText}>
                    📏 {formatDistance(estimate.distance)}
                  </Text>
                )}
              </View>
              
              {estimate.minimum && estimate.maximum && (
                <Text style={styles.priceRange}>
                  Range: {estimate.minimum} - {estimate.maximum}
                </Text>
              )}

              {/* Request Ride Button */}
              <TouchableOpacity
                style={[styles.button, styles.requestButton]}
                onPress={() => handleRideRequest(estimate.product_id)}
                disabled={loading || !isAuthenticated}
              >
                <Text style={styles.buttonText}>
                  {isAuthenticated ? 'Request This Ride' : 'Login Required'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              💡 Prices are estimates and may vary based on demand, traffic, and other factors
            </Text>
          </View>
        </View>
      )}

      {/* Current Ride Status */}
      {currentRide && (
        <View style={styles.rideStatusContainer}>
          <Text style={styles.sectionTitle}>🚗 Current Ride</Text>
          
          <View style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <Text style={styles.rideStatus}>Status: {currentRide.status.toUpperCase()}</Text>
              <Text style={styles.rideEta}>ETA: {currentRide.eta} min</Text>
            </View>
            
            {currentRide.driver && (
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>Driver: {currentRide.driver.name}</Text>
                <Text style={styles.driverRating}>⭐ {currentRide.driver.rating}</Text>
                <Text style={styles.driverPhone}>📞 {currentRide.driver.phone_number}</Text>
              </View>
            )}
            
            {currentRide.vehicle && (
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleDetails}>
                  🚗 {currentRide.vehicle.make} {currentRide.vehicle.model}
                </Text>
                <Text style={styles.licensePlate}>
                  License: {currentRide.vehicle.license_plate}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={cancelCurrentRide}
            >
              <Text style={styles.buttonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#555555',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cccccc',
  },
  locationsDisplay: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  locationItem: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  resultsContainer: {
    marginTop: 20,
  },
  estimateCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444444',
  },
  estimateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  estimateDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#cccccc',
  },
  priceRange: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  disclaimer: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 16,
  },
  authStatus: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  authText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  authButton: {
    backgroundColor: '#4ECDC4',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  requestButton: {
    backgroundColor: '#4ECDC4',
    marginTop: 12,
    paddingVertical: 10,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    marginTop: 12,
  },
  rideStatusContainer: {
    marginTop: 20,
  },
  rideCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  rideEta: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  driverInfo: {
    marginBottom: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 14,
    color: '#cccccc',
  },
  vehicleInfo: {
    marginBottom: 12,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  licensePlate: {
    fontSize: 14,
    color: '#cccccc',
  },
});

export default DriveTestPage;