import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GeneratedItinerary, ItineraryFormData, DiningStop } from '../../types';
import ItineraryMap from '../ItineraryMap';
import DayTabs from '../DayTabs';
import PlaceCard from '../PlaceCard';
import DiningStopSelector from '../DiningStopSelector';
import DiningStopEditor from '../DiningStopEditor';
import TicketBookingCard from '../TicketBookingCard';
import RideBookingCard from '../RideBookingCard';
import RideSelectionModal from '../RideSelectionModal';
import ReservationModal from '../ReservationModal';
import OptimizationNotesPanel from '../OptimizationNotesPanel';
import BookingSection from '../BookingSection';
import DebugPanel from '../DebugPanel';
import PlaceImage from '../PlaceImage';
import { Colors } from '../../utils/constants';

interface ItineraryContentProps {
  currentItinerary: GeneratedItinerary;
  activeDay: number;
  totalDays: number;
  isMultiDay: boolean;
  formData: ItineraryFormData;
  startingLocation: any;
  returnLocation?: any;
  mapRef: any;
  mapRegion: any;
  showDebugPanel: boolean;
  onDayChange: (day: number) => void;
  onPlacePress: (place: any, index: number) => void;
  onDiningStopPress: (fromIndex: number, toIndex: number) => void;
  onBackToForm: () => void;
  onRegenerateItinerary: () => void;
  onDiningReservation?: (diningStop: DiningStop) => void;
  onReservationManagement?: (diningStop: DiningStop) => void;
  onDiningStopEdit?: (diningStop: DiningStop, itemIndex: number, stopIndex: number) => void;
  onRemoveDiningStop?: (diningStop: DiningStop, itemIndex: number, stopIndex: number) => void;
  isDiningStopReserved?: (diningStopId: string) => boolean;
  getDiningStopId?: (diningStop: DiningStop, itemIndex?: number, stopIndex?: number) => string;
}

