import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { DiningStop } from '../types';

interface ReservationManagementModalProps {
  diningStop: DiningStop | null;
  onClose: () => void;
  onModifyReservation?: (diningStop: DiningStop) => void;
  onCancelReservation?: (diningStopId: string) => void;
  getDiningStopId?: (diningStop: DiningStop) => string;
}

const ReservationManagementModal: React.FC<ReservationManagementModalProps> = ({
  diningStop,
  onClose,
  onModifyReservation,
  onCancelReservation,
  getDiningStopId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleModifyReservation = () => {
    if (!diningStop) return;
    
    console.log('🔄 Modifying reservation for:', diningStop.name);
    onClose();
    
    // Small delay to allow modal to close before opening modification modal
    setTimeout(() => {
      onModifyReservation?.(diningStop);
    }, 300);
  };

  const handleCancelReservation = () => {
    if (!diningStop || !getDiningStopId) return;

    Alert.alert(
      '❌ Cancel Reservation',
      `Are you sure you want to cancel your reservation at ${diningStop.name}?\n\nThis action cannot be undone.`,
      [
        {
          text: 'Keep Reservation',
          style: 'cancel',
        },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true);
            
            // Simulate API call for cancellation
            setTimeout(() => {
              const diningStopId = getDiningStopId(diningStop);
              onCancelReservation?.(diningStopId);
              setIsProcessing(false);
              
              Alert.alert(
                '✅ Reservation Cancelled',
                `Your reservation at ${diningStop.name} has been successfully cancelled.`,
                [
                  {
                    text: 'OK',
                    onPress: onClose,
                  },
                ]
              );
            }, 1000);
          },
        },
      ]
    );
  };

  if (!diningStop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>No reservation found.</Text>
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
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>✓</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Manage Reservation</Text>
            <Text style={styles.headerSubtitle}>Modify or cancel your booking</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <View style={styles.reservedBadge}>
            <Text style={styles.reservedBadgeIcon}>✓</Text>
            <Text style={styles.reservedBadgeText}>RESERVED</Text>
          </View>
          
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

        {/* Reservation Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Current Reservation</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailLabel}>Date & Time:</Text>
            <Text style={styles.detailValue}>
              {diningStop.arrival_time ? `Today at ${diningStop.arrival_time}` : 'TBD'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👥</Text>
            <Text style={styles.detailLabel}>Party Size:</Text>
            <Text style={styles.detailValue}>2 people</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {diningStop.dining_duration ? `${Math.round(diningStop.dining_duration / 60)}h ${diningStop.dining_duration % 60}m` : '1h 30m'}
            </Text>
          </View>
          
          {diningStop.rating && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>⭐</Text>
              <Text style={styles.detailLabel}>Rating:</Text>
              <Text style={styles.detailValue}>{diningStop.rating.toFixed(1)}/5.0</Text>
            </View>
          )}
        </View>

        {/* What You Can Do */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>What would you like to do?</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleModifyReservation}
            disabled={isProcessing}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonIcon}>✏️</Text>
              <View style={styles.actionButtonText}>
                <Text style={styles.actionButtonTitle}>Modify Reservation</Text>
                <Text style={styles.actionButtonSubtitle}>Change date, time, or party size</Text>
              </View>
              <Text style={styles.actionButtonArrow}>›</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelActionButton]}
            onPress={handleCancelReservation}
            disabled={isProcessing}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.cancelActionButtonIcon}>❌</Text>
              <View style={styles.actionButtonText}>
                <Text style={[styles.actionButtonTitle, styles.cancelActionButtonTitle]}>Cancel Reservation</Text>
                <Text style={styles.actionButtonSubtitle}>Remove this booking completely</Text>
              </View>
              <Text style={styles.actionButtonArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>Back to Itinerary</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#28a745',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
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
  },
  contentContainer: {
    padding: 20,
  },
  restaurantCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  reservedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reservedBadgeIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    marginRight: 4,
  },
  reservedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  detailsCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  actionsCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelActionButton: {
    backgroundColor: '#2a1a1a',
    borderColor: '#FF3B30',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  cancelActionButtonIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cancelActionButtonTitle: {
    color: '#FF6B6B',
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  actionButtonArrow: {
    fontSize: 20,
    color: '#666',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  backButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

export default ReservationManagementModal;