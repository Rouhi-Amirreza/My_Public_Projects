import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { PlaceRecommendation } from '../types';
import PlaceImage from './PlaceImage';

const { width, height } = Dimensions.get('window');

// Define category configuration
const CATEGORIES = [
  { 
    key: 'Museums', 
    label: 'Museums', 
    icon: '🏛️',
    keywords: ['museum'],
    nameKeywords: ['museum', 'gallery']
  },
  { 
    key: 'Parks & Nature', 
    label: 'Parks', 
    icon: '🌳',
    keywords: ['park'],
    nameKeywords: ['park', 'garden', 'zoo', 'aquarium', 'nature']
  },
  { 
    key: 'Historic Sites', 
    label: 'Historic', 
    icon: '🏰',
    keywords: ['cemetery', 'church', 'synagogue', 'temple'],
    nameKeywords: ['historic', 'house', 'hall', 'monument', 'memorial', 'liberty', 'independence', 'national']
  },
  { 
    key: 'Cultural Attractions', 
    label: 'Cultural', 
    icon: '🎭',
    keywords: ['library', 'university', 'school'],
    nameKeywords: ['center', 'institute', 'cultural', 'academy', 'college']
  },
  { 
    key: 'Entertainment', 
    label: 'Entertainment', 
    icon: '🎪',
    keywords: ['amusement_park', 'stadium', 'casino', 'night_club', 'movie_theater'],
    nameKeywords: ['theater', 'theatre', 'stadium', 'arena', 'casino']
  },
  { 
    key: 'Other Attractions', 
    label: 'Other', 
    icon: '📍',
    keywords: ['tourist_attraction'],
    nameKeywords: []
  }
];

interface PlaceChangeSelectorProps {
  visible: boolean;
  onClose: () => void;
  currentPlace: PlaceRecommendation;
  alternatives: any[];
  visitTime: string;
  visitDate?: Date;
  onPlaceSelected: (place: any) => void;
  loading: boolean;
  currentItinerary: any; // Full itinerary to check for existing places
}

const PlaceChangeSelector: React.FC<PlaceChangeSelectorProps> = ({
  visible,
  onClose,
  currentPlace,
  alternatives,
  visitTime,
  visitDate,
  onPlaceSelected,
  loading,
  currentItinerary,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Museums');
  const [categorizedPlaces, setCategorizedPlaces] = useState<Record<string, any[]>>({});

  // Check if a place is already in the itinerary
  const isPlaceInItinerary = (placeId: string): { inItinerary: boolean; dayInfo?: string } => {
    if (!currentItinerary) return { inItinerary: false };

    // Check if it's a multi-day itinerary
    if (currentItinerary.dailyItineraries) {
      // Multi-day itinerary
      for (let dayIndex = 0; dayIndex < currentItinerary.dailyItineraries.length; dayIndex++) {
        const day = currentItinerary.dailyItineraries[dayIndex];
        const foundInSchedule = day.schedule?.some((item: any) => item.place.place_id === placeId);
        if (foundInSchedule) {
          return { 
            inItinerary: true, 
            dayInfo: `Day ${day.day || dayIndex + 1}` 
          };
        }
      }
    } else {
      // Single-day itinerary
      const foundInSchedule = currentItinerary.schedule?.some((item: any) => item.place.place_id === placeId);
      if (foundInSchedule) {
        return { 
          inItinerary: true, 
          dayInfo: 'Today' 
        };
      }
    }

    return { inItinerary: false };
  };

  // Categorize places when alternatives change
  useEffect(() => {
    if (alternatives.length > 0) {
      const categories: Record<string, any[]> = {};
      
      // Initialize categories
      CATEGORIES.forEach(cat => {
        categories[cat.key] = [];
      });

      alternatives.forEach(place => {
        const types = place.types || [];
        let categorized = false;

        // Check if place is already in itinerary
        const itineraryStatus = isPlaceInItinerary(place.place_id);
        
        // Add itinerary status to place object
        const enrichedPlace = {
          ...place,
          inItinerary: itineraryStatus.inItinerary,
          itineraryDayInfo: itineraryStatus.dayInfo
        };

        // Debug log for the first few places
        if (alternatives.indexOf(place) < 3) {
          console.log('🔍 DEBUG - Place categorization:', {
            name: place.name,
            types: types,
            address: place.address,
            inItinerary: itineraryStatus.inItinerary,
            dayInfo: itineraryStatus.dayInfo
          });
        }

        // Check each category (except "Other")
        for (const category of CATEGORIES.slice(0, -1)) {
          // Check if place types match category keywords (exact match)
          const matchesType = types.some((type: string) => 
            category.keywords.some(keyword => 
              type.toLowerCase() === keyword.toLowerCase()
            )
          );
          
          // Check if place name contains category keywords
          const matchesName = category.nameKeywords.some(keyword =>
            place.name.toLowerCase().includes(keyword.toLowerCase())
          );

          if (matchesType || matchesName) {
            categories[category.key].push(enrichedPlace);
            categorized = true;
            
            // Debug log for successful categorization
            if (alternatives.indexOf(place) < 3) {
              console.log(`✅ Categorized "${place.name}" as ${category.key}:`, {
                matchesType,
                matchesName,
                matchedKeywords: matchesType ? category.keywords.filter(k => types.some(t => t.toLowerCase() === k.toLowerCase())) : [],
                matchedNameKeywords: matchesName ? category.nameKeywords.filter(k => place.name.toLowerCase().includes(k.toLowerCase())) : []
              });
            }
            break;
          }
        }

        // Default to "Other" if not categorized
        if (!categorized) {
          categories['Other Attractions'].push(enrichedPlace);
          
          // Debug log for uncategorized places
          if (alternatives.indexOf(place) < 3) {
            console.log(`📍 "${place.name}" went to Other Attractions - types:`, types);
          }
        }
      });

      // Sort places within each category (open first, then by rating)
      Object.keys(categories).forEach(categoryKey => {
        categories[categoryKey].sort((a, b) => {
          // Sort available places first (not in itinerary)
          if (!a.inItinerary && b.inItinerary) return -1;
          if (a.inItinerary && !b.inItinerary) return 1;
          
          // Then sort open places first
          if (a.isOpen && !b.isOpen) return -1;
          if (!a.isOpen && b.isOpen) return 1;
          
          // Finally sort by rating
          const aScore = (a.rating || 0) * Math.log(a.user_ratings_total || 1);
          const bScore = (b.rating || 0) * Math.log(b.user_ratings_total || 1);
          return bScore - aScore;
        });
      });

      // Remove empty categories
      const filteredCategories = Object.fromEntries(
        Object.entries(categories).filter(([, places]) => places.length > 0)
      );

      // Debug log final categorization results
      console.log('📊 Final categorization results:', 
        Object.entries(filteredCategories).map(([cat, places]) => 
          `${cat}: ${places.length} places`
        ).join(', ')
      );

      setCategorizedPlaces(filteredCategories);
      
      // Set first available category as selected
      const availableCategories = Object.keys(filteredCategories);
      if (availableCategories.length > 0) {
        setSelectedCategory(availableCategories[0]);
      }
    }
  }, [alternatives]);

  const renderCategoryTabs = () => (
    <View style={styles.tabContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
      >
        {Object.keys(categorizedPlaces).map((categoryKey) => {
          const category = CATEGORIES.find(cat => cat.key === categoryKey);
          const placesCount = categorizedPlaces[categoryKey]?.length || 0;
          
          if (!category || placesCount === 0) return null;

          return (
            <TouchableOpacity
              key={categoryKey}
              style={[
                styles.categoryTab,
                selectedCategory === categoryKey && styles.selectedCategoryTab
              ]}
              onPress={() => setSelectedCategory(categoryKey)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === categoryKey && styles.selectedCategoryText
              ]}>
                {category.label}
              </Text>
              <Text style={styles.categoryCount}>{placesCount}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderPlaceCard = (place: any, index: number) => {
    const isDisabled = !place.isOpen || place.inItinerary;

    return (
      <TouchableOpacity
        key={`${selectedCategory}-${place.place_id}-${index}`}
        style={[
          styles.placeCard,
          !place.isOpen && styles.placeCardClosed,
          place.inItinerary && styles.placeCardInItinerary
        ]}
        onPress={() => !isDisabled && onPlaceSelected(place)}
        activeOpacity={!isDisabled ? 0.7 : 1}
        disabled={isDisabled}
      >
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <View style={styles.placeNameRow}>
              <Text style={[
                styles.placeName,
                !place.isOpen && styles.placeNameClosed,
                place.inItinerary && styles.placeNameInItinerary
              ]} numberOfLines={2}>
                {place.name}
              </Text>
              {!place.isOpen && (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>CLOSED</Text>
                </View>
              )}
              {place.inItinerary && (
                <View style={styles.inItineraryBadge}>
                  <Text style={styles.inItineraryBadgeText}>IN ITINERARY</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.placeAddress,
              !place.isOpen && styles.placeAddressClosed,
              place.inItinerary && styles.placeAddressInItinerary
            ]} numberOfLines={1}>
              {place.address}
            </Text>
            {!place.isOpen && place.closedReason && (
              <Text style={styles.closedReason}>
                {place.closedReason} (Visit: {visitDate?.toLocaleDateString('en-US', { weekday: 'long' })} at {visitTime})
              </Text>
            )}
            {place.inItinerary && place.itineraryDayInfo && (
              <Text style={styles.itineraryReason}>
                Already in your itinerary ({place.itineraryDayInfo})
              </Text>
            )}
            <View style={styles.placeDetails}>
              <Text style={[
                styles.placeRating,
                !place.isOpen && styles.placeRatingClosed,
                place.inItinerary && styles.placeRatingInItinerary
              ]}>
                ⭐ {place.rating?.toString() || '0'}
              </Text>
              <Text style={[
                styles.placeReviews,
                !place.isOpen && styles.placeReviewsClosed,
                place.inItinerary && styles.placeReviewsInItinerary
              ]}>
                ({place.user_ratings_total || 0})
              </Text>
              {place.price_level && (
                <Text style={[
                  styles.placePrice,
                  !place.isOpen && styles.placePriceClosed,
                  place.inItinerary && styles.placePriceInItinerary
                ]}>
                  {'$'.repeat(place.price_level)}
                </Text>
              )}
            </View>
          </View>
          <View style={[
            styles.placeImageContainer,
            !place.isOpen && styles.placeImageClosed,
            place.inItinerary && styles.placeImageInItinerary
          ]}>
            <PlaceImage 
              place={place} 
              width={60} 
              height={60} 
              borderRadius={8}
            />
          </View>
        </View>
        <View style={[
          styles.selectButton,
          !place.isOpen && styles.selectButtonClosed,
          place.inItinerary && styles.selectButtonInItinerary
        ]}>
          <Text style={[
            styles.selectButtonText,
            !place.isOpen && styles.selectButtonTextClosed,
            place.inItinerary && styles.selectButtonTextInItinerary
          ]}>
            {place.inItinerary 
              ? 'Already in Itinerary' 
              : place.isOpen 
                ? 'Select This Place' 
                : 'Currently Closed'
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalIcon}>⇄</Text>
            <Text style={styles.modalTitle}>Change Place</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={onClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.currentPlaceSection}>
            <Text style={styles.currentPlaceTitle}>Currently Selected:</Text>
            <View style={styles.currentPlaceCard}>
              <Text style={styles.currentPlaceName}>{currentPlace.name}</Text>
              <Text style={styles.currentPlaceAddress}>{currentPlace.address}</Text>
              <Text style={styles.currentPlaceRating}>⭐ {currentPlace.rating?.toString() || '0'}</Text>
            </View>
          </View>

          {renderCategoryTabs()}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00D9FF" />
              <Text style={styles.loadingText}>Finding alternatives...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.placesScrollView} 
              showsVerticalScrollIndicator={false}
            >
              {categorizedPlaces[selectedCategory]?.map((place, index) => renderPlaceCard(place, index))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Professional Dark Theme Color System
const Colors = {
  primary: '#00D9FF',
  primaryDark: '#00B8CC',
  secondary: '#7C4DFF',
  background: {
    primary: '#0A0A0B',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
    quaternary: '#3A3A3C',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#ADADB8',
    tertiary: '#98989A',
  },
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.85,
    paddingTop: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.quaternary,
  },

  modalIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCloseText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
  },

  currentPlaceSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.quaternary,
  },

  currentPlaceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },

  currentPlaceCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 12,
  },

  currentPlaceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },

  currentPlaceAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 6,
  },

  currentPlaceRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },

  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.quaternary,
    paddingVertical: 12,
  },

  tabScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },

  categoryTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.background.tertiary,
    minWidth: 80,
  },

  selectedCategoryTab: {
    backgroundColor: Colors.primary,
  },

  categoryIcon: {
    fontSize: 16,
    marginBottom: 4,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 2,
  },

  selectedCategoryText: {
    color: '#000000',
  },

  categoryCount: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },

  placesScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  placeCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.background.quaternary,
  },

  placeCardClosed: {
    opacity: 0.6,
    borderColor: '#8E8E93',
  },

  placeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  placeInfo: {
    flex: 1,
    marginRight: 12,
  },

  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },

  placeNameClosed: {
    color: '#8E8E93',
  },

  placeAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 6,
  },

  placeAddressClosed: {
    color: '#636366',
  },

  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  placeRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },

  placeRatingClosed: {
    color: '#8E8E93',
  },

  placeReviews: {
    fontSize: 12,
    color: Colors.text.secondary,
  },

  placeReviewsClosed: {
    color: '#636366',
  },

  placePrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#30D158',
  },

  placePriceClosed: {
    color: '#8E8E93',
  },

  placeImageContainer: {
    // Default styles for image container
  },

  placeImageClosed: {
    opacity: 0.5,
  },

  closedBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },

  closedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  closedReason: {
    fontSize: 11,
    color: '#FF9F0A',
    fontStyle: 'italic',
    marginBottom: 4,
  },

  selectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  selectButtonClosed: {
    backgroundColor: '#48484A',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },

  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },

  selectButtonTextClosed: {
    color: '#8E8E93',
  },

  // In itinerary styles
  placeCardInItinerary: {
    opacity: 0.7,
    backgroundColor: '#2A2A2A',
    borderColor: '#FF9500',
    borderWidth: 1,
  },

  placeNameInItinerary: {
    color: '#8E8E93',
  },

  placeAddressInItinerary: {
    color: '#636366',
  },

  placeRatingInItinerary: {
    color: '#8E8E93',
  },

  placeReviewsInItinerary: {
    color: '#636366',
  },

  placePriceInItinerary: {
    color: '#8E8E93',
  },

  placeImageInItinerary: {
    opacity: 0.5,
  },

  inItineraryBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },

  inItineraryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  itineraryReason: {
    fontSize: 11,
    color: '#FF9500',
    fontStyle: 'italic',
    marginBottom: 4,
  },

  selectButtonInItinerary: {
    backgroundColor: '#48484A',
    borderWidth: 1,
    borderColor: '#FF9500',
  },

  selectButtonTextInItinerary: {
    color: '#FF9500',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
});

export default PlaceChangeSelector;