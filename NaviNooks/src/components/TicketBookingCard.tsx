import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { PlaceRecommendation, TicketBooking } from '../types';

const { width } = Dimensions.get('window');

// Move these color constants to the top of the file, after imports:
const ACCENT = '#4ECDC4';
const DARK_BG = '#181A20';
const CARD_BG = '#23262F';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#fff';
const TEXT_SECONDARY = '#B0B3B8';
const ERROR = '#e74c3c';

interface TicketBookingCardProps {
  place: PlaceRecommendation;
  onTicketSelect: (booking: TicketBooking | null, placeId?: string) => void;
  selectedTickets: TicketBooking[];
  day?: number;
  arrivalTime?: string;
  forceShowModal?: boolean;
  onModalClose?: () => void;
}

interface TicketBookingCardHandle {
  showModal: () => void;
}

const TicketBookingCard = forwardRef<TicketBookingCardHandle, TicketBookingCardProps>(({
  place,
  onTicketSelect,
  selectedTickets,
  day,
  arrivalTime,
  forceShowModal = false,
  onModalClose,
}, ref) => {
  const [showModal, setShowModal] = useState(forceShowModal);
  const [selectedQuantities, setSelectedQuantities] = useState<{[key: string]: number}>({});

  // Handle forceShowModal prop changes
  React.useEffect(() => {
    setShowModal(forceShowModal);
  }, [forceShowModal]);

  // Expose showModal method to parent component
  useImperativeHandle(ref, () => ({
    showModal: () => setShowModal(true)
  }));

  const hasPaidTickets = place.ticket_info && place.ticket_info.length > 0 && 
    place.ticket_info.some(ticket => {
      const price = parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0;
      return price > 0;
    });
  const isTicketSelected = selectedTickets.some(ticket => ticket.placeId === place.place_id);

  if (!hasPaidTickets) {
    return null;
  }

  const handleTicketSelection = (ticketInfo: any) => {
    const quantity = selectedQuantities[ticketInfo.link] || 1;
    const price = parseFloat(ticketInfo.price.replace(/[^0-9.]/g, '')) || 0;
    
    const booking: TicketBooking = {
      placeId: place.place_id,
      placeName: place.name,
      ticketType: ticketInfo.is_official ? 'Official' : 'Third Party',
      price,
      quantity,
      totalPrice: price * quantity,
      isOfficial: ticketInfo.is_official,
      bookingLink: ticketInfo.link,
      day,
      arrivalTime,
    };

    onTicketSelect(booking);
    setShowModal(false);
    if (onModalClose) onModalClose();
  };

  const handleTicketUnselect = () => {
    onTicketSelect(null, place.place_id);
    setShowModal(false);
    if (onModalClose) onModalClose();
  };

  const updateQuantity = (link: string, change: number) => {
    const current = selectedQuantities[link] || 1;
    const newQuantity = Math.max(1, Math.min(10, current + change));
    setSelectedQuantities(prev => ({
      ...prev,
      [link]: newQuantity,
    }));
  };

  const paidTickets = place.ticket_info!.filter(ticket => {
    const price = parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0;
    return price > 0;
  });

  const lowestPrice = Math.min(...paidTickets.map(ticket => 
    parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0
  ));

  // Skip rendering the card button when forceShowModal is true
  if (forceShowModal) {
    return (
      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          if (onModalClose) onModalClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tickets</Text>
              <Text style={styles.modalSubtitle}>{place.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowModal(false);
                  if (onModalClose) onModalClose();
                }}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ticketsList}>
              {paidTickets.map((ticket, index) => {
                const price = parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0;
                const quantity = selectedQuantities[ticket.link] || 1;
                const totalPrice = price * quantity;

                return (
                  <View key={index} style={styles.ticketOption}>
                    <View style={styles.ticketOptionHeader}>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketBadgeText}>
                          {ticket.is_official ? 'Official' : '3rd Party'}
                        </Text>
                      </View>
                      <Text style={styles.ticketPrice}>{ticket.price}</Text>
                    </View>

                    <View style={styles.quantitySelector}>
                      <Text style={styles.quantityLabel}>Quantity:</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(ticket.link, -1)}
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(ticket.link, 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.totalPriceContainer}>
                      <Text style={styles.totalPriceLabel}>Total: </Text>
                      <Text style={styles.totalPriceValue}>${totalPrice.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.selectTicketButton}
                      onPress={() => handleTicketSelection(ticket)}
                    >
                      <Text style={styles.selectTicketButtonText}>Select This Ticket</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            
            {/* Unselect Button - only show if ticket is already selected */}
            {isTicketSelected && (
              <View style={styles.unselectContainer}>
                <TouchableOpacity
                  style={styles.unselectButton}
                  onPress={handleTicketUnselect}
                >
                  <Text style={styles.unselectButtonText}>Remove Ticket Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Normal rendering with TouchableOpacity card
  return (
    <>
      <TouchableOpacity
        style={[
          styles.ticketCard, 
          isTicketSelected && styles.selectedTicketCard,
          { borderColor: '#00D9FF', borderWidth: 2 }
        ]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketLeft}>
            <Text style={styles.ticketIcon}>🎫</Text>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketTitle}>Tickets Required</Text>
              <Text style={styles.ticketSubtitle}>
                From ${lowestPrice.toFixed(0)} • {paidTickets.length} option{paidTickets.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.ticketStatus, isTicketSelected && styles.selectedStatus]}>
            {isTicketSelected ? (
              <Text style={styles.selectedText}>✓</Text>
            ) : (
              <>
                <Text style={styles.bookIcon}>📋</Text>
                <Text style={styles.selectText}>Book</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          if (onModalClose) onModalClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tickets</Text>
              <Text style={styles.modalSubtitle}>{place.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowModal(false);
                  if (onModalClose) onModalClose();
                }}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ticketsList}>
              {paidTickets.map((ticket, index) => {
                const price = parseFloat(ticket.price.replace(/[^0-9.]/g, '')) || 0;
                const quantity = selectedQuantities[ticket.link] || 1;
                const totalPrice = price * quantity;

                return (
                  <View key={index} style={styles.ticketOption}>
                    <View style={styles.ticketOptionHeader}>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketBadgeText}>
                          {ticket.is_official ? 'Official' : '3rd Party'}
                        </Text>
                      </View>
                      <Text style={styles.ticketPrice}>{ticket.price}</Text>
                    </View>

                    <View style={styles.quantitySelector}>
                      <Text style={styles.quantityLabel}>Quantity:</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(ticket.link, -1)}
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(ticket.link, 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.totalPriceContainer}>
                      <Text style={styles.totalPriceLabel}>Total: </Text>
                      <Text style={styles.totalPriceValue}>${totalPrice.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.selectTicketButton}
                      onPress={() => handleTicketSelection(ticket)}
                    >
                      <Text style={styles.selectTicketButtonText}>Select This Ticket</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            
            {/* Unselect Button - only show if ticket is already selected */}
            {isTicketSelected && (
              <View style={styles.unselectContainer}>
                <TouchableOpacity
                  style={styles.unselectButton}
                  onPress={handleTicketUnselect}
                >
                  <Text style={styles.unselectButtonText}>Remove Ticket Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedTicketCard: {
    backgroundColor: '#153C3C',
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.15,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ticketIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  ticketSubtitle: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
  ticketStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: DARK_BG,
    borderWidth: 1,
    borderColor: BORDER,
    minWidth: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  selectedStatus: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bookIcon: {
    fontSize: 12,
    color: ACCENT,
  },
  selectText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,12,20,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  closeButtonText: {
    fontSize: 22,
    color: TEXT_SECONDARY,
    fontWeight: '400',
  },
  ticketsList: {
    padding: 12,
  },
  ticketOption: {
    backgroundColor: DARK_BG,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  ticketOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ticketPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  quantitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginHorizontal: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalPriceLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  totalPriceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  selectTicketButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 2,
  },
  selectTicketButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  unselectContainer: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  unselectButton: {
    backgroundColor: ERROR,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  unselectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default TicketBookingCard;