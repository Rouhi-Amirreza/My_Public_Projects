import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookingInfo } from '../types';
import TicketBookingCard from './TicketBookingCard';
import RideBookingCard from './RideBookingCard';

interface BookingSectionProps {
  bookingInfo: BookingInfo;
  allTicketsSelected: boolean;
  allRidesSelected: boolean;
  onToggleAllTickets: () => void;
  onToggleAllRides: () => void;
  onShowCheckout: () => void;
  onShowPrintItinerary: () => void;
}

const BookingSection: React.FC<BookingSectionProps> = ({
  bookingInfo,
  allTicketsSelected,
  allRidesSelected,
  onToggleAllTickets,
  onToggleAllRides,
  onShowCheckout,
  onShowPrintItinerary,
}) => {
  const { ticketBookings, rideBookings, totalCost } = bookingInfo;

  return (
    <View style={styles.bookingSection}>
      <Text style={styles.bookingTitle}>🎫 Booking Options</Text>
      
      {/* Ticket Booking Section */}
      <View style={styles.ticketSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tickets</Text>
          <TouchableOpacity
            style={[styles.toggleButton, allTicketsSelected && styles.toggleButtonSelected]}
            onPress={onToggleAllTickets}
          >
            <Text style={[styles.toggleButtonText, allTicketsSelected && styles.toggleButtonTextSelected]}>
              {allTicketsSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {ticketBookings.length > 0 ? (
          ticketBookings.map((booking, index) => (
            <TicketBookingCard key={index} booking={booking} />
          ))
        ) : (
          <Text style={styles.noBookingsText}>No tickets selected</Text>
        )}
      </View>
      
      {/* Ride Booking Section */}
      <View style={styles.rideSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rides</Text>
          <TouchableOpacity
            style={[styles.toggleButton, allRidesSelected && styles.toggleButtonSelected]}
            onPress={onToggleAllRides}
          >
            <Text style={[styles.toggleButtonText, allRidesSelected && styles.toggleButtonTextSelected]}>
              {allRidesSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {rideBookings.length > 0 ? (
          rideBookings.map((booking, index) => (
            <RideBookingCard key={index} booking={booking} />
          ))
        ) : (
          <Text style={styles.noBookingsText}>No rides selected</Text>
        )}
      </View>
      
      {/* Total and Actions */}
      <View style={styles.totalSection}>
        <Text style={styles.totalText}>Total: ${totalCost.toFixed(2)}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.printButton} onPress={onShowPrintItinerary}>
            <Text style={styles.printButtonText}>🖨️ Print Itinerary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkoutButton} onPress={onShowCheckout}>
            <Text style={styles.checkoutButtonText}>💳 Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bookingSection: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  ticketSection: {
    marginBottom: 20,
  },
  rideSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonSelected: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 12,
  },
  toggleButtonTextSelected: {
    color: '#fff',
  },
  noBookingsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 10,
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  printButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingSection;
