import React from 'react';
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

const ACCENT = '#4ECDC4';
const DARK_BG = '#181A20';
const CARD_BG = '#23262F';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#B0B3B8';
const SUCCESS = '#27ae60';
const ERROR = '#e74c3c';

interface RideSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  fromLocation: string;
  toLocation: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  distance: number;
  estimatedDuration: number;
  rideId: string;
  scheduledTime?: string;
  day?: number;
  onRideSelect: (booking: RideBooking) => void;
  onRideRemove: (rideId: string) => void;
  currentBooking?: RideBooking;
}

const RideSelectionModal: React.FC<RideSelectionModalProps> = ({
  visible,
  onClose,
  fromLocation,
  toLocation,
  fromCoordinates,
  toCoordinates,
  distance,
  estimatedDuration,
  rideId,
  scheduledTime,
  day,
  onRideSelect,
  onRideRemove,
  currentBooking,
}) => {
  const rideOptions = [
    {
      type: 'lyft' as const,
      name: 'Lyft',
      icon: '🚙',
      color: '#ff00bf',
      priceMultiplier: 0.95,
      description: 'Private ride',
    },
    {
      type: 'lyft_shared' as const,
      name: 'Lyft Shared',
      icon: '🚙',
      color: '#ff00bf',
      priceMultiplier: 0.7,
      description: 'Shared ride',
    },
    {
      type: 'curb' as const,
      name: 'Curb',
      icon: '🚕',
      color: '#ffcc00',
      priceMultiplier: 1.0,
      description: 'Taxi service',
    },
  ];

  const calculatePrice = (multiplier: number) => {
    const basePrice = Math.max(8, distance * 0.002 + estimatedDuration * 0.3);
    return basePrice * multiplier;
  };

  const handleRideSelection = (rideType: any, price: number) => {
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
    onClose();
  };

  const handleRideRemoval = () => {
    onRideRemove(rideId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentBooking ? 'Manage Ride Service' : 'Select Ride Service'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {Math.round(distance / 1000 * 10) / 10} km • {estimatedDuration} min
            </Text>
            {currentBooking && (
              <Text style={styles.currentBookingText}>
                Current: {currentBooking.rideType.toUpperCase()} • ${currentBooking.estimatedPrice.toFixed(2)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
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

          {/* Remove Button Section */}
          {currentBooking && (
            <View style={styles.removeSection}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRideRemoval}
                activeOpacity={0.8}
              >
                <Text style={styles.removeButtonIcon}>🗑️</Text>
                <Text style={styles.removeButtonText}>Remove Current Ride</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
            {rideOptions.map((option, index) => {
              const price = calculatePrice(option.priceMultiplier);
              const isShared = option.name.includes('Pool') || option.name.includes('Shared');
              const isCurrentSelection = currentBooking?.rideType === option.type;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.rideOption, 
                    isShared && styles.sharedRideOption,
                    isCurrentSelection && styles.selectedRideOption
                  ]}
                  onPress={() => handleRideSelection(option.type, price)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rideOptionContent}>
                    <View style={styles.rideOptionLeft}>
                      <Text style={styles.rideOptionIcon}>{option.icon}</Text>
                      <View style={styles.rideOptionInfo}>
                        <View style={styles.rideOptionNameRow}>
                          <Text style={[styles.rideOptionName, isCurrentSelection && styles.selectedRideText]}>
                            {option.name}
                          </Text>
                          {isCurrentSelection && (
                            <View style={styles.currentSelectionBadge}>
                              <Text style={styles.currentSelectionBadgeText}>Current</Text>
                            </View>
                          )}
                          {isShared && !isCurrentSelection && (
                            <View style={styles.sharedBadge}>
                              <Text style={styles.sharedBadgeText}>Shared</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.rideOptionDescription, isCurrentSelection && styles.selectedRideText]}>
                          {option.description} • {estimatedDuration} min
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rideOptionRight}>
                      <Text style={[styles.rideOptionPrice, isCurrentSelection && styles.selectedRideText]}>
                        ${price.toFixed(2)}
                      </Text>
                      <Text style={[styles.rideOptionEstimate, isCurrentSelection && styles.selectedRideText]}>
                        {isCurrentSelection ? 'Selected' : 'Est.'}
                      </Text>
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
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,12,20,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  currentBookingText: {
    fontSize: 13,
    color: SUCCESS,
    marginTop: 6,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  closeButtonText: {
    fontSize: 22,
    color: TEXT_SECONDARY,
    fontWeight: '400',
  },
  routeDisplay: {
    padding: 12,
    backgroundColor: DARK_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  routeLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  routeText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
  ridesList: {
    padding: 12,
  },
  rideOption: {
    backgroundColor: DARK_BG,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  sharedRideOption: {
    backgroundColor: '#1e2a2f',
    borderColor: ACCENT,
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
    fontSize: 28,
    marginRight: 10,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rideOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  sharedBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  sharedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  rideOptionDescription: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  rideOptionRight: {
    alignItems: 'flex-end',
  },
  rideOptionPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  rideOptionEstimate: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  rideDisclaimer: {
    padding: 12,
    backgroundColor: DARK_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  disclaimerText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 16,
  },
  removeSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ERROR,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: ERROR,
    shadowColor: ERROR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  removeButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  selectedRideOption: {
    backgroundColor: '#153C3C',
    borderColor: ACCENT,
    borderWidth: 2,
    shadowColor: ACCENT,
    shadowOpacity: 0.15,
  },
  selectedRideText: {
    color: ACCENT,
    fontWeight: '700',
  },
  currentSelectionBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  currentSelectionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default RideSelectionModal;