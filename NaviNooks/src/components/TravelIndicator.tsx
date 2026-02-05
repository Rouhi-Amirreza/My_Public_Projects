import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RideBooking } from '../types';

interface TravelIndicatorProps {
  travelTime: number;
  travelIcon: string;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  distance: number;
  rideId: string;
  onPress?: () => void;
  isRideBooked?: boolean;
  canBookRide?: boolean;
  scheduledTime?: string;
  day?: number;
}

const TravelIndicator: React.FC<TravelIndicatorProps> = ({
  travelTime,
  travelIcon,
  fromLocation,
  toLocation,
  fromCoordinates,
  toCoordinates,
  distance,
  rideId,
  onPress,
  isRideBooked = false,
  canBookRide = true,
  scheduledTime,
  day,
}) => {
  const handlePress = () => {
    if (canBookRide && onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.travelIndicatorContainer}>
      <TouchableOpacity 
        style={[
          styles.circularTravelIndicator,
          canBookRide && styles.clickableIndicator,
          isRideBooked && styles.bookedIndicator
        ]}
        onPress={handlePress}
        disabled={!canBookRide}
        activeOpacity={canBookRide ? 0.7 : 1}
      >
        <Text style={[styles.circularTravelIcon, isRideBooked && styles.bookedIcon]}>
          {isRideBooked ? '✓' : travelIcon}
        </Text>
        <Text style={[styles.circularTravelTime, isRideBooked && styles.bookedTime]}>
          {travelTime}m
        </Text>
      </TouchableOpacity>
      {canBookRide && (
        <View style={styles.bookContainer}>
          {!isRideBooked && <Text style={styles.bookIcon}>📋</Text>}
          <Text style={styles.bookRideText}>
            {isRideBooked ? 'Booked' : 'Book'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  travelIndicatorContainer: {
    alignItems: 'center',
  },
  circularTravelIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clickableIndicator: {
    borderWidth: 2,
    borderColor: '#00D9FF',
    backgroundColor: '#1C1C1E',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bookedIndicator: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
    shadowColor: '#27ae60',
  },
  circularTravelIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  bookedIcon: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  circularTravelTime: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
  },
  bookedTime: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  bookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 2,
  },
  bookIcon: {
    fontSize: 8,
    color: '#00D9FF',
  },
  bookRideText: {
    fontSize: 9,
    color: '#00D9FF',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default TravelIndicator;