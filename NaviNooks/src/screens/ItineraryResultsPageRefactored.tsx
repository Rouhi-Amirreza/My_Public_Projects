import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { GeneratedItinerary, MultiDayItinerary, ItineraryFormData, DiningStop } from '../types';

// Hooks
import { useBookingState } from '../hooks/useBookingState';
import { useTravelCalculations } from '../hooks/useTravelCalculations';
import { useMapState } from '../hooks/useMapState';
import { useItineraryState } from '../hooks/useItineraryState';
import { useDiningState } from '../hooks/useDiningState';
import { useDebugState } from '../hooks/useDebugState';

// Components
import ItineraryContent from '../components/itinerary/ItineraryContent';
import CheckoutPage from './CheckoutPage';
import PrintItinerary from '../components/PrintItinerary';
import BookingConfirmationPage from './BookingConfirmationPage';
import DiningStopSelector from '../components/DiningStopSelector';
import DiningStopEditor from '../components/DiningStopEditor';
import RideSelectionModal from '../components/RideSelectionModal';
import ReservationModal from '../components/ReservationModalNew';
import ReservationManagementModal from '../components/ReservationManagementModal';
import SimpleReservationTest from '../components/SimpleReservationTest';

interface ItineraryResultsPageProps {
  itinerary: GeneratedItinerary | MultiDayItinerary;
  startingLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  returnLocation?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  formData: ItineraryFormData;
  onBackToForm: () => void;
  onRegenerateItinerary: () => void;
}

