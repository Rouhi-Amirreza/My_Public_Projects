import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { DiningStop } from '../types';
import DiningService from '../services/DiningService';
import DurationSelector from './DurationSelector';

interface DiningStopEditorProps {
  diningStop: DiningStop;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedStop: DiningStop) => void;
  onRemove: () => void;
}

const DiningStopEditor: React.FC<DiningStopEditorProps> = ({
  diningStop,
  visible,
  onClose,
  onUpdate,
  onRemove,
}) => {
  const [duration, setDuration] = useState(diningStop.dining_duration);
  const [customDuration, setCustomDuration] = useState(diningStop.dining_duration.toString());

  const handleSave = () => {
    // Ensure all values are valid numbers
    const validDuration = typeof duration === 'number' && !isNaN(duration) ? duration : 30;
    
    // Only update if the duration has actually changed
    if (validDuration !== diningStop.dining_duration) {
      const validTravelTo = typeof diningStop.travel_breakdown?.travel_to_restaurant === 'number' && 
                           !isNaN(diningStop.travel_breakdown.travel_to_restaurant) ? 
                           diningStop.travel_breakdown.travel_to_restaurant : 0;
      const validTravelFrom = typeof diningStop.travel_breakdown?.travel_from_restaurant === 'number' && 
                             !isNaN(diningStop.travel_breakdown.travel_from_restaurant) ? 
                             diningStop.travel_breakdown.travel_from_restaurant : 0;
      
      const updatedStop: DiningStop = {
        ...diningStop,
        dining_duration: validDuration,
        total_stop_impact: validTravelTo + validDuration + validTravelFrom,
      };
      onUpdate(updatedStop);
    }
    onClose();
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Dining Stop',
      `Are you sure you want to remove ${diningStop.name} from your itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            onRemove();
            onClose();
          }
        },
      ]
    );
  };

  const updateDuration = (value: number) => {
    const newDuration = Math.round(value);
    setDuration(newDuration);
    setCustomDuration(newDuration.toString());
  };

  const handleCustomDurationChange = (text: string) => {
    setCustomDuration(text);
    const numValue = parseInt(text, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 300) {
      setDuration(numValue);
    }
  };

  const getRecommendedDuration = () => {
    return DiningService.calculateDiningDuration(
      diningStop.meal_type,
      diningStop.typical_time_spent
    );
  };

  const getDurationDescription = () => {
    if (duration <= 15) return 'Quick stop';
    if (duration <= 30) return 'Short visit';
    if (duration <= 60) return 'Standard visit';
    if (duration <= 90) return 'Leisurely visit';
    return 'Extended visit';
  };

  const getMealTypeEmoji = () => {
    const emojiMap: { [key: string]: string } = {
      breakfast: '🥐',
      brunch: '🥞',
      coffee: '☕',
      lunch: '🍽️',
      dinner: '🍷',
      drinks: '🍸',
    };
    return emojiMap[diningStop.meal_type] || '🍽️';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Dining Stop</Text>
            <TouchableOpacity style={styles.headerRemoveButton} onPress={handleRemove}>
              <Text style={styles.headerRemoveText}>🗑️ Remove</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Restaurant Info */}
          <View style={styles.restaurantCard}>
            {diningStop.photos && diningStop.photos.length > 0 && (
              <Image
                source={{
                  uri: DiningService.getPhotoUrl(diningStop.photos[0].photo_reference, 300)
                }}
                style={styles.restaurantImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.restaurantInfo}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.mealEmoji}>{getMealTypeEmoji()}</Text>
                <View style={styles.restaurantDetails}>
                  <Text style={styles.restaurantName}>{diningStop.name}</Text>
                  <Text style={styles.mealType}>
                    {diningStop.meal_type.charAt(0).toUpperCase() + diningStop.meal_type.slice(1)} Stop
                  </Text>
                  <Text style={styles.restaurantAddress}>{diningStop.address}</Text>
                </View>
              </View>

              <View style={styles.restaurantStats}>
                <Text style={styles.rating}>⭐ {diningStop.rating.toFixed(1)}</Text>
                {diningStop.price_level && (
                  <Text style={styles.priceLevel}>
                    {'💰'.repeat(diningStop.price_level)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Duration Editor */}
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Dining Duration</Text>
            
            {/* Current Duration Display */}
            <View style={styles.currentDuration}>
              <Text style={styles.durationValue}>
                {DiningService.formatDuration(duration)}
              </Text>
              <Text style={styles.durationDescription}>
                {getDurationDescription()}
              </Text>
            </View>

            {/* Duration Selector */}
            <DurationSelector
              value={duration}
              minimumValue={10}
              maximumValue={180}
              step={5}
              onValueChange={updateDuration}
              style={styles.durationSelector}
            />

            {/* Custom Duration Input */}
            <View style={styles.customDurationContainer}>
              <Text style={styles.customDurationLabel}>Or enter exact minutes:</Text>
              <TextInput
                style={styles.customDurationInput}
                value={customDuration}
                onChangeText={handleCustomDurationChange}
                keyboardType="number-pad"
                placeholder="45"
                placeholderTextColor="#888888"
              />
              <Text style={styles.customDurationUnit}>minutes</Text>
            </View>

            {/* Recommended Duration */}
            <TouchableOpacity
              style={styles.recommendedButton}
              onPress={() => updateDuration(getRecommendedDuration())}
            >
              <Text style={styles.recommendedButtonText}>
                Use Recommended: {DiningService.formatDuration(getRecommendedDuration())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Impact Information */}
          <View style={styles.impactSection}>
            <Text style={styles.sectionTitle}>Time Impact Breakdown</Text>
            <View style={styles.impactCard}>
              <View style={styles.impactItem}>
                <Text style={styles.impactIcon}>
                  {diningStop.travel_breakdown.travel_to_icon || '🚶'}➡️
                </Text>
                <Text style={styles.impactLabel}>
                  {(diningStop.travel_breakdown.travel_to_mode || 'walking') === 'walking' ? 'Walk' : 'Drive'} to Restaurant:
                </Text>
                <Text style={styles.impactValue}>
                  {DiningService.formatDuration(diningStop.travel_breakdown.travel_to_restaurant)}
                </Text>
              </View>
              <View style={styles.impactItem}>
                <Text style={styles.impactIcon}>🍽️</Text>
                <Text style={styles.impactLabel}>Dining Time:</Text>
                <Text style={styles.impactValue}>
                  {DiningService.formatDuration(duration)}
                </Text>
              </View>
              <View style={styles.impactItem}>
                <Text style={styles.impactIcon}>
                  ➡️{diningStop.travel_breakdown.travel_from_icon || '🚶'}
                </Text>
                <Text style={styles.impactLabel}>
                  {(diningStop.travel_breakdown.travel_from_mode || 'walking') === 'walking' ? 'Walk' : 'Drive'} to Next Stop:
                </Text>
                <Text style={styles.impactValue}>
                  {DiningService.formatDuration(diningStop.travel_breakdown.travel_from_restaurant)}
                </Text>
              </View>
              <View style={styles.totalImpactItem}>
                <Text style={styles.totalImpactIcon}>⏱️</Text>
                <Text style={styles.totalImpactLabel}>Total Stop Impact:</Text>
                <Text style={styles.totalImpactValue}>
                  {DiningService.formatDuration(
                    diningStop.travel_breakdown.travel_to_restaurant + 
                    duration + 
                    diningStop.travel_breakdown.travel_from_restaurant
                  )}
                </Text>
              </View>
              {diningStop.travel_breakdown.total_extra_travel > 0 && (
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonIcon}>📊</Text>
                  <Text style={styles.comparisonLabel}>Extra vs Direct Route:</Text>
                  <Text style={styles.comparisonValue}>
                    +{DiningService.formatDuration(diningStop.travel_breakdown.total_extra_travel)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerRemoveButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  headerRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  restaurantCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  restaurantImage: {
    width: '100%',
    height: 150,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  mealType: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#cccccc',
  },
  restaurantStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  priceLevel: {
    fontSize: 16,
  },
  durationSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  currentDuration: {
    alignItems: 'center',
    marginBottom: 20,
  },
  durationValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 4,
  },
  durationDescription: {
    fontSize: 14,
    color: '#cccccc',
  },
  durationSelector: {
    marginBottom: 20,
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customDurationLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginRight: 12,
  },
  customDurationInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    width: 80,
    textAlign: 'center',
    marginRight: 8,
  },
  customDurationUnit: {
    fontSize: 14,
    color: '#cccccc',
  },
  recommendedButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  recommendedButtonText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  impactSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  impactCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  impactLabel: {
    fontSize: 14,
    color: '#cccccc',
    flex: 1,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  totalImpactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  totalImpactIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  totalImpactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  totalImpactValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  comparisonIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#cccccc',
    flex: 1,
  },
  comparisonValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f39c12',
  },
});

export default DiningStopEditor;