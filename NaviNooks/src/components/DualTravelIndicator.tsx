import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TravelOptions } from '../types';

interface DualTravelIndicatorProps {
  travelOptions: TravelOptions;
  selectedMode: 'driving' | 'walking';
  onModeChange: (mode: 'driving' | 'walking') => void;
  onRideBookPress?: () => void;
  isRideBooked?: boolean;
  canBookRide?: boolean;
  scheduledTime?: string;
  day?: number;
}

const DualTravelIndicator: React.FC<DualTravelIndicatorProps> = ({
  travelOptions,
  selectedMode,
  onModeChange,
  onRideBookPress,
  isRideBooked = false,
  canBookRide = true,
  scheduledTime,
  day,
}) => {
  console.log(`🔧 DualTravelIndicator DEBUG:`, {
    selectedMode,
    travelOptions,
    hasWalking: !!travelOptions?.walking,
    hasDriving: !!travelOptions?.driving,
    walkingDuration: travelOptions?.walking?.duration,
    drivingDuration: travelOptions?.driving?.duration,
    walkingIcon: travelOptions?.walking?.icon,
    drivingIcon: travelOptions?.driving?.icon
  });
  
  const selectedTravel = travelOptions[selectedMode];
  const alternativeMode = selectedMode === 'driving' ? 'walking' : 'driving';
  const alternativeTravel = travelOptions[alternativeMode];
  
  console.log(`🔧 DualTravelIndicator MODE DEBUG:`, {
    selectedMode,
    alternativeMode,
    selectedTravel,
    alternativeTravel,
    hasSelectedTravel: !!selectedTravel,
    hasAlternativeTravel: !!alternativeTravel
  });
  
  // Show alternative option when:
  // 1. Driving is selected and walking is reasonable (≤ 25 min)
  // 2. Walking is selected (always show driving option)
  const showAlternativeOption = (selectedMode === 'driving' && alternativeTravel?.duration <= 25) || 
                               (selectedMode === 'walking');
  
  console.log(`🔧 DualTravelIndicator SHOW DEBUG:`, {
    showAlternativeOption,
    condition1: selectedMode === 'driving' && alternativeTravel?.duration <= 25,
    condition2: selectedMode === 'walking',
    alternativeDuration: alternativeTravel?.duration
  });
  
  // Safety checks - if travel data is missing, don't render
  if (!selectedTravel || !alternativeTravel) {
    console.warn(`⚠️ DualTravelIndicator missing travel data:`, {
      selectedMode,
      hasSelectedTravel: !!selectedTravel,
      hasAlternativeTravel: !!alternativeTravel
    });
    return null;
  }
  
  const handleRideBookPress = () => {
    if (canBookRide && onRideBookPress) {
      onRideBookPress();
    }
  };

  const handleModeChange = (mode: 'driving' | 'walking') => {
    console.log(`🔥 DualTravelIndicator handleModeChange CALLED:`, {
      newMode: mode,
      currentSelectedMode: selectedMode,
      willChange: mode !== selectedMode,
      timestamp: new Date().toISOString()
    });
    
    if (onModeChange) {
      console.log(`🔥 DualTravelIndicator calling onModeChange with mode: ${mode}`);
      onModeChange(mode);
      console.log(`🔥 DualTravelIndicator onModeChange called successfully`);
    } else {
      console.error(`❌ DualTravelIndicator onModeChange is missing!`);
    }
  };

  return (
    <View style={styles.dualTravelContainer}>
      <View style={styles.indicatorsRow}>
        {/* Alternative mode indicator (left side) */}
        {showAlternativeOption && (
          <TouchableOpacity
            style={[
              styles.smallTravelIndicator,
              alternativeMode === 'walking' ? styles.walkingIndicator : styles.drivingIndicator,
              selectedMode === alternativeMode && styles.selectedAlternativeIndicator
            ]}
            onPress={() => {
              console.log(`🔥 ALTERNATIVE ICON PRESSED: ${alternativeMode} (was ${selectedMode})`);
              handleModeChange(alternativeMode);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.smallTravelIcon, selectedMode === alternativeMode && styles.selectedAlternativeIcon]}>
              {alternativeTravel.icon}
            </Text>
            <Text style={[styles.smallTravelTime, selectedMode === alternativeMode && styles.selectedAlternativeTime]}>
              {alternativeTravel.duration}m
            </Text>
          </TouchableOpacity>
        )}

        {/* Main selected mode indicator (right side) */}
        <TouchableOpacity 
          style={[
            styles.circularTravelIndicator,
            selectedMode === 'driving' && canBookRide && styles.clickableIndicator,
            selectedMode === 'driving' && isRideBooked && styles.bookedIndicator,
            selectedMode === 'walking' && styles.selectedWalkingMainIndicator
          ]}
          onPress={() => {
            console.log(`🔥 MAIN ICON PRESSED: currently ${selectedMode}, canBookRide: ${canBookRide}, isRideBooked: ${isRideBooked}`);
            if (selectedMode === 'driving') {
              console.log(`🔥 Main icon is driving - calling handleRideBookPress`);
              handleRideBookPress();
            } else {
              console.log(`🔥 Main icon is walking - switching to driving`);
              handleModeChange('driving');
            }
          }}
          disabled={selectedMode === 'driving' && !canBookRide}
          activeOpacity={selectedMode === 'driving' && canBookRide ? 0.7 : 1}
        >
          <Text style={[
            styles.circularTravelIcon, 
            selectedMode === 'driving' && isRideBooked && styles.bookedIcon,
            selectedMode === 'walking' && styles.selectedWalkingMainIcon
          ]}>
            {selectedMode === 'driving' && isRideBooked ? '✓' : selectedTravel.icon}
          </Text>
          <Text style={[
            styles.circularTravelTime, 
            selectedMode === 'driving' && isRideBooked && styles.bookedTime,
            selectedMode === 'walking' && styles.selectedWalkingMainTime
          ]}>
            {selectedTravel.duration}m
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Dynamic mode text based on selected mode */}
      {selectedMode === 'driving' ? (
        canBookRide && (
          <View style={styles.bookContainer}>
            {!isRideBooked && <Text style={styles.bookIcon}>📋</Text>}
            <Text style={styles.bookRideText}>
              {isRideBooked ? 'Booked' : 'Book'}
            </Text>
          </View>
        )
      ) : (
        <Text style={styles.walkingModeText}>
          Walking
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dualTravelContainer: {
    alignItems: 'center',
    position: 'relative', // Enable absolute positioning for children
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the main indicator
    position: 'relative',
  },
  smallTravelIndicator: {
    position: 'absolute',
    left: -50, // Position to the left of the main indicator
    top: 10, // Center vertically with the main indicator
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d0d0d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  walkingIndicator: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  drivingIndicator: {
    backgroundColor: '#e8f0ff',
    borderColor: '#00D9FF',
  },
  selectedAlternativeIndicator: {
    backgroundColor: '#4caf50',
    borderColor: '#2e7d32',
    shadowColor: '#4caf50',
    shadowOpacity: 0.3,
  },
  smallTravelIcon: {
    fontSize: 14,
    color: '#333',
  },
  selectedAlternativeIcon: {
    color: '#fff',
    fontWeight: '700',
  },
  smallTravelTime: {
    fontSize: 8,
    color: '#666',
    fontWeight: '600',
    marginTop: 1,
  },
  selectedAlternativeTime: {
    color: '#fff',
    fontWeight: '700',
  },
  circularTravelIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clickableIndicator: {
    borderWidth: 2,
    borderColor: '#00D9FF',
    backgroundColor: '#1C1C1E',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bookedIndicator: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
    shadowColor: '#27ae60',
  },
  selectedWalkingMainIndicator: {
    backgroundColor: '#666',
    borderColor: '#999',
    shadowColor: '#666',
  },
  circularTravelIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  bookedIcon: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  selectedWalkingMainIcon: {
    color: '#FFFFFF',
  },
  circularTravelTime: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
  },
  bookedTime: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  selectedWalkingMainTime: {
    color: '#FFFFFF',
  },
  bookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 2,
  },
  bookIcon: {
    fontSize: 8,
    color: '#00D9FF',
  },
  bookRideText: {
    fontSize: 9,
    color: '#00D9FF',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  walkingModeText: {
    fontSize: 9,
    color: '#4caf50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});

export default DualTravelIndicator;