import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { RideBooking } from '../types';

const { width } = Dimensions.get('window');

interface RideBookingCardProps {
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  distance: number;
  estimatedDuration: number;
  onRideSelect: (booking: RideBooking) => void;
  selectedRides: RideBooking[];
  rideId: string;
  day?: number;
  scheduledTime?: string;
}

const RideBookingCard: React.FC<RideBookingCardProps> = ({
  fromLocation,
  toLocation,
  fromCoordinates,
  toCoordinates,
  distance,
  estimatedDuration,
  onRideSelect,
  selectedRides,
  rideId,
  day,
  scheduledTime,
}) => {
  const [showModal, setShowModal] = useState(false);

  const rideOptions = [
    {
      type: 'uber' as const,
      name: 'Uber',
      icon: '🚗',
      color: '#000',
      priceMultiplier: 1.0,
    },
    {
      type: 'lyft' as const,
      name: 'Lyft',
      icon: '🚙',
      color: '#ff00bf',
      priceMultiplier: 0.95,
    },
    {
      type: 'taxi' as const,
      name: 'Taxi',
      icon: '🚕',
      color: '#ffcc00',
      priceMultiplier: 1.2,
    },
  ];

  const calculatePrice = (multiplier: number) => {
    const basePrice = Math.max(8, distance * 0.002 + estimatedDuration * 0.3);
    return basePrice * multiplier;
  };

  const isRideSelected = selectedRides.some(ride => ride.id === rideId);

  const handleRideSelection = (rideType: 'uber' | 'lyft' | 'taxi', price: number) => {
    const booking: RideBooking = {
      id: rideId,
      fromLocation,
      toLocation,
      fromCoordinates,
      toCoordinates,
      rideType,
      estimatedPrice: price,
      estimatedDuration,
      distance,
      day,
      scheduledTime,
      selected: true,
    };

    onRideSelect(booking);
    setShowModal(false);
  };

  const estimatedPrice = calculatePrice(1.0);

  return (
    <>
      <TouchableOpacity
        style={[styles.rideCard, isRideSelected && styles.selectedRideCard]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.rideHeader}>
          <View style={styles.rideLeft}>
            <Text style={styles.rideIcon}>🚗</Text>
            <View style={styles.rideInfo}>
              <Text style={styles.rideTitle}>Book Ride</Text>
              <Text style={styles.rideSubtitle}>
                {Math.round(distance / 1000 * 10) / 10} km • {estimatedDuration} min • From ${estimatedPrice.toFixed(0)}
              </Text>
            </View>
          </View>
          <View style={[styles.rideStatus, isRideSelected && styles.selectedStatus]}>
            {isRideSelected ? (
              <Text style={styles.selectedText}>✓</Text>
            ) : (
              <Text style={styles.selectText}>Book</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ride Service</Text>
              <Text style={styles.modalSubtitle}>
                {Math.round(distance / 1000 * 10) / 10} km • {estimatedDuration} min
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.routeDisplay}>
              <Text style={styles.routeLabel}>Route:</Text>
              <Text style={styles.routeText}>
                {fromLocation} → {toLocation}
              </Text>
            </View>

            <ScrollView style={styles.ridesList}>
              {rideOptions.map((option, index) => {
                const price = calculatePrice(option.priceMultiplier);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.rideOption}
                    onPress={() => handleRideSelection(option.type, price)}
                  >
                    <View style={styles.rideOptionContent}>
                      <View style={styles.rideOptionLeft}>
                        <Text style={styles.rideOptionIcon}>{option.icon}</Text>
                        <View style={styles.rideOptionInfo}>
                          <Text style={styles.rideOptionName}>{option.name}</Text>
                          <Text style={styles.rideOptionTime}>
                            {estimatedDuration} min • {Math.round(distance / 1000 * 10) / 10} km
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rideOptionRight}>
                        <Text style={styles.rideOptionPrice}>${price.toFixed(2)}</Text>
                        <Text style={styles.rideOptionEstimate}>Estimated</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.rideDisclaimer}>
              <Text style={styles.disclaimerText}>
                💡 Prices are estimates and may vary based on demand, time of day, and other factors.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  rideCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#f0e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedRideCard: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOpacity: 0.2,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  rideInfo: {
    flex: 1,
  },
  rideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  rideSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 1,
  },
  rideStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e5e5',
    minWidth: 50,
    alignItems: 'center',
  },
  selectedStatus: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  routeFrom: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  routeArrow: {
    fontSize: 16,
    color: '#7f8c8d',
    marginHorizontal: 8,
  },
  routeTo: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5f0',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#7f8c8d',
    fontWeight: '300',
  },
  routeDisplay: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5f0',
  },
  routeLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  routeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  ridesList: {
    padding: 20,
  },
  rideOption: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5f0',
  },
  rideOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideOptionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  rideOptionTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  rideOptionRight: {
    alignItems: 'flex-end',
  },
  rideOptionPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  rideOptionEstimate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  rideDisclaimer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e1e5f0',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RideBookingCard;