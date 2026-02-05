import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BookingInfo, TicketBooking, RideBooking, GeneratedItinerary, MultiDayItinerary } from '../types';

const { width } = Dimensions.get('window');

// SOTA UX/UI Design System (matching SmartItineraryPage)
const DesignSystem = {
  colors: {
    primary: '#00D9FF',
    primaryDark: '#00B8CC',
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
      accent: '#00D9FF',
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
    hero: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 26 },
    h1: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    h2: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
    body: { fontSize: 13, fontWeight: '500', lineHeight: 16 },
    caption: { fontSize: 11, fontWeight: '500', letterSpacing: 0.05 },
    micro: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  },
  
  spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 },
  radius: { sm: 4, md: 6, lg: 8, xl: 12, xxl: 16, full: 9999 },
  
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    strong: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
    colored: { shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  },
};

interface CheckoutPageProps {
  bookingInfo: BookingInfo;
  itinerary: GeneratedItinerary | MultiDayItinerary;
  startingLocation: { address: string };
  returnLocation?: { address: string };
  onConfirmBooking: () => void;
  onBack: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  bookingInfo,
  itinerary,
  startingLocation,
  returnLocation,
  onConfirmBooking,
  onBack,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmBooking = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to confirmation page instead of showing alert
      onConfirmBooking();
    } catch (error) {
      Alert.alert('Error', 'Failed to process booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTicketBookings = () => {
    if (bookingInfo.ticketBookings.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No tickets selected</Text>
        </View>
      );
    }

    return bookingInfo.ticketBookings.map((ticket, index) => (
      <View key={index} style={styles.bookingItem}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingIcon}>🎫</Text>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>{ticket.placeName}</Text>
            <Text style={styles.bookingSubtitle}>
              {ticket.ticketType} • Qty: {ticket.quantity}
            </Text>
            {ticket.day && (
              <Text style={styles.bookingDay}>Day {ticket.day}</Text>
            )}
          </View>
          <Text style={styles.bookingPrice}>${ticket.totalPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.bookingBadge}>
          <Text style={styles.bookingBadgeText}>
            {ticket.isOfficial ? 'Official' : 'Third Party'}
          </Text>
        </View>
      </View>
    ));
  };

  const renderRideBookings = () => {
    if (bookingInfo.rideBookings.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No rides selected</Text>
        </View>
      );
    }

    return bookingInfo.rideBookings.map((ride, index) => (
      <View key={index} style={styles.bookingItem}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingIcon}>🚗</Text>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>{ride.rideType.toUpperCase()}</Text>
            <Text style={styles.bookingSubtitle}>
              {Math.round(ride.distance / 1000 * 10) / 10} km • {ride.estimatedDuration} min
            </Text>
            {ride.day && (
              <Text style={styles.bookingDay}>Day {ride.day}</Text>
            )}
          </View>
          <Text style={styles.bookingPrice}>${ride.estimatedPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>
            {ride.fromLocation} → {ride.toLocation}
          </Text>
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎫 Ticket Bookings</Text>
          {renderTicketBookings()}
          {bookingInfo.ticketBookings.length > 0 && (
            <View style={styles.sectionTotal}>
              <Text style={styles.sectionTotalText}>
                Tickets Total: ${bookingInfo.totalTicketCost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Ride Bookings</Text>
          {renderRideBookings()}
          {bookingInfo.rideBookings.length > 0 && (
            <View style={styles.sectionTotal}>
              <Text style={styles.sectionTotalText}>
                Rides Total: ${bookingInfo.totalRideCost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tickets ({bookingInfo.ticketBookings.length})</Text>
            <Text style={styles.summaryValue}>${bookingInfo.totalTicketCost.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rides ({bookingInfo.rideBookings.length})</Text>
            <Text style={styles.summaryValue}>${bookingInfo.totalRideCost.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>${bookingInfo.totalCost.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.importantNotice}>
          <Text style={styles.noticeTitle}>📋 Important Information</Text>
          <Text style={styles.noticeText}>
            • Ticket bookings are subject to availability and venue policies
          </Text>
          <Text style={styles.noticeText}>
            • Ride estimates may vary based on demand and time of day
          </Text>
          <Text style={styles.noticeText}>
            • You will receive confirmation emails for all bookings
          </Text>
          <Text style={styles.noticeText}>
            • Cancellation policies apply as per individual service providers
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isProcessing && styles.disabledButton]}
          onPress={handleConfirmBooking}
          disabled={isProcessing || bookingInfo.totalCost === 0}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirm Booking • ${bookingInfo.totalCost.toFixed(2)}
            </Text>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignSystem.spacing.xl,
    paddingVertical: DesignSystem.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: DesignSystem.colors.glass.border,
    backgroundColor: DesignSystem.colors.background.secondary,
  },
  backButton: {
    marginRight: DesignSystem.spacing.lg,
  },
  backButtonText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: DesignSystem.spacing.xl,
  },
  section: {
    marginTop: DesignSystem.spacing.xl,
  },
  sectionTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.lg,
  },
  bookingItem: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    marginBottom: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },
  bookingIcon: {
    fontSize: 24,
    marginRight: DesignSystem.spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
  },
  bookingSubtitle: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.tertiary,
    marginTop: DesignSystem.spacing.xs,
  },
  bookingDay: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.primary,
    marginTop: DesignSystem.spacing.xs,
    fontWeight: '600',
  },
  bookingPrice: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
  },
  bookingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: DesignSystem.colors.primary,
    paddingHorizontal: DesignSystem.spacing.sm,
    paddingVertical: DesignSystem.spacing.xs,
    borderRadius: DesignSystem.radius.sm,
  },
  bookingBadgeText: {
    color: DesignSystem.colors.background.primary,
    ...DesignSystem.typography.caption,
    fontWeight: '600',
  },
  routeInfo: {
    marginTop: DesignSystem.spacing.sm,
  },
  routeText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: '500',
  },
  emptySection: {
    padding: DesignSystem.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.tertiary,
    fontStyle: 'italic',
  },
  sectionTotal: {
    marginTop: DesignSystem.spacing.sm,
    paddingTop: DesignSystem.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignSystem.colors.glass.border,
    alignItems: 'flex-end',
  },
  sectionTotalText: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
  },
  summarySection: {
    marginTop: DesignSystem.spacing.xxl,
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.xl,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
  },
  summaryTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },
  summaryLabel: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.tertiary,
  },
  summaryValue: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: DesignSystem.colors.glass.border,
    marginVertical: DesignSystem.spacing.md,
  },
  summaryTotalLabel: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
  },
  summaryTotalValue: {
    ...DesignSystem.typography.hero,
    color: DesignSystem.colors.primary,
  },
  importantNotice: {
    marginTop: DesignSystem.spacing.xl,
    marginBottom: DesignSystem.spacing.xl,
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
  },
  noticeTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.sm,
  },
  noticeText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.tertiary,
    lineHeight: 20,
    marginBottom: DesignSystem.spacing.xs,
  },
  footer: {
    paddingHorizontal: DesignSystem.spacing.xl,
    paddingVertical: DesignSystem.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: DesignSystem.colors.glass.border,
    backgroundColor: DesignSystem.colors.background.secondary,
  },
  confirmButton: {
    backgroundColor: DesignSystem.colors.primary,
    paddingVertical: DesignSystem.spacing.lg,
    borderRadius: DesignSystem.radius.lg,
    alignItems: 'center',
    ...DesignSystem.shadows.colored,
  },
  disabledButton: {
    backgroundColor: DesignSystem.colors.text.tertiary,
  },
  confirmButtonText: {
    color: DesignSystem.colors.background.primary,
    ...DesignSystem.typography.h1,
    fontWeight: '700',
  },
});

export default CheckoutPage;