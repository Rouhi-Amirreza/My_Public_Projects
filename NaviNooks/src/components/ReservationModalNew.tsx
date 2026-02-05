import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DiningStop } from '../types';

interface ReservationModalNewProps {
  diningStop: DiningStop | null;
  onClose: () => void;
  onReservationConfirmed?: (diningStopId: string) => void;
}

const ReservationModalNew: React.FC<ReservationModalNewProps> = ({ diningStop, onClose, onReservationConfirmed }) => {
  const [numberOfPeople, setNumberOfPeople] = useState('2');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill date and time with dining stop arrival information
  useEffect(() => {
    if (diningStop?.arrival_time) {
      const today = new Date();
      const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
      setReservationDate(formattedDate);
      setReservationTime(diningStop.arrival_time);
    }
  }, [diningStop]);

  const handleSubmitReservation = async () => {
    if (!diningStop) return;

    // Validate required fields
    if (!numberOfPeople || !reservationDate || !reservationTime || !contactName || !contactPhone) {
      Alert.alert('Missing Information', 'Please fill in all required fields to make your reservation.');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Generate dining stop ID and mark as reserved
      const diningStopId = diningStop.place_id || 
                          `${diningStop.name}-${diningStop.coordinates?.latitude}-${diningStop.coordinates?.longitude}`;
      
      // Call the reservation confirmed callback
      if (onReservationConfirmed) {
        onReservationConfirmed(diningStopId);
      }
      
      Alert.alert(
        '🎉 Reservation Confirmed!',
        `Your table has been reserved at ${diningStop.name}!\n\n📅 Date: ${reservationDate}\n🕐 Time: ${reservationTime}\n👥 Party Size: ${numberOfPeople} people\n👤 Name: ${contactName}\n📞 Phone: ${contactPhone}\n\nA confirmation will be sent to you shortly. See you there!`,
        [
          {
            text: 'Perfect!',
            onPress: onClose,
            style: 'default',
          },
        ]
      );
    }, 1500);
  };

  console.log('🔔 ReservationModalNew render - diningStop:', diningStop?.name);

  if (!diningStop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>No restaurant selected for reservation.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onClose}>
            <Text style={styles.errorButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIcon}>🍽️</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Make Reservation</Text>
              <Text style={styles.headerSubtitle}>Reserve your table</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Restaurant Info */}
          <View style={styles.restaurantCard}>
            <View style={styles.restaurantHeader}>
              <Text style={styles.restaurantIcon}>
                {diningStop.meal_type === 'breakfast' && '🥐'}
                {diningStop.meal_type === 'brunch' && '🥞'}
                {diningStop.meal_type === 'coffee' && '☕'}
                {diningStop.meal_type === 'lunch' && '🍽️'}
                {diningStop.meal_type === 'dinner' && '🍷'}
                {diningStop.meal_type === 'drinks' && '🍸'}
                {!['breakfast', 'brunch', 'coffee', 'lunch', 'dinner', 'drinks'].includes(diningStop.meal_type || '') && '🍴'}
              </Text>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{diningStop.name}</Text>
                <Text style={styles.restaurantAddress}>{diningStop.address}</Text>
                <View style={styles.mealTypeChip}>
                  <Text style={styles.mealTypeText}>
                    {(diningStop.meal_type || '').charAt(0).toUpperCase() + (diningStop.meal_type || '').slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Party Size */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Party Size</Text>
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
                <Text style={styles.counterNumber}>{numberOfPeople}</Text>
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

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Date</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📅</Text>
                  <TextInput
                    style={styles.input}
                    value={reservationDate}
                    onChangeText={setReservationDate}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Time</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🕐</Text>
                  <TextInput
                    style={styles.input}
                    value={reservationTime}
                    onChangeText={setReservationTime}
                    placeholder="7:00 PM"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#888"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📞</Text>
                <TextInput
                  style={styles.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor="#888"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Special Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="Any special requests, dietary restrictions, or occasions to celebrate?"
                placeholderTextColor="#888"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.characterCount}>{specialRequests.length}/200</Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmitReservation}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Reserving...</Text>
            ) : (
              <>
                <Text style={styles.submitButtonIcon}>🎉</Text>
                <Text style={styles.submitButtonText}>Reserve Table</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  restaurantCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  mealTypeChip: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  mealTypeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  counterButton: {
    width: 36,
    height: 36,
    backgroundColor: '#007AFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  counterLabel: {
    fontSize: 12,
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
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
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  textAreaContainer: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  textArea: {
    fontSize: 16,
    color: '#FFFFFF',
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
  },
  submitButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReservationModalNew;