import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import DiningService, { DiningRecommendation, DiningOption } from '../services/DiningService';

const { width, height } = Dimensions.get('window');

interface DiningStopSelectorProps {
  fromLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  toLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  arrivalTime: string;
  onDiningSelected: (dining: DiningOption, mealType: string) => void;
  visible: boolean;
  onClose: () => void;
}

const DiningStopSelector: React.FC<DiningStopSelectorProps> = ({
  fromLocation,
  toLocation,
  arrivalTime,
  onDiningSelected,
  visible,
  onClose,
}) => {
  const [recommendations, setRecommendations] = useState<DiningRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<DiningOption | null>(null);

  useEffect(() => {
    console.log('🍽️ DiningStopSelector: visibility changed:', { visible, fromLocation: fromLocation?.address, toLocation: toLocation?.address });
    if (visible) {
      loadDiningOptions();
    }
  }, [visible, fromLocation, toLocation, arrivalTime]);

  const loadDiningOptions = async () => {
    console.log('🍽️ DiningStopSelector: Loading dining options...');
    setLoading(true);
    setRecommendations([]);
    setSelectedMealType(null);
    setSelectedOption(null);

    try {
      console.log('🍽️ DiningStopSelector: Calling findDiningOptionsBetween with:', {
        fromCoords: `${fromLocation.coordinates.lat},${fromLocation.coordinates.lng}`,
        toCoords: `${toLocation.coordinates.lat},${toLocation.coordinates.lng}`,
        arrivalTime
      });
      
      const options = await DiningService.findDiningOptionsBetween(
        fromLocation.coordinates.lat,
        fromLocation.coordinates.lng,
        toLocation.coordinates.lat,
        toLocation.coordinates.lng,
        arrivalTime
      );
      
      console.log('🍽️ DiningStopSelector: Received dining options:', {
        optionsCount: options.length,
        mealTypes: options.map(o => o.meal_type)
      });
      setRecommendations(options);
      
      // Auto-select first meal type if available
      if (options.length > 0) {
        console.log('🍽️ DiningStopSelector: Auto-selecting first meal type:', options[0].meal_type);
        setSelectedMealType(options[0].meal_type);
      }
    } catch (error) {
      console.error('Error loading dining options:', error);
      Alert.alert('Error', 'Unable to load dining recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleDiningSelect = (option: DiningOption | null) => {
    console.log('🍽️ DiningStopSelector: handleDiningSelect called', {
      optionName: option?.name,
      hasOption: !!option,
      selectedMealType: selectedMealType,
      hasOnDiningSelected: !!onDiningSelected
    });
    
    if (!option) {
      console.error('❌ No dining option provided');
      return;
    }
    
    if (!selectedMealType) {
      console.error('❌ No meal type selected');
      return;
    }
    
    console.log('🍽️ DiningStopSelector: Calling onDiningSelected...');
    try {
      onDiningSelected(option, selectedMealType);
      console.log('🍽️ DiningStopSelector: onDiningSelected completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error in onDiningSelected:', error);
    }
  };

  const renderMealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      <Text style={styles.selectorTitle}>Choose Your Stop</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTypeScroll}>
        {recommendations.map((rec) => (
          <TouchableOpacity
            key={rec.meal_type}
            style={[
              styles.mealTypeButton,
              selectedMealType === rec.meal_type && styles.selectedMealType
            ]}
            onPress={() => {
              console.log('🍽️ DiningStopSelector: Meal type selected:', rec.meal_type);
              setSelectedMealType(rec.meal_type);
            }}
          >
            <Text style={styles.mealEmoji}>{rec.emoji}</Text>
            <Text style={[
              styles.mealTypeText,
              selectedMealType === rec.meal_type && styles.selectedMealTypeText
            ]}>
              {rec.meal_label}
            </Text>
            <Text style={styles.optionsCount}>{rec.options.length} options</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDiningOption = (option: DiningOption) => (
    <TouchableOpacity
      key={option.place_id}
      style={styles.optionCard}
      onPress={() => setSelectedOption(option)}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionInfo}>
          <Text style={styles.optionName} numberOfLines={1}>{option.name}</Text>
          <Text style={styles.optionAddress} numberOfLines={1}>{option.vicinity}</Text>
          
          <View style={styles.optionStats}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingEmoji}>⭐</Text>
              <Text style={styles.ratingText}>{option.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({option.user_ratings_total})</Text>
            </View>
            
            {option.price_level && (
              <Text style={styles.priceLevel}>
                {DiningService.formatPriceLevel(option.price_level)}
              </Text>
            )}
          </View>
          
          <View style={styles.detourInfo}>
            <Text style={styles.detourText}>
              📍 {DiningService.formatDistance(option.distance_from_route || 0)}
            </Text>
            <Text style={styles.detourTime}>
              ⏱️ {DiningService.formatDetourTime(option.detour_time || 0)}
            </Text>
          </View>
        </View>

        {option.photos && option.photos.length > 0 && (
          <Image
            source={{
              uri: DiningService.getPhotoUrl(option.photos[0].photo_reference, 200)
            }}
            style={styles.optionImage}
            resizeMode="cover"
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => {
          console.log('🍽️ DiningStopSelector: "Add This Stop" button pressed (list view) for:', option.name);
          handleDiningSelect(option);
        }}
      >
        <Text style={styles.selectButtonText}>Add This Stop</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSelectedOption = () => {
    if (!selectedOption) return null;

    return (
      <Modal
        visible={!!selectedOption}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOption(null)}
      >
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedOption(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailContent}>
            {selectedOption.photos && selectedOption.photos.length > 0 && (
              <Image
                source={{
                  uri: DiningService.getPhotoUrl(selectedOption.photos[0].photo_reference, 600)
                }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedOption.name}</Text>
              <Text style={styles.detailAddress}>{selectedOption.vicinity}</Text>

              <View style={styles.detailStats}>
                <View style={styles.detailRating}>
                  <Text style={styles.detailRatingEmoji}>⭐</Text>
                  <Text style={styles.detailRatingText}>{selectedOption.rating.toFixed(1)}</Text>
                  <Text style={styles.detailReviewCount}>
                    ({selectedOption.user_ratings_total} reviews)
                  </Text>
                </View>

                {selectedOption.price_level && (
                  <Text style={styles.detailPriceLevel}>
                    {DiningService.formatPriceLevel(selectedOption.price_level)}
                  </Text>
                )}
              </View>

              <View style={styles.detailDetour}>
                <View style={styles.detourItem}>
                  <Text style={styles.detourIcon}>📍</Text>
                  <Text style={styles.detourLabel}>Distance:</Text>
                  <Text style={styles.detourValue}>
                    {DiningService.formatDistance(selectedOption.distance_from_route || 0)}
                  </Text>
                </View>
                
                <View style={styles.detourItem}>
                  <Text style={styles.detourIcon}>⏱️</Text>
                  <Text style={styles.detourLabel}>Extra Time:</Text>
                  <Text style={styles.detourValue}>
                    {DiningService.formatDetourTime(selectedOption.detour_time || 0)}
                  </Text>
                </View>
              </View>

              {selectedOption.opening_hours?.open_now !== undefined && (
                <View style={styles.hoursContainer}>
                  <Text style={[
                    styles.hoursStatus,
                    selectedOption.opening_hours.open_now ? styles.openNow : styles.closedNow
                  ]}>
                    {selectedOption.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                console.log('🍽️ DiningStopSelector: "Add This Stop" button pressed (detail view) for:', selectedOption?.name);
                handleDiningSelect(selectedOption);
              }}
            >
              <Text style={styles.confirmButtonText}>Add This Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDiningOptions = () => {
    const selectedRec = recommendations.find(rec => rec.meal_type === selectedMealType);
    if (!selectedRec) return null;

    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.optionsTitle}>
          {selectedRec.emoji} {selectedRec.meal_label} Options
        </Text>
        <Text style={styles.routeInfo}>
          Between {fromLocation.name} → {toLocation.name}
        </Text>

        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {selectedRec.options.map(renderDiningOption)}
        </ScrollView>
      </View>
    );
  };

  console.log('🍽️ DiningStopSelector: Rendering with state:', {
    visible,
    loading,
    recommendationsCount: recommendations.length,
    selectedMealType,
    selectedOption: selectedOption?.name
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Dining Stop</Text>
            <TouchableOpacity style={styles.headerClose} onPress={onClose}>
              <Text style={styles.headerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ECDC4" />
              <Text style={styles.loadingText}>Finding great dining options...</Text>
            </View>
          ) : recommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No dining options found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your route or check back later
              </Text>
            </View>
          ) : (
            <>
              {renderMealTypeSelector()}
              {renderDiningOptions()}
            </>
          )}
        </View>
      </Modal>

      {renderSelectedOption()}
    </>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCloseText: {
    fontSize: 18,
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
  },
  mealTypeContainer: {
    padding: 20,
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  mealTypeScroll: {
    flexDirection: 'row',
  },
  mealTypeButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMealType: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  mealEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedMealTypeText: {
    color: '#1a1a1a',
  },
  optionsCount: {
    fontSize: 12,
    color: '#cccccc',
  },
  optionsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  routeInfo: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsList: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  optionInfo: {
    flex: 1,
    marginRight: 12,
  },
  optionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionAddress: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  optionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#cccccc',
  },
  priceLevel: {
    fontSize: 14,
  },
  detourInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detourText: {
    fontSize: 12,
    color: '#4ECDC4',
  },
  detourTime: {
    fontSize: 12,
    color: '#4ECDC4',
  },
  optionImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  selectButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  detailModal: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  detailHeader: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'flex-end',
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
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: width,
    height: 250,
  },
  detailInfo: {
    padding: 20,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  detailAddress: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 24,
  },
  detailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailRatingEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  detailRatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 6,
  },
  detailReviewCount: {
    fontSize: 14,
    color: '#cccccc',
  },
  detailPriceLevel: {
    fontSize: 18,
  },
  detailDetour: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detourIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detourLabel: {
    fontSize: 14,
    color: '#cccccc',
    flex: 1,
  },
  detourValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  hoursContainer: {
    marginBottom: 20,
  },
  hoursStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  openNow: {
    color: '#4CAF50',
  },
  closedNow: {
    color: '#F44336',
  },
  detailActions: {
    padding: 20,
    paddingBottom: 40,
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

export default DiningStopSelector;