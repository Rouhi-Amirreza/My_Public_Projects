import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { PlaceRecommendation } from '../types';
import PlaceImage from './PlaceImage';
import TicketBookingCard from './TicketBookingCard';

interface PlaceCardProps {
  place: PlaceRecommendation;
  index: number;
  scheduleItem: any;
  onToggleHours: (placeId: string) => void;
  onEditVisitDuration: (scheduleIndex: number, currentDuration: number, placeName: string) => void;
  onPlaceChange: (index: number) => void;
  onTicketBooking: (place: PlaceRecommendation, scheduleIndex: number) => void;
  onViewDetails?: (place: PlaceRecommendation) => void;
  expandedHours: Set<string>;
  selectedTickets?: any[];
  onTicketSelect?: (booking: any) => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  scheduleItem,
  onToggleHours,
  onEditVisitDuration,
  onPlaceChange,
  onTicketBooking,
  onViewDetails,
  expandedHours,
  selectedTickets = [],
  onTicketSelect,
}) => {
  const formatRating = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  const getPriceLevel = (level: number) => {
    return '$'.repeat(level || 1);
  };

  const getTicketInfo = () => {
    if (!place.ticket_info || place.ticket_info.length === 0) {
      return { isFree: true, lowestPrice: 0, hasTickets: false };
    }

    const paidTickets = place.ticket_info.filter(ticket => {
      const price = parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0;
      return price > 0;
    });

    if (paidTickets.length === 0) {
      return { isFree: true, lowestPrice: 0, hasTickets: true };
    }

    const lowestPrice = Math.min(...paidTickets.map(ticket => 
      parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0
    ));

    return { isFree: false, lowestPrice, hasTickets: true, ticketCount: paidTickets.length };
  };

  const isTicketSelected = selectedTickets.some(ticket => ticket.placeId === place.place_id);
  const ticketInfo = getTicketInfo();

  const getCrowdLevelInfo = () => {
    const level = (place as any).busynessLevel || 0;
    if (level > 70) return { text: 'Very Busy', color: '#e74c3c', emoji: '🔴' };
    if (level > 40) return { text: 'Moderate', color: '#f39c12', emoji: '🟡' };
    return { text: 'Not Busy', color: '#27ae60', emoji: '🟢' };
  };

  const crowdInfo = getCrowdLevelInfo();

  return (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeAddress}>{place.vicinity}</Text>
          
          <View style={styles.placeDetails}>
            {place.rating && (
              <Text style={styles.rating}>
                {formatRating(place.rating)} ({place.user_ratings_total})
              </Text>
            )}
            {place.price_level && (
              <Text style={styles.priceLevel}>
                {getPriceLevel(place.price_level)}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.placeActions}>
          {onViewDetails && (
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => onViewDetails(place)}
            >
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => onPlaceChange(index)}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <PlaceImage place={place} style={styles.placeImage} />
      
      <View style={styles.scheduleInfo}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Arrival:</Text>
          <Text style={styles.timeValue}>{scheduleItem.arrivalTime}</Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Departure:</Text>
          <Text style={styles.timeValue}>{scheduleItem.departureTime}</Text>
        </View>
        <TouchableOpacity
          style={styles.durationButton}
          onPress={() => onEditVisitDuration(index, scheduleItem.visitDuration, place.name)}
        >
          <Text style={styles.durationText}>
            Visit: {Math.round(scheduleItem.visitDuration / 60)}h {scheduleItem.visitDuration % 60}m
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Enhanced Ticket/Booking Section - Positioned between time and crowd level */}
      <View style={styles.ticketCrowdContainer}>
        <TouchableOpacity
          style={[
            styles.modernTicketBox,
            ticketInfo.isFree ? styles.freeTicketBox : styles.paidTicketBox,
            isTicketSelected && styles.selectedTicketBox
          ]}
          onPress={() => {
            if (!ticketInfo.isFree && ticketInfo.hasTickets) {
              onTicketBooking(place, index);
            }
          }}
          activeOpacity={ticketInfo.isFree ? 1 : 0.7}
          disabled={ticketInfo.isFree}
        >
          <View style={styles.ticketBoxContent}>
            <View style={styles.ticketIconContainer}>
              <Text style={styles.ticketEmoji}>
                {ticketInfo.isFree ? '🎁' : isTicketSelected ? '✅' : '🎫'}
              </Text>
            </View>
            <View style={styles.ticketDetails}>
              {ticketInfo.isFree ? (
                <>
                  <Text style={styles.ticketMainText}>Free Entry</Text>
                  <Text style={styles.ticketSubText}>No booking required</Text>
                </>
              ) : (
                <>
                  <Text style={styles.ticketMainText}>
                    {isTicketSelected ? 'Ticket Selected' : 'Book Tickets'}
                  </Text>
                  <Text style={styles.ticketSubText}>
                    From ${ticketInfo.lowestPrice.toFixed(0)} • {ticketInfo.ticketCount} option{ticketInfo.ticketCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </View>
            {!ticketInfo.isFree && (
              <View style={styles.ticketAction}>
                <Text style={[
                  styles.actionText,
                  isTicketSelected && styles.selectedActionText
                ]}>
                  {isTicketSelected ? '✓' : 'Book'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Crowd Level Indicator */}
        {(place as any).busynessLevel !== undefined && (
          <View style={styles.crowdLevelBox}>
            <View style={styles.crowdIconContainer}>
              <Text style={styles.crowdEmoji}>{crowdInfo.emoji}</Text>
            </View>
            <View style={styles.crowdDetails}>
              <Text style={styles.crowdMainText}>Crowd Level</Text>
              <Text style={[styles.crowdSubText, { color: crowdInfo.color }]}>
                {crowdInfo.text} ({(place as any).busynessLevel}%)
              </Text>
            </View>
            <View style={styles.crowdBar}>
              <View 
                style={[
                  styles.crowdFill, 
                  { 
                    width: `${(place as any).busynessLevel}%`,
                    backgroundColor: crowdInfo.color
                  }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
      
      {place.opening_hours && (
        <View style={styles.hoursSection}>
          <TouchableOpacity
            style={styles.hoursButton}
            onPress={() => onToggleHours(place.place_id)}
          >
            <Text style={styles.hoursButtonText}>
              {place.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
            </Text>
          </TouchableOpacity>
          
          {expandedHours.has(place.place_id) && place.opening_hours.weekday_text && (
            <View style={styles.hoursExpanded}>
              {place.opening_hours.weekday_text.map((day, idx) => (
                <Text key={idx} style={styles.hoursText}>{day}</Text>
              ))}
            </View>
          )}
        </View>
      )}
      
    </View>
  );
};

const styles = StyleSheet.create({
  placeCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    fontSize: 12,
    color: '#666',
  },
  priceLevel: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  placeActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  changeButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#00D9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  placeImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  timeInfo: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  durationButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  hoursSection: {
    marginBottom: 12,
  },
  hoursButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  hoursButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hoursExpanded: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  hoursText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  ticketCrowdContainer: {
    marginTop: 12,
    gap: 8,
  },
  modernTicketBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  freeTicketBox: {
    backgroundColor: '#f0f9f0',
    borderColor: '#4CAF50',
  },
  paidTicketBox: {
    backgroundColor: '#fff8e7',
    borderColor: '#FF9800',
  },
  selectedTicketBox: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
  },
  ticketBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  ticketEmoji: {
    fontSize: 20,
  },
  ticketDetails: {
    flex: 1,
  },
  ticketMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  ticketSubText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  ticketAction: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedActionText: {
    color: '#4CAF50',
  },
  crowdLevelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 12,
  },
  crowdIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  crowdEmoji: {
    fontSize: 16,
  },
  crowdDetails: {
    flex: 1,
  },
  crowdMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  crowdSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  crowdBar: {
    width: 40,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  crowdFill: {
    height: 6,
    borderRadius: 3,
  },
});

export default PlaceCard;