const ItineraryContent: React.FC<ItineraryContentProps> = ({
  currentItinerary,
  activeDay,
  totalDays,
  isMultiDay,
  formData,
  startingLocation,
  returnLocation,
  mapRef,
  mapRegion,
  showDebugPanel,
  onDayChange,
  onPlacePress,
  onDiningStopPress,
  onBackToForm,
  onRegenerateItinerary,
  onDiningReservation,
  onReservationManagement,
  onDiningStopEdit,
  onRemoveDiningStop,
  isDiningStopReserved,
  getDiningStopId,
}) => {
  const renderDiningStopCard = (diningStop: DiningStop, itemIndex: number, diningIndex: number) => {
    // Check if this dining stop is reserved
    const diningStopId = getDiningStopId ? getDiningStopId(diningStop, itemIndex, diningIndex) : '';
    const isReserved = isDiningStopReserved ? isDiningStopReserved(diningStopId) : false;
    
    return (
      <View key={`dining-${itemIndex}-${diningIndex}`} style={styles.diningStopContainer}>
        <TouchableOpacity
          style={styles.diningStopCard}
          onPress={() => onDiningStopEdit?.(diningStop, itemIndex, diningIndex)}
          activeOpacity={0.8}
        >
          {/* Remove Button - Top Right */}
          <TouchableOpacity 
            style={styles.removeDiningButton}
            onPress={() => onRemoveDiningStop?.(diningStop, itemIndex, diningIndex)}
            activeOpacity={0.7}
          >
            <Text style={styles.removeDiningIcon}>×</Text>
          </TouchableOpacity>

          {/* Horizontal Layout - Text Left, Image Right */}
          <View style={styles.diningContentRow}>
            {/* Left Content Section */}
            <View style={styles.diningMainContent}>
              <View style={styles.diningTopRow}>
                <View style={styles.diningMealTypeChip}>
                  <Text style={styles.diningMealTypeIcon}>
                    {diningStop?.meal_type === 'breakfast' && '🥐'}
                    {diningStop?.meal_type === 'brunch' && '🥞'}
                    {diningStop?.meal_type === 'coffee' && '☕'}
                    {diningStop?.meal_type === 'lunch' && '🍽️'}
                    {diningStop?.meal_type === 'dinner' && '🍷'}
                    {diningStop?.meal_type === 'drinks' && '🍸'}
                  </Text>
                  <Text style={styles.diningMealTypeText}>
                    {diningStop?.meal_type?.charAt(0)?.toUpperCase()}{diningStop?.meal_type?.slice(1)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.diningStopName} numberOfLines={2}>{diningStop?.name}</Text>
              <Text style={styles.diningStopAddress} numberOfLines={1}>{diningStop?.address}</Text>
              
              <View style={styles.diningRatingRow}>
                <Text style={styles.diningRatingValue}>⭐ {diningStop?.rating?.toFixed(1)}</Text>
                {diningStop?.price_level && (
                  <Text style={styles.diningPriceValue}>
                    {'$'.repeat(diningStop?.price_level)}
                  </Text>
                )}
              </View>
              
              <View style={styles.diningMetricsRowFixed}>
                <View style={styles.diningTimeChip}>
                  <Text style={styles.diningTimeIcon}>🕐</Text>
                  <Text style={styles.diningTimeText}>
                    {diningStop?.arrival_time || 'TBD'} - {diningStop?.departure_time || 'TBD'}
                  </Text>
                </View>
                <View style={styles.diningDurationChip}>
                  <Text style={styles.diningDurationIcon}>🍽️</Text>
                  <Text style={styles.diningDurationText}>
                    {Math.round((diningStop?.dining_duration || 0) / 60)}h {(diningStop?.dining_duration || 0) % 60}m
                  </Text>
                </View>
              </View>
              
              {/* Reserve Button - Inside the card */}
              <TouchableOpacity
                style={[
                  styles.reserveButtonInside,
                  isReserved && styles.reserveButtonReserved
                ]}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent parent TouchableOpacity from handling the press
                  if (isReserved) {
                    onReservationManagement?.(diningStop);
                  } else {
                    onDiningReservation?.(diningStop);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.reserveButtonIcon, isReserved && styles.reserveButtonIconReserved]}>
                  {isReserved ? '✓' : '📞'}
                </Text>
                <Text style={[styles.reserveButtonText, isReserved && styles.reserveButtonTextReserved]}>
                  {isReserved ? 'RESERVED' : 'RESERVE'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Right Image Section - Small */}
            <View style={styles.diningImageContainer}>
              <PlaceImage 
                place={diningStop} 
                width={80} 
                height={80} 
                borderRadius={12}
                resizeMode="cover"
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <ItineraryMap
          ref={mapRef}
          region={mapRegion}
          currentItinerary={currentItinerary}
          startingLocation={startingLocation}
          returnLocation={returnLocation}
        />
      </View>

      {/* Day Tabs for Multi-day */}
      {isMultiDay && (
        <DayTabs
          activeDay={activeDay}
          totalDays={totalDays}
          onDayChange={onDayChange}
        />
      )}

      {/* Places Section */}
      <View style={styles.placesContainer}>
        {currentItinerary.places?.map((place, index) => (
          <React.Fragment key={`${place.place_id}-${index}`}>
            <PlaceCard
              place={place}
              index={index}
              onPress={() => onPlacePress(place, index)}
              scheduleItem={currentItinerary.schedule?.[index]}
            />
            
            {/* Render dining stops after each place */}
            {currentItinerary.schedule?.[index + 1]?.diningStops?.map((diningStop: DiningStop, diningIndex: number) => 
              renderDiningStopCard(diningStop, index, diningIndex)
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Booking Section */}
      <BookingSection />

      {/* Optimization Notes */}
      {currentItinerary.optimization_notes && (
        <OptimizationNotesPanel notes={currentItinerary.optimization_notes} />
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <DebugPanel />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    height: 300,
    marginBottom: 16,
  },
  placesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  diningStopContainer: {
    marginBottom: 12,
  },
  diningStopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  removeDiningButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeDiningIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diningContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  diningMainContent: {
    flex: 1,
    marginRight: 12,
  },
  diningTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diningMealTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diningMealTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  diningMealTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  diningStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  diningStopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  diningRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diningRatingValue: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  diningPriceValue: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  diningMetricsRowFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  diningTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  diningTimeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  diningTimeText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '600',
  },
  diningDurationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diningDurationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  diningDurationText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '600',
  },
  reserveButtonInside: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    marginRight: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  reserveButtonIcon: {
    fontSize: 12,
    marginRight: 4,
    color: '#FFFFFF',
  },
  reserveButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reserveButtonReserved: {
    backgroundColor: '#28a745', // Green background for reserved state
    borderColor: '#28a745',
    shadowColor: '#28a745',
  },
  reserveButtonIconReserved: {
    color: '#FFFFFF',
  },
  reserveButtonTextReserved: {
    color: '#FFFFFF',
  },
  diningImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default ItineraryContent;