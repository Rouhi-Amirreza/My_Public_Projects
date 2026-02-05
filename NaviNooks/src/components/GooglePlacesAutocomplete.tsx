import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native';
import GoogleMapsService from '../services/GoogleMapsService';
import DataService from '../services/DataService';
import { PHILADELPHIA_CENTER } from '../utils/constants';

interface GooglePlacesAutocompleteProps {
  placeholder: string;
  value: string;
  onPlaceSelected: (address: string, coordinates?: { lat: number; lng: number }) => void;
  style?: any;
}

interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types?: string[];
}

const { width, height } = Dimensions.get('window');

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  placeholder,
  value,
  onPlaceSelected,
  style,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if we just selected a place
    if (selectedPlaceId) {
      return;
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      if (inputValue && inputValue.length > 2) {
        fetchPredictions(inputValue);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [inputValue, selectedPlaceId]);

  const fetchPredictions = async (input: string) => {
    setIsLoading(true);
    try {
      // Get current city coordinates
      const currentCity = DataService.getCurrentCity();
      const cityCenter = currentCity?.coordinates || PHILADELPHIA_CENTER;
      const cityName = currentCity?.displayName || 'Philadelphia';
      
      // Search for all types of places in the city
      const results = await GoogleMapsService.getPlaceAutocomplete(
        `${input} ${cityName}`,
        {
          lat: cityCenter.latitude,
          lng: cityCenter.longitude
        },
        {
          types: undefined // Remove type restriction to get all places
        }
      );
      
      setPredictions(results);
      if (results.length > 0) {
        setShowPredictions(true);
      } else {
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredictionPress = async (prediction: AutocompletePrediction) => {
    // Set the selected place ID to prevent re-searching
    setSelectedPlaceId(prediction.place_id);
    
    // Update input with selected value
    setInputValue(prediction.description);
    
    // Hide predictions immediately
    setShowPredictions(false);
    setPredictions([]);

    try {
      const placeDetails = await GoogleMapsService.getPlaceDetails(prediction.place_id);
      if (placeDetails) {
        onPlaceSelected(
          placeDetails.formatted_address || prediction.description,
          {
            lat: placeDetails.geometry.location.lat,
            lng: placeDetails.geometry.location.lng
          }
        );
      } else {
        onPlaceSelected(prediction.description);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      onPlaceSelected(prediction.description);
    }
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    // Reset selected place when user types
    if (selectedPlaceId) {
      setSelectedPlaceId(null);
    }
  };

  const handleInputFocus = () => {
    // Only show predictions if we have them and no place is selected
    if (predictions.length > 0 && !selectedPlaceId) {
      setShowPredictions(true);
    }
  };

  const getPlaceIcon = (types?: string[]) => {
    if (!types) return '📍';
    
    if (types.includes('lodging')) return '🏨';
    if (types.includes('restaurant')) return '🍽️';
    if (types.includes('cafe')) return '☕';
    if (types.includes('shopping_mall') || types.includes('store')) return '🛍️';
    if (types.includes('park')) return '🌳';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('school') || types.includes('university')) return '🎓';
    if (types.includes('hospital') || types.includes('doctor')) return '🏥';
    if (types.includes('airport')) return '✈️';
    if (types.includes('train_station') || types.includes('transit_station')) return '🚉';
    if (types.includes('gym')) return '💪';
    if (types.includes('bar') || types.includes('night_club')) return '🍺';
    
    return '📍';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#7f8c8d"
          value={inputValue}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={() => {
            // Small delay to allow tap on predictions
            setTimeout(() => {
              if (!isLoading) {
                setShowPredictions(false);
              }
            }, 150);
          }}
        />
        {isLoading && (
          <ActivityIndicator 
            size="small" 
            color="#3498db" 
            style={styles.loadingIndicator}
          />
        )}
      </View>
      
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsOverlay} pointerEvents="box-none">
          <View style={styles.predictionsContainer} pointerEvents="auto">
            <ScrollView
              style={styles.predictionsList}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {predictions.map(prediction => (
                <TouchableOpacity
                  key={prediction.place_id}
                  style={styles.predictionItem}
                  onPress={() => handlePredictionPress(prediction)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.placeIcon}>
                    {getPlaceIcon(prediction.types)}
                  </Text>
                  <View style={styles.predictionText}>
                    <Text style={styles.predictionMainText} numberOfLines={1}>
                      {prediction.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.predictionSecondaryText} numberOfLines={1}>
                      {prediction.structured_formatting.secondary_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 999,
  },
  
  inputWrapper: {
    position: 'relative',
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  
  textInput: {
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    backgroundColor: 'transparent',
    paddingRight: 45,
    color: '#FFFFFF',
    fontWeight: '500',
    minHeight: 48,
  },
  
  loadingIndicator: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  
  predictionsOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    marginTop: 4,
  },
  
  predictionsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00D9FF',
    maxHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 9999,
      },
    }),
  },
  
  predictionsList: {
    maxHeight: 250,
  },
  
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  placeIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  
  predictionText: {
    flex: 1,
  },
  
  predictionMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  
  predictionSecondaryText: {
    fontSize: 14,
    color: '#98989A',
    lineHeight: 18,
  },
});

export default GooglePlacesAutocomplete;