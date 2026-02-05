import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { GeneratedItinerary, MultiDayItinerary, BookingInfo } from '../types';

const { width, height } = Dimensions.get('window');

// Professional Design System
const DesignSystem = {
  colors: {
    primary: '#4ECDC4',
    primaryDark: '#45B7AF',
    secondary: '#7C4DFF',
    accent: '#FF6B6B',
    
    background: {
      primary: '#0A0A0B',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1E1E20',
      modal: 'rgba(28, 28, 30, 0.95)',
    },
    
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E7',
      tertiary: '#98989A',
      accent: '#4ECDC4',
      placeholder: '#6C6C70',
    },
    
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
    },
    
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
  },
  
  typography: {
    hero: { fontSize: 24, fontWeight: '700', letterSpacing: -0.2, lineHeight: 28 },
    h1: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
    h2: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
    body: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.05 },
    micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  },
  
  spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 },
  radius: { sm: 4, md: 6, lg: 8, xl: 12, xxl: 16, full: 9999 },
  
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    strong: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
    colored: { shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  },
};

interface BookingConfirmationPageProps {
  itinerary: GeneratedItinerary | MultiDayItinerary;
  bookingInfo: BookingInfo;
  startingLocation: { address: string };
  returnLocation?: { address: string };
  onBackToHome: () => void;
  onViewItinerary: () => void;
}

