import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import { DiningStop } from '../types';

interface ReservationModalProps {
  diningStop: DiningStop | null;
  onClose: () => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ diningStop, onClose }) => {
  const [numberOfPeople, setNumberOfPeople] = useState('2');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  // Pre-fill date and time with dining stop arrival information
  useEffect(() => {
    if (diningStop?.arrival_time) {
      const arrivalDate = new Date();
      const formattedDate = `${(arrivalDate.getMonth() + 1).toString().padStart(2, '0')}/${arrivalDate.getDate().toString().padStart(2, '0')}/${arrivalDate.getFullYear()}`;
      setReservationDate(formattedDate);
      setReservationTime(diningStop.arrival_time);
    }
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [diningStop]);

  const handleSubmitReservation = () => {
    if (!diningStop) return;

    // Validate required fields
    if (!numberOfPeople || !reservationDate || !reservationTime || !contactName || !contactPhone) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Show confirmation
    Alert.alert(
      'Reservation Submitted',
      `Your reservation request for ${diningStop.name} has been submitted!\n\nDetails:\n• Date: ${reservationDate}\n• Time: ${reservationTime}\n• Party Size: ${numberOfPeople}\n• Contact: ${contactName}\n\nYou will receive a confirmation call or email shortly.`,
      [
        {
          text: 'OK',
          onPress: onClose,
        },
      ]
    );
  };

  console.log('🔔 ReservationModal render - diningStop:', diningStop);
  console.log('🔔 ReservationModal props:', { diningStop: !!diningStop, hasOnClose: !!onClose });

  if (!diningStop) {
    console.log('🔔 ReservationModal - diningStop is null, returning fallback');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', fontSize: 20, textAlign: 'center', marginBottom: 20 }}>
          No dining stop selected
        </Text>
        <TouchableOpacity 
          style={[styles.submitButton, { width: 200 }]} 
          onPress={onClose}
        >
          <Text style={styles.submitButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>🍽️</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Make Reservation</Text>
            <Text style={styles.headerSubtitle}>Book your table at this restaurant</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Restaurant Info Card */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantHeader}>
            <View style={styles.restaurantIcon}>
              <Text style={styles.restaurantIconText}>
                {diningStop.meal_type === 'breakfast' && '🥐'}
                {diningStop.meal_type === 'brunch' && '🥞'}
                {diningStop.meal_type === 'coffee' && '☕'}
                {diningStop.meal_type === 'lunch' && '🍽️'}
                {diningStop.meal_type === 'dinner' && '🍷'}
                {diningStop.meal_type === 'drinks' && '🍸'}
                {!['breakfast', 'brunch', 'coffee', 'lunch', 'dinner', 'drinks'].includes(diningStop.meal_type) && '🍴'}
              </Text>
            </View>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{diningStop.name}</Text>
              <View style={styles.mealTypeChip}>
                <Text style={styles.mealTypeText}>
                  {diningStop.meal_type.charAt(0).toUpperCase() + diningStop.meal_type.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.restaurantAddress}>{diningStop.address}</Text>
          </View>
        </View>

        {/* Reservation Form */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reservation Details</Text>
            <View style={styles.sectionIndicator} />
          </View>
          
          {/* Party Size */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of People *</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const current = parseInt(numberOfPeople) || 1;
                  if (current > 1) setNumberOfPeople((current - 1).toString());
                }}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.counterDisplay}>
                <Text style={styles.counterText}>{numberOfPeople}</Text>
                <Text style={styles.counterLabel}>people</Text>
              </View>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const current = parseInt(numberOfPeople) || 1;
                  if (current < 20) setNumberOfPeople((current + 1).toString());
                }}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date and Time */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Date *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📅</Text>
                <TextInput
                  style={styles.input}
                  value={reservationDate}
                  onChangeText={setReservationDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#6C6C70"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Time *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🕐</Text>
                <TextInput
                  style={styles.input}
                  value={reservationTime}
                  onChangeText={setReservationTime}
                  placeholder="HH:MM AM/PM"
                  placeholderTextColor="#6C6C70"
                />
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.contactSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.sectionIndicator} />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Your full name"
                  placeholderTextColor="#6C6C70"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📞</Text>
                <TextInput
                  style={styles.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor="#6C6C70"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Special Requests */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Requests</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="Any special requests or dietary restrictions?"
                placeholderTextColor="#6C6C70"
                multiline
                numberOfLines={4}
              />
              <View style={styles.characterCounter}>
                <Text style={styles.characterCount}>
                  {specialRequests.length}/200
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReservation}>
          <Text style={styles.submitButtonIcon}>📋</Text>
          <Text style={styles.submitButtonText}>Submit Reservation</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E5E5E7',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  restaurantCard: {
    backgroundColor: '#1E1E20',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  restaurantIconText: {
    fontSize: 24,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mealTypeChip: {
    backgroundColor: '#00D9FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#E5E5E7',
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  sectionIndicator: {
    flex: 1,
    height: 1,
    backgroundColor: '#00D9FF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E20',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  counterDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  counterLabel: {
    fontSize: 12,
    color: '#E5E5E7',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E20',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  characterCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  characterCount: {
    fontSize: 10,
    color: '#98989A',
  },
  contactSection: {
    marginTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#00D9FF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ReservationModal; 