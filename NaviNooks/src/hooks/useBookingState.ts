import { useState, useMemo } from 'react';
import { TicketBooking, RideBooking, BookingInfo, GeneratedItinerary, MultiDayItinerary } from '../types';

interface UseBookingStateProps {
  itinerary: GeneratedItinerary | MultiDayItinerary;
  activeDay: number;
  currentItinerary: GeneratedItinerary;
}

export const useBookingState = ({ itinerary, activeDay, currentItinerary }: UseBookingStateProps) => {
  const [ticketBookings, setTicketBookings] = useState<TicketBooking[]>([]);
  const [rideBookings, setRideBookings] = useState<RideBooking[]>([]);
  const [allTicketsSelected, setAllTicketsSelected] = useState(false);
  const [allRidesSelected, setAllRidesSelected] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPrintItinerary, setShowPrintItinerary] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Type guard for multi-day itinerary
  const isMultiDay = (checkItinerary: GeneratedItinerary | MultiDayItinerary): checkItinerary is MultiDayItinerary => {
    return 'days' in checkItinerary;
  };

  // Calculate booking totals with safety checks
  const bookingInfo: BookingInfo = useMemo(() => ({
    ticketBookings,
    rideBookings,
    totalTicketCost: ticketBookings.reduce((sum, ticket) => {
      const safePrice = isNaN(ticket.totalPrice) ? 0 : ticket.totalPrice;
      return sum + safePrice;
    }, 0),
    totalRideCost: rideBookings.reduce((sum, ride) => {
      const safePrice = isNaN(ride.estimatedPrice) ? 0 : ride.estimatedPrice;
      return sum + safePrice;
    }, 0),
    totalCost: ticketBookings.reduce((sum, ticket) => {
      const safePrice = isNaN(ticket.totalPrice) ? 0 : ticket.totalPrice;
      return sum + safePrice;
    }, 0) + 
    rideBookings.reduce((sum, ride) => {
      const safePrice = isNaN(ride.estimatedPrice) ? 0 : ride.estimatedPrice;
      return sum + safePrice;
    }, 0),
  }), [ticketBookings, rideBookings]);

  // Toggle all tickets functionality
  const handleToggleAllTickets = () => {
    if (!currentItinerary || !currentItinerary.places) return;
    
    if (allTicketsSelected) {
      setTicketBookings([]);
      setAllTicketsSelected(false);
    } else {
      const allTickets: TicketBooking[] = [];
      currentItinerary.places.forEach((place, index) => {
        if (place.ticket_info && place.ticket_info.length > 0) {
          const ticketInfo = place.ticket_info[0];
          const price = parseFloat(ticketInfo.price.replace(/[^0-9.]/g, '')) || 0;
          
          if (!isNaN(price) && price > 0) {
            allTickets.push({
              placeId: place.place_id,
              placeName: place.name,
              ticketType: ticketInfo.is_official ? 'Official' : 'Third Party',
              price: price,
              quantity: 1,
              totalPrice: price,
              bookingLink: ticketInfo.link,
              isOfficial: ticketInfo.is_official,
              day: isMultiDay(itinerary) ? activeDay : undefined,
              arrivalTime: currentItinerary.schedule[index]?.arrivalTime,
            });
          }
        }
      });
      setTicketBookings(allTickets);
      setAllTicketsSelected(true);
    }
  };

  // Booking handlers
  const handleTicketSelect = (booking: TicketBooking | null, placeId?: string) => {
    setTicketBookings(prev => {
      if (booking === null && placeId) {
        return prev.filter(ticket => ticket.placeId !== placeId);
      }
      
      if (!booking) return prev;
      
      const existingIndex = prev.findIndex(ticket => ticket.placeId === booking.placeId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = booking;
        return updated;
      } else {
        return [...prev, booking];
      }
    });
  };

  const handleRideSelect = (booking: RideBooking) => {
    setRideBookings(prev => {
      const existingIndex = prev.findIndex(ride => ride.id === booking.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = booking;
        return updated;
      } else {
        return [...prev, booking];
      }
    });
  };

  const handleRideRemove = (rideId: string) => {
    setRideBookings(prev => prev.filter(ride => ride.id !== rideId));
  };

  // Navigation handlers
  const handleCheckout = () => setShowCheckout(true);
  const handleConfirmBooking = () => setShowConfirmation(true);
  const handlePrintItinerary = () => setShowPrintItinerary(true);

  return {
    // State
    ticketBookings,
    rideBookings,
    allTicketsSelected,
    allRidesSelected,
    showCheckout,
    showPrintItinerary,
    showConfirmation,
    bookingInfo,
    
    // Actions
    setTicketBookings,
    setRideBookings,
    setAllTicketsSelected,
    setAllRidesSelected,
    setShowCheckout,
    setShowPrintItinerary,
    setShowConfirmation,
    handleToggleAllTickets,
    handleTicketSelect,
    handleRideSelect,
    handleRideRemove,
    handleCheckout,
    handleConfirmBooking,
    handlePrintItinerary,
  };
};