const BookingConfirmationPage: React.FC<BookingConfirmationPageProps> = ({
  itinerary,
  bookingInfo,
  startingLocation,
  returnLocation,
  onBackToHome,
  onViewItinerary,
}) => {
  const isMultiDay = 'dailyItineraries' in itinerary;

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getFirstDaySchedule = () => {
    if (isMultiDay) {
      const multiDayItinerary = itinerary as MultiDayItinerary;
      return multiDayItinerary.dailyItineraries[0]?.schedule || [];
    } else {
      const singleDayItinerary = itinerary as GeneratedItinerary;
      return singleDayItinerary.schedule || [];
    }
  };

  const getTotalPlaces = () => {
    if (isMultiDay) {
      const multiDayItinerary = itinerary as MultiDayItinerary;
      return multiDayItinerary.totalPlaces || 0;
    } else {
      const singleDayItinerary = itinerary as GeneratedItinerary;
      return singleDayItinerary.places?.length || 0;
    }
  };

  const getStartTime = () => {
    if (isMultiDay) {
      const multiDayItinerary = itinerary as MultiDayItinerary;
      return multiDayItinerary.dailyItineraries[0]?.startTime || '09:00';
    } else {
      const singleDayItinerary = itinerary as GeneratedItinerary;
      return singleDayItinerary.schedule?.[0]?.arrivalTime || '09:00';
    }
  };

  const renderNextSteps = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🎯 What's Next?</Text>
      <View style={styles.stepsContainer}>
        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Text style={styles.stepIconText}>📧</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Check Your Email</Text>
            <Text style={styles.stepDescription}>
              Confirmation emails for tickets and rides have been sent to your email address
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Text style={styles.stepIconText}>📱</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Save to Calendar</Text>
            <Text style={styles.stepDescription}>
              Add your trip to your calendar to get timely reminders
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Text style={styles.stepIconText}>🧭</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Download Itinerary</Text>
            <Text style={styles.stepDescription}>
              Save your detailed itinerary for offline access during your trip
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepIcon}>
            <Text style={styles.stepIconText}>🚗</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Arrive Early</Text>
            <Text style={styles.stepDescription}>
              Plan to arrive 15 minutes before your first activity for a smooth start
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTripSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📋 Trip Summary</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Starting Point:</Text>
          <Text style={styles.summaryValue}>{startingLocation?.address || 'Not specified'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Return Point:</Text>
          <Text style={styles.summaryValue}>{returnLocation?.address || startingLocation?.address || 'Not specified'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Places:</Text>
          <Text style={styles.summaryValue}>{getTotalPlaces()} destinations</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Start Time:</Text>
          <Text style={styles.summaryValue}>{formatTime(getStartTime())}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Cost:</Text>
          <Text style={styles.summaryValue}>${bookingInfo?.totalCost?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
    </View>
  );

  const renderFirstDayPreview = () => {
    const firstDaySchedule = getFirstDaySchedule();
    if (!firstDaySchedule.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗓️ Day 1 Preview</Text>
        <View style={styles.scheduleContainer}>
          {firstDaySchedule.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.scheduleItem}>
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>{formatTime(item.arrivalTime || '00:00')}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.schedulePlaceName}>{item.place?.name || 'Unknown Place'}</Text>
                <Text style={styles.scheduleAddress}>{item.place?.address || 'No address'}</Text>
              </View>
            </View>
          ))}
          {firstDaySchedule.length > 3 && (
            <View style={styles.moreItems}>
              <Text style={styles.moreItemsText}>+{firstDaySchedule.length - 3} more places</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBookingDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>💳 Booking Details</Text>
      
      {bookingInfo?.ticketBookings?.length > 0 && (
        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>🎫 Tickets Booked</Text>
          {bookingInfo.ticketBookings.map((ticket, index) => (
            <View key={index} style={styles.bookingItem}>
              <Text style={styles.bookingItemTitle}>{ticket?.placeName || 'Unknown Place'}</Text>
              <Text style={styles.bookingItemDetails}>
                {ticket?.ticketType || 'Standard'} • Qty: {ticket?.quantity || 0} • ${(ticket?.totalPrice || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {bookingInfo?.rideBookings?.length > 0 && (
        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>🚗 Rides Booked</Text>
          {bookingInfo.rideBookings.map((ride, index) => (
            <View key={index} style={styles.bookingItem}>
              <Text style={styles.bookingItemTitle}>{ride?.rideType?.toUpperCase() || 'UNKNOWN'}</Text>
              <Text style={styles.bookingItemDetails}>
                {ride?.fromLocation || 'Unknown'} → {ride?.toLocation || 'Unknown'}
              </Text>
              <Text style={styles.bookingItemDetails}>
                {Math.round((ride?.distance || 0) / 1000 * 10) / 10} km • {ride?.estimatedDuration || 0} min • ${(ride?.estimatedPrice || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✅</Text>
        </View>
        <Text style={styles.headerTitle}>Booking Confirmed!</Text>
        <Text style={styles.headerSubtitle}>
          Your trip has been successfully booked. Here's what you need to know.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTripSummary()}
        {renderFirstDayPreview()}
        {renderBookingDetails()}
        {renderNextSteps()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBackToHome}>
          <Text style={styles.secondaryButtonText}>🏠 Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onViewItinerary}>
          <Text style={styles.primaryButtonText}>📄 View Full Itinerary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.primary,
  },

  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: DesignSystem.spacing.xxl,
    paddingHorizontal: DesignSystem.spacing.xl,
    backgroundColor: DesignSystem.colors.background.secondary,
  },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DesignSystem.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DesignSystem.spacing.lg,
    ...DesignSystem.shadows.strong,
  },

  successIconText: {
    fontSize: 40,
  },

  headerTitle: {
    ...DesignSystem.typography.hero,
    color: DesignSystem.colors.text.primary,
    textAlign: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },

  headerSubtitle: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  content: {
    flex: 1,
    paddingHorizontal: DesignSystem.spacing.xl,
  },

  section: {
    marginBottom: DesignSystem.spacing.xxl,
  },

  sectionTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.lg,
  },

  summaryCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    ...DesignSystem.shadows.soft,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DesignSystem.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: DesignSystem.colors.glass.border,
  },

  summaryLabel: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
  },

  summaryValue: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },

  scheduleContainer: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    ...DesignSystem.shadows.soft,
  },

  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.md,
  },

  scheduleTime: {
    width: 60,
    alignItems: 'center',
  },

  scheduleTimeText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.accent,
    fontWeight: '700',
  },

  scheduleContent: {
    flex: 1,
    marginLeft: DesignSystem.spacing.md,
  },

  schedulePlaceName: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },

  scheduleAddress: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    marginTop: 2,
  },

  moreItems: {
    alignItems: 'center',
    paddingTop: DesignSystem.spacing.sm,
  },

  moreItemsText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.accent,
    fontWeight: '600',
  },

  bookingSection: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    marginBottom: DesignSystem.spacing.lg,
    ...DesignSystem.shadows.soft,
  },

  bookingSectionTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.md,
  },

  bookingItem: {
    paddingVertical: DesignSystem.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: DesignSystem.colors.glass.border,
  },

  bookingItemTitle: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },

  bookingItemDetails: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    marginTop: 2,
  },

  stepsContainer: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    ...DesignSystem.shadows.soft,
  },

  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: DesignSystem.spacing.lg,
  },

  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignSystem.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DesignSystem.spacing.md,
  },

  stepIconText: {
    fontSize: 18,
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.xs,
  },

  stepDescription: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    lineHeight: 18,
  },

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: DesignSystem.spacing.xl,
    paddingVertical: DesignSystem.spacing.lg,
    gap: DesignSystem.spacing.md,
    backgroundColor: DesignSystem.colors.background.secondary,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: DesignSystem.colors.primary,
    borderRadius: DesignSystem.radius.xl,
    paddingVertical: DesignSystem.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...DesignSystem.shadows.colored,
  },

  primaryButtonText: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    fontWeight: '700',
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.xl,
    paddingVertical: DesignSystem.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
  },

  secondaryButtonText: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },
});

export default BookingConfirmationPage; 