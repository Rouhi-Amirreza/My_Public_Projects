import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
  Image
} from 'react-native';
import { CityInfo, CityService } from '../services/CityService';

const { width } = Dimensions.get('window');

interface CitySelectorProps {
  onCitySelect: (city: CityInfo) => void;
  selectedCity?: CityInfo | null;
  disabled?: boolean;
}

const CitySelector: React.FC<CitySelectorProps> = ({
  onCitySelect,
  selectedCity,
  disabled = false
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableCities, setAvailableCities] = useState<CityInfo[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableCities();
  }, []);

  useEffect(() => {
    filterCities();
  }, [searchQuery, availableCities]);

  const loadAvailableCities = async () => {
    try {
      setLoading(true);
      const cities = await CityService.getAvailableCities();
      setAvailableCities(cities);
      console.log(`🏙️ CitySelector loaded ${cities.length} cities`);
    } catch (error) {
      console.error('Error loading cities:', error);
      Alert.alert('Error', 'Failed to load available cities');
    } finally {
      setLoading(false);
    }
  };

  const filterCities = async () => {
    try {
      const filtered = await CityService.searchCities(searchQuery);
      setFilteredCities(filtered);
    } catch (error) {
      console.error('Error searching cities:', error);
      setFilteredCities(availableCities);
    }
  };

  const handleCitySelect = (city: CityInfo) => {
    onCitySelect(city);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const openModal = () => {
    if (disabled) return;
    setIsModalVisible(true);
    setSearchQuery('');
  };

  const renderCityItem = ({ item }: { item: CityInfo }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        selectedCity?.id === item.id && styles.selectedCityItem
      ]}
      onPress={() => handleCitySelect(item)}
    >
      <Text style={[
        styles.cityName,
        selectedCity?.id === item.id && styles.selectedCityName
      ]}>
        {item.displayName}
      </Text>
      {selectedCity?.id === item.id && (
        <Text style={styles.selectedIndicator}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* City Selection Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          disabled && styles.disabledButton
        ]}
        onPress={openModal}
        disabled={disabled}
      >
        <Text style={styles.selectorLabel}>📍 City</Text>
        <Text style={[
          styles.selectedCityText,
          !selectedCity && styles.placeholderText
        ]}>
          {selectedCity?.displayName || 'Select a city'}
        </Text>
      </TouchableOpacity>

      {/* City Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                placeholderTextColor="#98989A"
              />
            </View>

            {/* Cities List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading cities...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCities}
                renderItem={renderCityItem}
                keyExtractor={(item) => item.id}
                style={styles.citiesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No cities found' : 'No cities available'}
                    </Text>
                  </View>
                }
              />
            )}

            {/* Cities Info */}
            <Text style={styles.serverNote}>
              🌟 All {availableCities.length} cities available with local data
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Modern Design System for City Selector
const ModernTheme = {
  colors: {
    primary: '#00D9FF',
    background: {
      primary: '#0A0A0B',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1E1E20',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E7',
      tertiary: '#98989A',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
  },
  spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
  radius: { sm: 4, md: 6, lg: 8, xl: 12 },
  typography: {
    h1: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    body: { fontSize: 13, fontWeight: '500' },
    caption: { fontSize: 11, fontWeight: '500' },
    micro: { fontSize: 10, fontWeight: '600' },
  },
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    colored: { shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  },
};

const styles = StyleSheet.create({
  selectorButton: {
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.border,
    borderRadius: ModernTheme.radius.lg,
    padding: ModernTheme.spacing.md,
    marginBottom: ModernTheme.spacing.md,
    ...ModernTheme.shadows.soft,
  },
  
  selectorButtonPressed: {
    backgroundColor: ModernTheme.colors.background.secondary,
    borderColor: ModernTheme.colors.primary,
    ...ModernTheme.shadows.colored,
    transform: [{ scale: 0.98 }],
  },
  
  disabledButton: {
    backgroundColor: ModernTheme.colors.background.secondary,
    opacity: 0.5,
  },
  
  selectorLabel: {
    ...ModernTheme.typography.micro,
    color: ModernTheme.colors.text.tertiary,
    marginBottom: ModernTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  
  selectedCityText: {
    ...ModernTheme.typography.body,
    color: ModernTheme.colors.text.primary,
    fontWeight: 600,
  },
  
  placeholderText: {
    fontSize: 16,
    fontWeight: 500,
    color: ModernTheme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ModernTheme.spacing.lg,
  },
  
  modalContent: {
    backgroundColor: ModernTheme.colors.background.card,
    borderRadius: ModernTheme.radius.xl,
    width: '100%',
    maxHeight: '90%',
    minHeight: '40%',
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.border,
    ...ModernTheme.shadows.medium,
    overflow: 'hidden',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ModernTheme.spacing.xl,
    paddingBottom: ModernTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ModernTheme.colors.glass.border,
    backgroundColor: ModernTheme.colors.glass.background,
  },
  
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: ModernTheme.colors.text.primary,
  },
  
  closeButton: {
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.radius.md,
    padding: ModernTheme.spacing.sm,
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.border,
  },
  
  closeButtonText: {
    fontSize: 14,
    color: ModernTheme.colors.text.secondary,
    fontWeight: 600,
  },
  searchInputContainer: {
    margin: ModernTheme.spacing.xl,
    marginBottom: ModernTheme.spacing.lg,
  },
  
  searchInput: {
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.border,
    borderRadius: ModernTheme.radius.lg,
    padding: ModernTheme.spacing.md,
    fontSize: 13,
    fontWeight: 500,
    color: ModernTheme.colors.text.primary,
    ...ModernTheme.shadows.soft,
    minHeight: 28,
  },
  
  searchInputFocused: {
    borderColor: ModernTheme.colors.primary,
    ...ModernTheme.shadows.colored,
  },
  
  citiesList: {
    flex: 1,
    paddingHorizontal: ModernTheme.spacing.xl,
    paddingBottom: ModernTheme.spacing.xl,
  },
  
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.radius.lg,
    padding: ModernTheme.spacing.md,
    marginBottom: ModernTheme.spacing.sm,
    borderWidth: 1,
    borderColor: ModernTheme.colors.glass.border,
    ...ModernTheme.shadows.soft,
    minHeight: 36,
  },
  
  cityItemPressed: {
    backgroundColor: ModernTheme.colors.background.secondary,
    transform: [{ scale: 0.98 }],
  },
  
  selectedCityItem: {
    backgroundColor: ModernTheme.colors.primary,
    borderColor: ModernTheme.colors.primary,
    ...ModernTheme.shadows.colored,
  },
  
  cityName: {
    fontSize: 13,
    fontWeight: 600,
    color: ModernTheme.colors.text.primary,
    flex: 1,
    letterSpacing: 0.1,
  },
  
  selectedCityName: {
    color: ModernTheme.colors.background.primary,
    fontWeight: 700,
  },
  
  selectedIndicator: {
    color: ModernTheme.colors.background.primary,
    fontSize: 18,
    fontWeight: 700,
  },
  loadingContainer: {
    padding: ModernTheme.spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.radius.lg,
    margin: ModernTheme.spacing.xl,
  },
  
  loadingText: {
    ...ModernTheme.typography.body,
    color: ModernTheme.colors.text.secondary,
    marginTop: ModernTheme.spacing.md,
    fontWeight: 500,
  },
  
  emptyContainer: {
    padding: ModernTheme.spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: ModernTheme.colors.background.tertiary,
    borderRadius: ModernTheme.radius.lg,
    margin: ModernTheme.spacing.xl,
  },
  
  emptyText: {
    fontSize: 16,
    fontWeight: 500,
    color: ModernTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  serverNote: {
    padding: ModernTheme.spacing.lg,
    backgroundColor: ModernTheme.colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: ModernTheme.colors.glass.border,
    fontSize: 12,
    color: '#cccccc', // Light gray for dark theme
    fontStyle: 'italic',
  },
});

export default CitySelector;