const ItineraryResultsPage: React.FC<ItineraryResultsPageProps> = ({
  itinerary,
  startingLocation,
  returnLocation,
  formData,
  onBackToForm,
  onRegenerateItinerary,
}) => {
  // State Management Hooks
  const {
    activeDay,
    itineraryState,
    currentItinerary,
    setActiveDay,
    setItineraryState,
    handleDayChange,
    isMultiDay,
    totalDays,
  } = useItineraryState({ itinerary });

  const bookingState = useBookingState({ 
    itinerary: itineraryState, 
    activeDay, 
    currentItinerary 
  });

  const travelState = useTravelCalculations({
    itineraryState,
    setItineraryState,
    activeDay,
  });

  const mapState = useMapState({
    currentItinerary,
    startingLocation,
    returnLocation,
  });

  const diningState = useDiningState();
  const debugState = useDebugState();

  // Event Handlers
  const handlePlacePress = (place: any, index: number) => {
    // Handle place interaction
    console.log('Place pressed:', place.name);
  };

  const handleDiningStopPress = (fromIndex: number, toIndex: number) => {
    // Handle dining stop selection
    const fromPlace = currentItinerary.places[fromIndex];
    const toPlace = currentItinerary.places[toIndex];
    
    diningState.openDiningModal({
      fromIndex,
      toIndex,
      fromLocation: { 
        name: fromPlace?.name || 'Starting Location',
        coordinates: { lat: 0, lng: 0 } // TODO: Extract coordinates
      },
      toLocation: { 
        name: toPlace?.name || 'Destination',
        coordinates: { lat: 0, lng: 0 } // TODO: Extract coordinates
      },
      arrivalTime: currentItinerary.schedule?.[toIndex]?.arrivalTime || '09:00',
    });
  };

  const handleDiningReservation = (diningStop: DiningStop) => {
    console.log('🔔 handleDiningReservation called with:', diningStop);
    diningState.openReservationModal(diningStop);
  };

  const handleReservationManagement = (diningStop: DiningStop) => {
    console.log('🔄 handleReservationManagement called with:', diningStop);
    diningState.openReservationManagementModal(diningStop);
  };

  const handleDiningStopEdit = (diningStop: DiningStop, itemIndex: number, stopIndex: number) => {
    diningState.openDiningStopEdit(diningStop, itemIndex, stopIndex);
  };

  const handleRemoveDiningStop = (diningStop: DiningStop, itemIndex: number, stopIndex: number) => {
    // TODO: Implement remove dining stop functionality
    console.log('Remove dining stop:', diningStop.name);
  };

  const handleBackToHome = () => {
    onBackToForm();
  };

  // Show different screens based on state
  if (bookingState.showCheckout) {
    return (
      <CheckoutPage
        bookingInfo={bookingState.bookingInfo}
        onBack={() => bookingState.setShowCheckout(false)}
        onConfirm={bookingState.handleConfirmBooking}
      />
    );
  }

  if (bookingState.showPrintItinerary) {
    return (
      <PrintItinerary
        itinerary={currentItinerary}
        startingLocation={startingLocation}
        returnLocation={returnLocation}
        formData={formData}
        onBack={() => bookingState.setShowPrintItinerary(false)}
      />
    );
  }

  if (bookingState.showConfirmation) {
    return (
      <BookingConfirmationPage
        bookingInfo={bookingState.bookingInfo}
        onBackToHome={handleBackToHome}
        onViewItinerary={() => bookingState.setShowPrintItinerary(true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ItineraryContent
        currentItinerary={currentItinerary}
        activeDay={activeDay}
        totalDays={totalDays}
        isMultiDay={isMultiDay}
        formData={formData}
        startingLocation={startingLocation}
        returnLocation={returnLocation}
        mapRef={mapState.mapRef}
        mapRegion={mapState.mapRegion}
        showDebugPanel={debugState.showDebugPanel}
        onDayChange={handleDayChange}
        onPlacePress={handlePlacePress}
        onDiningStopPress={handleDiningStopPress}
        onDiningReservation={handleDiningReservation}
        onReservationManagement={handleReservationManagement}
        onDiningStopEdit={handleDiningStopEdit}
        onRemoveDiningStop={handleRemoveDiningStop}
        isDiningStopReserved={diningState.isDiningStopReserved}
        getDiningStopId={diningState.getDiningStopId}
        onBackToForm={onBackToForm}
        onRegenerateItinerary={onRegenerateItinerary}
      />

      {/* Modals */}
      <Modal
        visible={diningState.diningModalVisible}
        transparent
        animationType="slide"
      >
        <DiningStopSelector
          visible={diningState.diningModalVisible}
          onClose={diningState.closeDiningModal}
          fromLocation={diningState.selectedRouteSegment?.fromLocation}
          toLocation={diningState.selectedRouteSegment?.toLocation}
          arrivalTime={diningState.selectedRouteSegment?.arrivalTime}
        />
      </Modal>

      <Modal
        visible={diningState.editingDiningStop !== null}
        transparent
        animationType="slide"
      >
        {diningState.editingDiningStop && (
          <DiningStopEditor
            visible={true}
            diningStop={diningState.editingDiningStop.stop}
            onClose={diningState.closeDiningStopEdit}
            onUpdate={(updatedStop) => {
              // Handle dining stop update
              diningState.closeDiningStopEdit();
            }}
            onRemove={() => {
              // Handle dining stop removal
              diningState.closeDiningStopEdit();
            }}
          />
        )}
      </Modal>

      <Modal
        visible={diningState.showReservationModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        {diningState.selectedDiningStop && (
          <ReservationModal
            diningStop={diningState.selectedDiningStop}
            onClose={diningState.closeReservationModal}
            onReservationConfirmed={diningState.markDiningStopAsReserved}
          />
        )}
      </Modal>

      <Modal
        visible={diningState.showReservationManagementModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        {diningState.selectedDiningStop && (
          <ReservationManagementModal
            diningStop={diningState.selectedDiningStop}
            onClose={diningState.closeReservationManagementModal}
            onModifyReservation={diningState.openReservationModal}
            onCancelReservation={diningState.cancelReservation}
            getDiningStopId={diningState.getDiningStopId}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default ItineraryResultsPage;