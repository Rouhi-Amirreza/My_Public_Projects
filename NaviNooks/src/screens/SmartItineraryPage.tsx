import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ImageBackground,
  Dimensions,
  Modal,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import GooglePlacesAutocomplete from '../components/GooglePlacesAutocomplete';
import CitySelector from '../components/CitySelector';
import { INTEREST_CATEGORIES } from '../utils/constants';
import { ItineraryFormData, DailySchedule } from '../types';
import { CityInfo } from '../services/CityService';
import DataService from '../services/DataService';
import CityThemeService, { CityTheme } from '../services/CityThemeService';
import CityImageService from '../services/CityImageService';

// Format a Date object as YYYY-MM-DD using local time to avoid timezone shifts
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get tomorrow's date as default
const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateLocal(tomorrow);
};

// Get current time in HH:MM format
const getCurrentTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Check if a date is today
const isToday = (dateString: string): boolean => {
  const today = formatDateLocal(new Date());
  return dateString === today;
};

const { height } = Dimensions.get('window');

interface SmartItineraryPageProps {
  onGenerateItinerary: (formData: ItineraryFormData) => void;
  initialFormData?: ItineraryFormData | null;
}

const SmartItineraryPage: React.FC<SmartItineraryPageProps> = ({
  onGenerateItinerary,
  initialFormData,
}) => {
  const [formData, setFormData] = useState<ItineraryFormData>(
    initialFormData || {
      startingAddress: '',
      returnAddress: '',
      differentReturnLocation: false,
      numberOfDays: 1,
      useUniformSchedule: true,
      startTime: '09:00',
      date: getTomorrowDate(), // Default to tomorrow instead of today
      availableHours: 8,
      dailySchedules: [],
      selectedInterests: INTEREST_CATEGORIES.map(cat => cat.id),
      optimizationLevel: 'balanced',
      selectedCityId: undefined,
    }
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showHoursPicker, setShowHoursPicker] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showDaysPicker, setShowDaysPicker] = useState(false);
  const [activeDayForPicker, setActiveDayForPicker] = useState<number | null>(null);
  const hoursScrollViewRef = React.useRef<ScrollView>(null);
  const minutesScrollViewRef = React.useRef<ScrollView>(null);
  
  // City selection state
  const [selectedCity, setSelectedCity] = useState<CityInfo | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<CityTheme>(CityThemeService.getTheme('philadelphia'));
  const [cityBackgroundImage, setCityBackgroundImage] = useState<any>(CityImageService.getDefaultBackground());
  
  // Effect to restore form data when coming back from results
  useEffect(() => {
    if (initialFormData) {
      console.log('🔄 Restoring form data:', initialFormData);
      setFormData(initialFormData);
      
      // Restore selected city if it was previously selected
      if (initialFormData.selectedCityId) {
        restoreSelectedCity(initialFormData.selectedCityId);
      }
    }
  }, [initialFormData]);
  
  const restoreSelectedCity = async (cityId: string) => {
    try {
      // Import CityService to get city by ID
      const { CityService } = await import('../services/CityService');
      const cities = await CityService.getAvailableCities();
      const city = cities.find(c => c.id === cityId);
      
      if (city) {
        console.log(`🔄 Restoring selected city: ${city.displayName}`);
        setCityLoading(true);
        
        // Load city data
        const success = await DataService.loadCityData(city.id);
        
        if (success) {
          setSelectedCity(city);
          // Update theme based on selected city
          const newTheme = CityThemeService.getTheme(city.id);
          setCurrentTheme(newTheme);
          
          // Load city background image
          const imageSource = CityImageService.getCityImageSource(city.id);
          setCityBackgroundImage(imageSource);
          
          console.log(`✅ Successfully restored city: ${city.displayName}`);
        }
      }
    } catch (error) {
      console.warn('Failed to restore selected city:', error);
    } finally {
      setCityLoading(false);
    }
  };
  

  const handleCitySelect = async (city: CityInfo) => {
    try {
      setCityLoading(true);
      console.log(`🏙️ User selected city: ${city.displayName}`);
      
      // Load city data
      const success = await DataService.loadCityData(city.id);
      
      if (success) {
        setSelectedCity(city);
        // Update theme based on selected city
        const newTheme = CityThemeService.getTheme(city.id);
        setCurrentTheme(newTheme);
        
        // Load city background image
        const imageSource = CityImageService.getCityImageSource(city.id);
        setCityBackgroundImage(imageSource);
        
        // Save selected city ID in form data for persistence
        setFormData(prev => ({ ...prev, selectedCityId: city.id }));
        
        console.log(`✅ Successfully loaded data for ${city.displayName}`);
      } else {
        Alert.alert(
          'Error', 
          `Failed to load data for ${city.displayName}. Please try again.`
        );
      }
    } catch (error) {
      console.error('Error loading city data:', error);
      Alert.alert(
        'Error', 
        `Failed to load data for ${city.displayName}. Please try again.`
      );
    } finally {
      setCityLoading(false);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    console.log('🎯 Toggling interest:', interestId);
    setFormData(prev => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(interestId)
        ? prev.selectedInterests.filter(id => id !== interestId)
        : [...prev.selectedInterests, interestId]
    }));
  };

  const handleStartAddressSelected = (address: string) => {
    setFormData(prev => ({ ...prev, startingAddress: address }));
  };

  const handleReturnAddressSelected = (address: string) => {
    setFormData(prev => ({ ...prev, returnAddress: address }));
  };

  const generateDailySchedules = (
    numberOfDays: number,
    baseDate: string,
    startTime: string,
    availableHours: number
  ): DailySchedule[] => {
    const schedules: DailySchedule[] = [];
    for (let i = 0; i < numberOfDays; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      schedules.push({
        day: i + 1,
        date: formatDateLocal(date),
        startTime,
        availableHours,
      });
    }
    return schedules;
  };

  const handleNumberOfDaysChange = (days: number) => {
    setFormData(prev => {
      const newSchedules = generateDailySchedules(days, prev.date, prev.startTime, prev.availableHours);
      return {
        ...prev,
        numberOfDays: days,
        dailySchedules: newSchedules,
      };
    });
  };

  const handleUniformScheduleToggle = () => {
    setFormData(prev => {
      if (!prev.useUniformSchedule) {
        // Switching to uniform - update all daily schedules to match main schedule
        const newSchedules = generateDailySchedules(prev.numberOfDays, prev.date, prev.startTime, prev.availableHours);
        return {
          ...prev,
          useUniformSchedule: true,
          dailySchedules: newSchedules,
        };
      } else {
        // Switching to custom - keep existing daily schedules
        return {
          ...prev,
          useUniformSchedule: false,
        };
      }
    });
  };

  const handleDailyScheduleUpdate = (day: number, field: keyof DailySchedule, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      dailySchedules: prev.dailySchedules.map(schedule =>
        schedule.day === day ? { ...schedule, [field]: value } : schedule
      ),
    }));
  };

  const handleGenerateItinerary = () => {
    // First check if a city is selected
    if (!selectedCity) {
      Alert.alert('Error', 'Please select a city first');
      return;
    }
    
    if (!formData.startingAddress.trim()) {
      Alert.alert('Error', 'Please enter a starting address');
      return;
    }
    if (formData.differentReturnLocation && !formData.returnAddress?.trim()) {
      Alert.alert('Error', 'Please enter a return address or uncheck the return location option');
      return;
    }
    if (formData.selectedInterests.length === 0) {
      Alert.alert('Error', 'Please select at least one interest');
      return;
    }
    if (formData.numberOfDays < 1 || formData.numberOfDays > 7) {
      Alert.alert('Error', 'Number of days must be between 1 and 7');
      return;
    }

    // Validate date and time - ensure time is valid for selected date
    if (isToday(formData.date)) {
      const currentTime = getCurrentTime();
      const selectedTime = formData.startTime;
      
      if (selectedTime <= currentTime) {
        Alert.alert(
          'Invalid Time', 
          'For today\'s date, please select a time at least 1 hour from now.',
          [
            { text: 'OK', onPress: () => setShowTimePicker(true) }
          ]
        );
        return;
      }
    }
    
    // Validate uniform schedule
    if (formData.useUniformSchedule) {
      if (formData.availableHours < 1 || formData.availableHours > 16) {
        Alert.alert('Error', 'Available hours must be between 1 and 16 hours');
        return;
      }
    } else {
      // Validate each daily schedule
      for (const schedule of formData.dailySchedules) {
        if (schedule.availableHours < 1 || schedule.availableHours > 16) {
          Alert.alert('Error', `Day ${schedule.day}: Available hours must be between 1 and 16 hours`);
          return;
        }
      }
    }
    
    // Ensure daily schedules are populated
    if (formData.dailySchedules.length === 0) {
      const newSchedules = generateDailySchedules(formData.numberOfDays, formData.date, formData.startTime, formData.availableHours);
      setFormData(prev => ({ ...prev, dailySchedules: newSchedules }));
      setTimeout(() => onGenerateItinerary({ ...formData, dailySchedules: newSchedules }), 100);
    } else {
      onGenerateItinerary(formData);
    }
  };


  return (
    <View style={[styles.container, { overflow: 'visible' }]}>
      {/* Compact Hero Section for Tab Interface */}
      <ImageBackground
        source={selectedCity ? cityBackgroundImage : CityImageService.getDefaultBackground()}
        style={styles.heroContainer}
        imageStyle={styles.heroImageStyle}
        onError={(error) => console.log('Image load error')}
        onLoad={() => console.log('Image loaded')}
      >
        <View style={styles.heroContentCenter}>
          <View style={styles.heroTextOverlay}>
            <Text style={styles.heroTitle}>
              {selectedCity ? `${currentTheme.signature.icon} ${selectedCity.displayName}` : 'NaviNooks'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {selectedCity ? (selectedCity.phrase || currentTheme.signature.tagline) : 'Travel concierge in your pocket'}
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* Optimized Form Container for Tab */}
      <ScrollView 
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, overflow: 'visible' }}
        nestedScrollEnabled={true}
      >
        {/* City Selection Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>🏙️</Text>
              </View>
              <Text style={styles.sectionTitle}>Choose Your City</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select your destination city to start planning your perfect itinerary
            </Text>
            <CitySelector
              onCitySelect={handleCitySelect}
              selectedCity={selectedCity}
              disabled={cityLoading}
            />
            {cityLoading && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Loading city data...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Location Section */}
        <View style={[styles.sectionContainer, { zIndex: 1000, overflow: 'visible', position: 'relative' }]}>
          <View style={[styles.sectionCard, { overflow: 'visible', zIndex: 1000, position: 'relative' }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>📍</Text>
              </View>
              <Text style={styles.sectionTitle}>Starting Location</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Where would you like to begin your adventure?
            </Text>
            <View style={[styles.inputGroup, { zIndex: 2000, position: 'relative' }]}>
              <Text style={styles.inputLabel}>Starting Address</Text>
              <View style={[styles.inputContainer, { zIndex: 2000, position: 'relative' }]}>
                <GooglePlacesAutocomplete
                  placeholder={selectedCity 
                    ? `Enter your starting location in ${selectedCity.displayName}`
                    : "Select a city first, then enter your starting location"
                  }
                  value={formData.startingAddress}
                  onPlaceSelected={handleStartAddressSelected}
                />
              </View>
            </View>

            {/* Return Location Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Different return location?</Text>
              <TouchableOpacity 
                style={[
                  styles.interactiveButton, 
                  formData.differentReturnLocation && styles.interactiveButtonPressed
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  differentReturnLocation: !prev.differentReturnLocation,
                  returnAddress: !prev.differentReturnLocation ? prev.returnAddress : ''
                }))}
              >
                <View style={styles.interactiveButtonContent}>
                  <Text style={styles.interactiveButtonText}>
                    {formData.differentReturnLocation ? 'Yes' : 'No'}
                  </Text>
                  <Text style={styles.interactiveButtonIcon}>
                    {formData.differentReturnLocation ? '✓' : '→'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Return Address - Show only if enabled */}
            {formData.differentReturnLocation && (
              <View style={[styles.inputGroup, { zIndex: 2000, position: 'relative' }]}>
                <Text style={styles.inputLabel}>Return Address</Text>
                <View style={[styles.inputContainer, { zIndex: 2000, position: 'relative' }]}>
                  <GooglePlacesAutocomplete
                    placeholder="Enter your return location"
                    value={formData.returnAddress || ''}
                    onPlaceSelected={handleReturnAddressSelected}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Schedule Section */}
        <View style={[styles.sectionContainer, { zIndex: 1 }]}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>⏰</Text>
              </View>
              <Text style={styles.sectionTitle}>Schedule Details</Text>
            </View>
            <Text style={styles.sectionDescription}>
              When would you like to explore and for how long?
            </Text>
            
            {/* Date and Time Grid */}
            <View style={styles.pickerGrid}>
              <TouchableOpacity
                style={styles.pickerCard}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerCardTitle}>Date</Text>
                <Text style={styles.pickerCardValue}>
                  {(() => {
                    const [year, month, day] = formData.date.split('-').map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  })()}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.pickerCard}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.pickerCardTitle}>Start Time</Text>
                <Text style={styles.pickerCardValue}>{formData.startTime}</Text>
              </TouchableOpacity>
            </View>

            {/* Duration Grid */}
            <View style={styles.pickerGrid}>
              <TouchableOpacity
                style={styles.pickerCard}
                onPress={() => setShowDaysPicker(true)}
              >
                <Text style={styles.pickerCardTitle}>Duration</Text>
                <Text style={styles.pickerCardValue}>
                  {formData.numberOfDays} {formData.numberOfDays === 1 ? 'day' : 'days'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.pickerCard}
                onPress={() => setShowHoursPicker(true)}
              >
                <Text style={styles.pickerCardTitle}>Available Time</Text>
                <Text style={styles.pickerCardValue}>
                  {Math.floor(formData.availableHours)}h {Math.round((formData.availableHours % 1) * 60)}m
                </Text>
              </TouchableOpacity>
            </View>

            {/* Uniform Schedule Toggle */}
            <View style={[styles.inputGroup, { marginTop: DesignSystem.spacing.lg }]}>
              <Text style={styles.inputLabel}>Use same schedule for all days?</Text>
              <TouchableOpacity 
                style={[
                  styles.interactiveButton, 
                  formData.useUniformSchedule && styles.interactiveButtonPressed
                ]}
                onPress={handleUniformScheduleToggle}
              >
                <View style={styles.interactiveButtonContent}>
                  <Text style={styles.interactiveButtonText}>
                    {formData.useUniformSchedule ? 'Yes' : 'Custom'}
                  </Text>
                  <Text style={styles.interactiveButtonIcon}>
                    {formData.useUniformSchedule ? '✓' : '⚙️'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Custom Daily Schedules */}
        {!formData.useUniformSchedule && formData.dailySchedules.length > 0 && (
          <View style={styles.dailySchedulesContainer}>
            <Text style={styles.dailySchedulesTitle}>📋 Custom Daily Schedules</Text>
            {formData.dailySchedules.map((schedule) => (
              <View key={schedule.day} style={styles.dailyScheduleCard}>
                <Text style={styles.dailyScheduleTitle}>
                  Day {schedule.day} - {(() => {
                    const [year, month, day] = schedule.date.split('-').map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString();
                  })()}
                </Text>
                
                <View style={styles.dailyScheduleRow}>
                  <View style={[styles.timeInputContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.dailyScheduleLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.dailyTimeButton}
                      onPress={() => {
                        setActiveDayForPicker(schedule.day);
                        setShowTimePicker(true);
                      }}
                    >
                      <Text style={styles.dailyTimeText}>{schedule.startTime}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.timeInputContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.dailyScheduleLabel}>Hours</Text>
                    <TouchableOpacity
                      style={styles.dailyTimeButton}
                      onPress={() => {
                        setActiveDayForPicker(schedule.day);
                        setShowHoursPicker(true);
                      }}
                    >
                      <Text style={styles.dailyTimeText}>
                        {Math.floor(schedule.availableHours)}h {Math.round((schedule.availableHours % 1) * 60)}m
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Interests Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>🎯</Text>
              </View>
              <Text style={styles.sectionTitle}>Your Interests</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose what you'd like to explore during your trip
            </Text>
            
            <TouchableOpacity
              style={styles.interactiveButton}
              onPress={() => {
                console.log('🎯 Opening interests modal, categories:', INTEREST_CATEGORIES.length);
                setShowInterestsModal(true);
              }}
            >
              <View style={styles.interactiveButtonContent}>
                <Text style={styles.interactiveButtonText}>
                  {formData.selectedInterests.length === INTEREST_CATEGORIES.length 
                    ? 'All Interests Selected' 
                    : `${formData.selectedInterests.length} of ${INTEREST_CATEGORIES.length} Selected`}
                </Text>
                <Text style={styles.interactiveButtonIcon}>⚙️</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Optimization Level Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>⚡</Text>
              </View>
              <Text style={styles.sectionTitle}>Optimization Level</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose how detailed you want your itinerary to be
            </Text>
            
            <View style={styles.optimizationContainer}>
              {[
                { key: 'fast', label: 'Fast', desc: 'Quick results' },
                { key: 'balanced', label: 'Balanced', desc: 'Best overall' },
                { key: 'thorough', label: 'Thorough', desc: 'Most detailed' }
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optimizationButton,
                    formData.optimizationLevel === option.key && styles.optimizationButtonSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, optimizationLevel: option.key as any }))}
                >
                  <Text style={[
                    styles.optimizationText,
                    formData.optimizationLevel === option.key && styles.optimizationTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optimizationDesc,
                    formData.optimizationLevel === option.key && styles.optimizationDescSelected
                  ]}>
                    {option.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Modern Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleGenerateItinerary}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>🚀</Text>
          <Text style={styles.fabText}>Generate My Itinerary</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <DatePicker
        modal
        open={showDatePicker}
        date={(() => {
          const [year, month, day] = formData.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })()}
        mode="date"
        minimumDate={(() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        })()}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setFormData(prev => ({ ...prev, date: formatDateLocal(date) }));
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Time Picker Modal */}
      <DatePicker
        modal
        open={showTimePicker}
        date={new Date(`2000-01-01T${activeDayForPicker ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.startTime || formData.startTime : formData.startTime}:00`)}
        mode="time"
        minimumDate={(() => {
          // If selected date is today, set minimum time to current time + 1 hour
          const selectedDate = activeDayForPicker 
            ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.date || formData.date
            : formData.date;
          
          if (isToday(selectedDate)) {
            const now = new Date();
            now.setHours(now.getHours() + 1); // Add 1 hour buffer
            return now;
          }
          return new Date('2000-01-01T00:00:00'); // No minimum for future dates
        })()}
        onConfirm={(time) => {
          setShowTimePicker(false);
          const timeString = time.toTimeString().slice(0, 5);
          if (activeDayForPicker) {
            handleDailyScheduleUpdate(activeDayForPicker, 'startTime', timeString);
            setActiveDayForPicker(null);
          } else {
            setFormData(prev => ({ ...prev, startTime: timeString }));
          }
        }}
        onCancel={() => {
          setShowTimePicker(false);
          setActiveDayForPicker(null);
        }}
      />

      {/* Hours Picker Modal */}
      <Modal
        visible={showHoursPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHoursPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Hours</Text>
              <Text style={styles.modalSubtitle}>Select hours and minutes</Text>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hours</Text>
                <ScrollView 
                  ref={hoursScrollViewRef}
                  style={styles.picker}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  onLayout={() => {
                    // Scroll to the correct position when the picker opens
                    const currentHours = activeDayForPicker 
                      ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.availableHours || 0 
                      : formData.availableHours;
                    const selectedHour = Math.floor(currentHours);
                    const scrollPosition = selectedHour * 40; // 40 is the snapToInterval
                    setTimeout(() => {
                      hoursScrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
                    }, 100);
                  }}
                >
                  {Array.from({length: 17}, (_, i) => {
                    // Calculate which hour should be selected
                    const currentHours = activeDayForPicker 
                      ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.availableHours || 0 
                      : formData.availableHours;
                    const selectedHour = Math.floor(currentHours);
                    const isSelected = selectedHour === i;
                    
                    // Debug logging for the first time the picker opens
                    if (i === 0 && !activeDayForPicker) {
                      console.log('🔍 Hours Picker Debug:', {
                        formDataAvailableHours: formData.availableHours,
                        selectedHour,
                        isSelected,
                        shouldShowAsSelected: isSelected
                      });
                    }
                    
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.pickerItem,
                          isSelected && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          if (activeDayForPicker) {
                            const currentSchedule = formData.dailySchedules.find(s => s.day === activeDayForPicker);
                            const currentMinutes = currentSchedule ? (currentSchedule.availableHours % 1) * 60 : 0;
                            handleDailyScheduleUpdate(activeDayForPicker, 'availableHours', i + (currentMinutes / 60));
                          } else {
                            const currentMinutes = (formData.availableHours % 1) * 60;
                            setFormData(prev => ({ 
                              ...prev, 
                              availableHours: i + (currentMinutes / 60)
                            }));
                          }
                        }}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected
                        ]}>
                          {i}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minutes</Text>
                <ScrollView 
                  ref={minutesScrollViewRef}
                  style={styles.picker}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  onLayout={() => {
                    // Scroll to the correct position when the picker opens
                    const currentHours = activeDayForPicker 
                      ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.availableHours || 0 
                      : formData.availableHours;
                    const selectedMinutes = Math.round((currentHours % 1) * 60);
                    const minuteIndex = [0, 15, 30, 45].indexOf(selectedMinutes);
                    const scrollPosition = minuteIndex * 40; // 40 is the snapToInterval
                    setTimeout(() => {
                      minutesScrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
                    }, 100);
                  }}
                >
                  {[0, 15, 30, 45].map((minutes) => {
                    // Calculate which minute should be selected
                    const currentHours = activeDayForPicker 
                      ? formData.dailySchedules.find(s => s.day === activeDayForPicker)?.availableHours || 0 
                      : formData.availableHours;
                    const selectedMinutes = Math.round((currentHours % 1) * 60);
                    const isSelected = selectedMinutes === minutes;
                    
                    return (
                      <TouchableOpacity
                        key={minutes}
                        style={[
                          styles.pickerItem,
                          isSelected && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          if (activeDayForPicker) {
                            const currentSchedule = formData.dailySchedules.find(s => s.day === activeDayForPicker);
                            const currentHours = currentSchedule ? Math.floor(currentSchedule.availableHours) : 0;
                            handleDailyScheduleUpdate(activeDayForPicker, 'availableHours', currentHours + (minutes / 60));
                          } else {
                            const currentHours = Math.floor(formData.availableHours);
                            setFormData(prev => ({ 
                              ...prev, 
                              availableHours: currentHours + (minutes / 60)
                            }));
                          }
                        }}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected
                        ]}>
                          {minutes.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowHoursPicker(false);
                  setActiveDayForPicker(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => {
                  setShowHoursPicker(false);
                  setActiveDayForPicker(null);
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Number of Days Picker Modal */}
      <Modal
        visible={showDaysPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDaysPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Number of Days</Text>
              <Text style={styles.modalSubtitle}>Select number of days for your trip</Text>
            </View>
            
            <View style={styles.daysPickerContainer}>
              {Array.from({length: 7}, (_, i) => i + 1).map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.dayPickerItem,
                    formData.numberOfDays === days && styles.dayPickerItemSelected
                  ]}
                  onPress={() => {
                    handleNumberOfDaysChange(days);
                    setShowDaysPicker(false);
                  }}
                >
                  <Text style={[
                    styles.dayPickerItemText,
                    formData.numberOfDays === days && styles.dayPickerItemTextSelected
                  ]}>
                    {days} {days === 1 ? 'Day' : 'Days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => setShowDaysPicker(false)}
              >
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interests Selection Modal */}
      <Modal
        visible={showInterestsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Interests</Text>
              <Text style={styles.modalSubtitle}>Choose what you'd like to explore</Text>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.interestsGrid}>
                {INTEREST_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.interestChip,
                      formData.selectedInterests.includes(category.id) && styles.interestChipSelected
                    ]}
                    onPress={() => handleInterestToggle(category.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.interestChipIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.interestChipText,
                      formData.selectedInterests.includes(category.id) && styles.interestChipTextSelected
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowInterestsModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => setShowInterestsModal(false)}
              >
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// SOTA UX/UI Design System
const DesignSystem = {
  colors: {
    // Advanced color palette
    primary: '#00D9FF',
    primaryDark: '#00B8CC',
    secondary: '#7C4DFF',
    accent: '#FF6B6B',
    
    // Background system
    background: {
      primary: '#0A0A0B',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1E1E20',
      modal: 'rgba(28, 28, 30, 0.95)',
    },
    
    // Text hierarchy
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E7',
      tertiary: '#98989A',
      accent: '#00D9FF',
      placeholder: '#6C6C70',
    },
    
    // Glass morphism
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
    },
    
    // Status colors
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    
    // Gradients
    gradients: {
      primary: ['#00D9FF', '#7C4DFF'],
      hero: ['#0A0A0B', 'transparent'],
      card: ['rgba(28, 28, 30, 0.8)', 'rgba(44, 44, 46, 0.4)'],
    },
  },
  
  // Compact mobile typography
  typography: {
    hero: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 26 },
    h1: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    h2: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
    body: { fontSize: 13, fontWeight: '500', lineHeight: 16 },
    caption: { fontSize: 11, fontWeight: '500', letterSpacing: 0.05 },
    micro: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  },
  
  // Compact spacing
  spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 },
  
  // Compact border radius
  radius: { sm: 4, md: 6, lg: 8, xl: 12, xxl: 16, full: 9999 },
  
  // Compact shadows
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    strong: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
    colored: { shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  },
};

const styles = StyleSheet.create({
  // Advanced container system
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.primary,
  },
  
  // Optimized compact hero section
  heroContainer: {
    height: height * 0.32,
    position: 'relative',
  },
  
  heroBackground: {
    position: 'absolute',
    top: -20,                                   // Reduced from -50
    left: -20,                                  // Reduced from -50
    right: -20,                                 // Reduced from -50
    bottom: -20,                                // Reduced from -50
    backgroundColor: DesignSystem.colors.background.secondary,
  },
  
  heroImageStyle: {
    resizeMode: 'cover',
    opacity: 1.0,
  },
  
  // Centered content container
  heroContentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DesignSystem.spacing.lg,
  },
  
  // Gray transparent overlay behind text - more visible
  heroTextOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',     // Much darker overlay for better text visibility
    borderRadius: DesignSystem.radius.xl,
    paddingVertical: DesignSystem.spacing.xl,
    paddingHorizontal: DesignSystem.spacing.xl + DesignSystem.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',   // Subtle white border for definition
  },
  
  heroTitle: {
    ...DesignSystem.typography.hero,
    color: DesignSystem.colors.text.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: DesignSystem.spacing.sm,
    fontWeight: '700',
  },
  
  heroSubtitle: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontWeight: '500',
  },
  
  // Optimized compact form container
  formContainer: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.primary,
    marginTop: -DesignSystem.spacing.xl,
    borderTopLeftRadius: DesignSystem.radius.xl,
    borderTopRightRadius: DesignSystem.radius.xl,
    paddingTop: DesignSystem.spacing.xl,
    paddingHorizontal: DesignSystem.spacing.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    overflow: 'visible',
    zIndex: 1,
  },
  // Optimized compact form sections
  sectionContainer: {
    marginBottom: DesignSystem.spacing.xl,
    overflow: 'visible',
    position: 'relative',
  },
  
  sectionCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    overflow: 'visible',
    position: 'relative',
    ...DesignSystem.shadows.soft,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },
  
  sectionIcon: {
    width: 20,
    height: 20,
    borderRadius: DesignSystem.radius.md,
    backgroundColor: DesignSystem.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DesignSystem.spacing.sm,
  },
  
  sectionIconText: {
    fontSize: 12,
    color: DesignSystem.colors.background.primary,
  },
  
  sectionTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    flex: 1,
    fontWeight: '600',
  },
  
  sectionDescription: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    marginBottom: DesignSystem.spacing.md,
    lineHeight: 14,
    fontWeight: '500',
  },
  
  // Modern input styling
  inputGroup: {
    marginBottom: DesignSystem.spacing.md,
    overflow: 'visible',
    position: 'relative',
  },
  
  inputLabel: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.secondary,
    marginBottom: DesignSystem.spacing.sm,
    textTransform: 'uppercase',
  },
  
  inputContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  
  inputContainerFocused: {
    borderColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  // Advanced layout components
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignSystem.spacing.md,
  },
  
  // Optimized compact interactive buttons
  interactiveButton: {
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  interactiveButtonPressed: {
    backgroundColor: DesignSystem.colors.background.secondary,
    borderColor: DesignSystem.colors.primary,
    transform: [{ scale: 0.98 }],
  },
  
  interactiveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  interactiveButtonText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    flex: 1,
  },
  
  interactiveButtonValue: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.primary,
    fontWeight: 600,
  },
  
  interactiveButtonIcon: {
    fontSize: 16,
    color: DesignSystem.colors.text.tertiary,
    marginLeft: DesignSystem.spacing.sm,
  },
  // Advanced modal system
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DesignSystem.spacing.lg,
  },
  
  modalContainer: {
    backgroundColor: DesignSystem.colors.background.modal,
    borderRadius: DesignSystem.radius.xl,
    padding: DesignSystem.spacing.xl,
    maxWidth: '100%',
    maxHeight: '80%',
    width: '100%',
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.strong,
  },
  
  modalHeader: {
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.xl,
  },
  
  modalTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
    textAlign: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },
  
  modalSubtitle: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  modalContent: {
    flex: 1,
    marginBottom: DesignSystem.spacing.xl,
    minHeight: 200,
  },
  
  // Modern button system
  buttonContainer: {
    flexDirection: 'row',
    gap: DesignSystem.spacing.md,
    marginTop: DesignSystem.spacing.lg,
  },
  
  button: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    minHeight: 36,
    ...DesignSystem.shadows.soft,
  },
  
  buttonPrimary: {
    backgroundColor: DesignSystem.colors.primary,
    borderColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  
  buttonSecondary: {
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderColor: DesignSystem.colors.glass.border,
  },
  
  buttonText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: 600,
  },
  
  buttonTextPrimary: {
    color: DesignSystem.colors.background.primary,
    fontWeight: 700,
  },
  // Advanced interest selection system
  interestsContainer: {
    maxHeight: 400,
  },
  
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSystem.spacing.sm,
  },
  
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    paddingVertical: DesignSystem.spacing.sm,
    paddingHorizontal: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    width: '48%',
    marginBottom: DesignSystem.spacing.sm,
    ...DesignSystem.shadows.soft,
  },
  
  interestChipSelected: {
    backgroundColor: DesignSystem.colors.primary,
    borderColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  
  interestChipIcon: {
    fontSize: 14,
    marginRight: DesignSystem.spacing.xs,
  },
  
  interestChipText: {
    fontSize: 11,
    fontWeight: 600,
    color: DesignSystem.colors.text.primary,
    flex: 1,
    lineHeight: 13,
  },
  
  interestChipTextSelected: {
    color: DesignSystem.colors.background.primary,
    fontWeight: 700,
  },
  
  // Advanced picker styling
  pickerSection: {
    marginBottom: DesignSystem.spacing.xl,
  },
  
  pickerGrid: {
    flexDirection: 'row',
    gap: DesignSystem.spacing.md,
  },
  
  pickerCard: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
    minHeight: 72,
  },
  
  pickerCardActive: {
    backgroundColor: DesignSystem.colors.primary,
    borderColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  
  pickerCardTitle: {
    ...DesignSystem.typography.micro,
    color: DesignSystem.colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: DesignSystem.spacing.xs,
  },
  
  pickerCardValue: {
    fontSize: 18,
    fontWeight: 700,
    color: DesignSystem.colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  pickerCardValueActive: {
    color: DesignSystem.colors.background.primary,
  },
  // Optimized compact floating action button
  fabContainer: {
    position: 'absolute',
    bottom: DesignSystem.spacing.lg,              // Reduced from xl
    left: DesignSystem.spacing.md,                // Reduced from lg
    right: DesignSystem.spacing.md,               // Reduced from lg
    zIndex: 1000,
  },
  
  fab: {
    backgroundColor: DesignSystem.colors.primary,
    borderRadius: DesignSystem.radius.lg,         // Reduced from xl
    paddingVertical: DesignSystem.spacing.md,     // Reduced from lg + 4
    paddingHorizontal: DesignSystem.spacing.lg,   // Reduced from xl
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...DesignSystem.shadows.medium,               // Reduced from strong
    shadowColor: DesignSystem.colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 52,                                // Set explicit height
  },
  
  fabPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: DesignSystem.colors.primaryDark,
  },
  
  fabIcon: {
    fontSize: 20,
    color: DesignSystem.colors.background.primary,
    marginRight: DesignSystem.spacing.sm,
  },
  
  fabText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.background.primary,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  
  // Advanced toggle and switch components
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
  },
  
  toggleLabel: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    flex: 1,
    marginRight: DesignSystem.spacing.md,
  },
  
  toggleSwitch: {
    transform: [{ scale: 1.2 }],
  },
  
  // Status and feedback elements
  statusBadge: {
    backgroundColor: DesignSystem.colors.success,
    borderRadius: DesignSystem.radius.full,
    paddingVertical: DesignSystem.spacing.xs,
    paddingHorizontal: DesignSystem.spacing.md,
    alignSelf: 'flex-start',
  },
  
  statusBadgeText: {
    ...DesignSystem.typography.micro,
    color: DesignSystem.colors.background.primary,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  
  // Progress and loading states
  progressContainer: {
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.md,
    padding: DesignSystem.spacing.lg,
    alignItems: 'center',
    marginVertical: DesignSystem.spacing.lg,
  },
  
  progressText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.secondary,
    marginBottom: DesignSystem.spacing.sm,
  },
  pickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#3498db',
  },
  pickerItemText: {
    fontSize: 18,
    fontWeight: 500,
    color: '#2c3e50',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: 600,
  },
  // Modern optimization level selection
  optimizationContainer: {
    flexDirection: 'row',
    gap: DesignSystem.spacing.md,
    marginTop: DesignSystem.spacing.sm,
  },
  
  optimizationButton: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    paddingVertical: DesignSystem.spacing.md,
    paddingHorizontal: DesignSystem.spacing.sm,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    alignItems: 'center',
    ...DesignSystem.shadows.soft,
  },
  
  optimizationButtonSelected: {
    backgroundColor: DesignSystem.colors.primary,
    borderColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  
  optimizationText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.primary,
    fontWeight: 600,
    textAlign: 'center',
  },
  
  optimizationTextSelected: {
    color: DesignSystem.colors.background.primary,
    fontWeight: 700,
  },
  
  optimizationDesc: {
    ...DesignSystem.typography.micro,
    color: DesignSystem.colors.text.tertiary,
    marginTop: DesignSystem.spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  optimizationDescSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // This style will be replaced by the floating action button
  generateButton: {
    display: 'none', // Hide legacy button
  },
  generateButtonText: {
    display: 'none', // Hide legacy button text
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#555555', // Dark border
    backgroundColor: '#333333', // Dark background
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#ffffff', // White text for dark theme
    fontWeight: 500,
    zIndex: 1,
  },
  // Multi-day styles
  checkboxIcon: {
    fontSize: 24,
  },
  dailySchedulesContainer: {
    marginTop: DesignSystem.spacing.lg,
    marginBottom: DesignSystem.spacing.lg,
  },
  dailyScheduleCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    marginTop: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
  },
  dailyScheduleTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.md,
    letterSpacing: 0.3,
  },
  dailyScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputContainer: {
    flex: 1,
  },
  dailyScheduleLabel: {
    fontSize: 12,
    color: DesignSystem.colors.text.tertiary,
    fontWeight: 600,
    marginBottom: DesignSystem.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyTimeButton: {
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.md,
    padding: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.soft,
    minHeight: 48,
    justifyContent: 'center',
  },
  dailyTimeText: {
    fontSize: 15,
    color: DesignSystem.colors.text.primary,
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  daysPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  dayPickerItem: {
    width: 80,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  dayPickerItemSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  dayPickerItemText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: 600,
  },
  dayPickerItemTextSelected: {
    color: 'white',
    fontWeight: 700,
  },
  // City loading styles
  loadingCityContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCityText: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Missing styles for new modal system
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSystem.spacing.lg,
    marginVertical: DesignSystem.spacing.xl,
  },
  
  pickerColumn: {
    flex: 1,
    marginHorizontal: DesignSystem.spacing.sm,
  },
  
  pickerLabel: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    marginBottom: DesignSystem.spacing.sm,
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  
  picker: {
    height: 200,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
  },
  
  interestCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DesignSystem.spacing.sm,
    paddingHorizontal: DesignSystem.spacing.md,
    marginBottom: DesignSystem.spacing.xs,
  },
  
  interestIcon: {
    fontSize: 20,
    marginRight: DesignSystem.spacing.sm,
  },
  
  interestCheckboxLabel: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    flex: 1,
  },
  
  emptyInterestsContainer: {
    padding: DesignSystem.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.lg,
    marginVertical: DesignSystem.spacing.lg,
  },
  
  emptyInterestsText: {
    fontSize: 16,
    fontWeight: 500,
    color: DesignSystem.colors.text.tertiary,
    textAlign: 'center',
  },
  
  modalScrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  
  timeInputLeft: {
    flex: 1,
    marginRight: 8,
  },
  
  timeInputRight: {
    flex: 1,
    marginLeft: 8,
  },
  
  dailySchedulesTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.md,
    letterSpacing: 0.3,
  },
});

export default SmartItineraryPage;

