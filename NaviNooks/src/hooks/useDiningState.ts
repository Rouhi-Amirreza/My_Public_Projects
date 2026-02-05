import { useState } from 'react';
import { DiningStop } from '../types';

interface RouteSegment {
  fromIndex: number;
  toIndex: number;
  fromLocation: { name: string; coordinates: { lat: number; lng: number } };
  toLocation: { name: string; coordinates: { lat: number; lng: number } };
  arrivalTime: string;
}

interface EditingDiningStop {
  stop: DiningStop;
  itemIndex: number;
  stopIndex: number;
}

export const useDiningState = () => {
  const [diningModalVisible, setDiningModalVisible] = useState(false);
  const [selectedRouteSegment, setSelectedRouteSegment] = useState<RouteSegment | null>(null);
  const [editingDiningStop, setEditingDiningStop] = useState<EditingDiningStop | null>(null);
  const [selectedDiningStop, setSelectedDiningStop] = useState<DiningStop | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReservationManagementModal, setShowReservationManagementModal] = useState(false);
  const [reservedDiningStops, setReservedDiningStops] = useState<Set<string>>(new Set());

  // Open dining modal for a specific route segment
  const openDiningModal = (segment: RouteSegment) => {
    setSelectedRouteSegment(segment);
    setDiningModalVisible(true);
  };

  // Close dining modal
  const closeDiningModal = () => {
    setDiningModalVisible(false);
    setSelectedRouteSegment(null);
  };

  // Open dining stop editing
  const openDiningStopEdit = (stop: DiningStop, itemIndex: number, stopIndex: number) => {
    setEditingDiningStop({ stop, itemIndex, stopIndex });
  };

  // Close dining stop editing
  const closeDiningStopEdit = () => {
    setEditingDiningStop(null);
  };

  // Open reservation modal
  const openReservationModal = (diningStop: DiningStop) => {
    console.log('🔔 Opening reservation modal for:', diningStop?.name);
    setSelectedDiningStop(diningStop);
    setShowReservationModal(true);
  };

  // Close reservation modal
  const closeReservationModal = () => {
    setShowReservationModal(false);
    setSelectedDiningStop(null);
  };

  // Open reservation management modal
  const openReservationManagementModal = (diningStop: DiningStop) => {
    console.log('🔄 Opening reservation management modal for:', diningStop?.name);
    setSelectedDiningStop(diningStop);
    setShowReservationManagementModal(true);
  };

  // Close reservation management modal
  const closeReservationManagementModal = () => {
    setShowReservationManagementModal(false);
    setSelectedDiningStop(null);
  };

  // Mark dining stop as reserved
  const markDiningStopAsReserved = (diningStopId: string) => {
    console.log('🎉 Marking dining stop as reserved:', diningStopId);
    setReservedDiningStops(prev => new Set([...prev, diningStopId]));
  };

  // Cancel reservation
  const cancelReservation = (diningStopId: string) => {
    console.log('❌ Cancelling reservation for:', diningStopId);
    setReservedDiningStops(prev => {
      const newSet = new Set(prev);
      newSet.delete(diningStopId);
      return newSet;
    });
  };

  // Check if dining stop is reserved
  const isDiningStopReserved = (diningStopId: string): boolean => {
    return reservedDiningStops.has(diningStopId);
  };

  // Generate unique ID for dining stop
  const getDiningStopId = (diningStop: DiningStop, itemIndex?: number, stopIndex?: number): string => {
    // Use place_id if available, otherwise use name + coordinates
    const baseId = diningStop.place_id || 
                   `${diningStop.name}-${diningStop.coordinates?.latitude}-${diningStop.coordinates?.longitude}`;
    return itemIndex !== undefined && stopIndex !== undefined 
      ? `${baseId}-${itemIndex}-${stopIndex}` 
      : baseId;
  };

  return {
    // State
    diningModalVisible,
    selectedRouteSegment,
    editingDiningStop,
    selectedDiningStop,
    showReservationModal,
    showReservationManagementModal,
    reservedDiningStops,
    
    // Actions
    setDiningModalVisible,
    setSelectedRouteSegment,
    setEditingDiningStop,
    setSelectedDiningStop,
    setShowReservationModal,
    openDiningModal,
    closeDiningModal,
    openDiningStopEdit,
    closeDiningStopEdit,
    openReservationModal,
    closeReservationModal,
    openReservationManagementModal,
    closeReservationManagementModal,
    markDiningStopAsReserved,
    cancelReservation,
    isDiningStopReserved,
    getDiningStopId,
  };
};