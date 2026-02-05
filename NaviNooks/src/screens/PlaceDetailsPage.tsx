import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Linking,
  Alert,
  StatusBar,
  SafeAreaView,
  Share,
  Animated
} from 'react-native';
// Using emoji icons for better compatibility
import PlaceImage from '../components/PlaceImage';

const { width, height } = Dimensions.get('window');

interface PlaceDetailsProps {
  place: any;
  onBack: () => void;
}

// Helper function to normalize place data from different sources
const normalizePlaceData = (place: any) => {
  // If place has basic_info (from consolidated JSON), use that structure
  if (place.basic_info) {
    return {
      ...place.basic_info,
      ticket_info: place.basic_info.ticket_info || place.ticket_info,
      popular_times: place.basic_info.popular_times || place.popular_times,
      estimatedVisitDuration: place.estimatedVisitDuration,
      busynessLevel: place.busynessLevel,
    };
  }
  
  // Otherwise, assume it's a PlaceRecommendation and map to expected structure
  return {
    name: place.name,
    type: place.types?.[0] || 'Place',
    description: place.description || 'No description available',
    address: place.address,
    phone: place.phone,
    website: place.website,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    coordinates: place.coordinates,
    hours: place.opening_hours,
    business_status: place.business_status,
    ticket_info: place.ticket_info,
    popular_times: place.popular_times,
    estimatedVisitDuration: place.estimatedVisitDuration,
    busynessLevel: place.busynessLevel,
    founded: null,
    visitors: null,
  };
};

const PlaceDetailsPage: React.FC<PlaceDetailsProps> = ({ place, onBack }) => {
  const [scrollY, setScrollY] = useState(0);
  const placeData = normalizePlaceData(place);

  // Dynamic algorithm to calculate best visit time based on actual crowd data and duration
  const getBestVisitTime = () => {
    // Helper functions
    const formatTime = (hour: number, min: number = 0) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMinutes = min > 0 ? `:${min.toString().padStart(2, '0')}` : '';
      return `${displayHour}${displayMinutes} ${period}`;
    };
    
    const parseTimeString = (timeStr: string) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d+(?:\.\d+)?)\s*(hour|min)/i);
      if (!match) return null;
      
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      
      return unit === 'hour' ? value * 60 : value;
    };
    
    const parseTimeSlot = (timeStr: string) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      
      let hour = parseInt(match[1], 10);
      const period = match[2].toUpperCase();
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      return hour;
    };
    
    const addMinutesToHour = (hour: number, minutes: number) => {
      const totalMinutes = hour * 60 + minutes;
      return {
        hour: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
      };
    };
    
    // Get current time information
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentDay = now.getDay();
    
    console.log(`🕐 Current time: ${currentHour}:${currentMinutes.toString().padStart(2, '0')}, Day: ${currentDay}`);
    
    // Extract visit duration from place data
    let visitDuration = 120; // Default 2 hours in minutes
    if (placeData?.popular_times?.typical_time_spent) {
      const parsedDuration = parseTimeString(placeData.popular_times.typical_time_spent);
      if (parsedDuration) {
        visitDuration = parsedDuration;
        console.log(`📊 Using actual visit duration: ${visitDuration} minutes from "${placeData.popular_times.typical_time_spent}"`);
      }
    }
    
    // Get operating hours for today
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[currentDay];
    const todayHours = placeData?.hours?.[todayKey];
    
    let openHour = 9;
    let closeHour = 17;
    
    if (todayHours && todayHours.opens !== 'Closed') {
      const parsedOpen = parseTimeSlot(todayHours.opens);
      const parsedClose = parseTimeSlot(todayHours.closes);
      if (parsedOpen !== null) openHour = parsedOpen;
      if (parsedClose !== null) closeHour = parsedClose;
    }
    
    console.log(`🏢 Operating hours: ${openHour}:00 - ${closeHour}:00`);
    
    // Extract actual busyness data
    let crowdLevels = {};
    let hasRealData = false;
    
    if (placeData?.popular_times?.hourly_data?.[todayKey]) {
      const todayData = placeData.popular_times.hourly_data[todayKey];
      
      if (Array.isArray(todayData) && todayData.length > 0) {
        console.log('📊 Using real busyness data');
        hasRealData = true;
        
        todayData.forEach((hourData) => {
          if (hourData.time && hourData.hasOwnProperty('busyness_score')) {
            const hour = parseTimeSlot(hourData.time);
            if (hour !== null && hour >= openHour && hour <= closeHour) {
              crowdLevels[hour] = hourData.busyness_score;
            }
          }
        });
      }
    }
    
    // Fallback to intelligent estimates if no real data
    if (!hasRealData) {
      console.log('📊 Using intelligent estimates (no real data available)');
      // Create more sophisticated estimates based on place type
      const placeType = placeData?.type?.toLowerCase() || '';
      
      if (placeType.includes('museum') || placeType.includes('gallery')) {
        // Museums are typically busiest midday, quieter in morning/evening
        for (let h = openHour; h <= closeHour; h++) {
          if (h <= 10) crowdLevels[h] = 20 + Math.random() * 15;
          else if (h <= 12) crowdLevels[h] = 45 + Math.random() * 25;
          else if (h <= 15) crowdLevels[h] = 70 + Math.random() * 20;
          else crowdLevels[h] = 30 + Math.random() * 20;
        }
      } else if (placeType.includes('park') || placeType.includes('outdoor')) {
        // Parks are busiest in afternoon, especially weekends
        const weekendMultiplier = (currentDay === 0 || currentDay === 6) ? 1.3 : 1.0;
        for (let h = openHour; h <= closeHour; h++) {
          if (h <= 10) crowdLevels[h] = (15 + Math.random() * 10) * weekendMultiplier;
          else if (h <= 14) crowdLevels[h] = (35 + Math.random() * 20) * weekendMultiplier;
          else if (h <= 17) crowdLevels[h] = (60 + Math.random() * 25) * weekendMultiplier;
          else crowdLevels[h] = (25 + Math.random() * 15) * weekendMultiplier;
        }
      } else {
        // General places - typical business pattern
        for (let h = openHour; h <= closeHour; h++) {
          if (h <= 10) crowdLevels[h] = 25 + Math.random() * 15;
          else if (h <= 13) crowdLevels[h] = 60 + Math.random() * 25;
          else if (h <= 16) crowdLevels[h] = 50 + Math.random() * 20;
          else crowdLevels[h] = 30 + Math.random() * 15;
        }
      }
    }
    
    console.log('📊 Final crowd levels:', crowdLevels);
    
    // Find optimal time slots
    const possibleSlots = [];
    const visitHours = Math.ceil(visitDuration / 60);
    const maxStartHour = Math.min(closeHour - visitHours, closeHour - 1);
    
    // Check each possible starting hour
    for (let startHour = openHour; startHour <= maxStartHour; startHour++) {
      const endTime = addMinutesToHour(startHour, visitDuration);
      
      // Skip if slot has already passed today
      if (startHour < currentHour || (startHour === currentHour && currentMinutes > 30)) {
        console.log(`⏰ Skipping ${startHour}:00 - already passed`);
        continue;
      }
      
      // Skip if visit would go beyond closing time
      if (endTime.hour > closeHour || (endTime.hour === closeHour && endTime.minutes > 0)) {
        console.log(`🚫 Skipping ${startHour}:00 - would exceed closing time`);
        continue;
      }
      
      // Calculate weighted average crowd for this time slot
      let totalCrowd = 0;
      let hourCount = 0;
      let weightedSum = 0;
      let weightSum = 0;
      
      for (let h = startHour; h < endTime.hour; h++) {
        if (crowdLevels[h] !== undefined) {
          // Weight earlier hours in the visit more heavily (people care more about entry crowds)
          const weight = 1.0 / (h - startHour + 1);
          weightedSum += crowdLevels[h] * weight;
          weightSum += weight;
          totalCrowd += crowdLevels[h];
          hourCount++;
        }
      }
      
      const avgCrowd = hourCount > 0 ? Math.round(totalCrowd / hourCount) : 50;
      const weightedAvgCrowd = weightSum > 0 ? Math.round(weightedSum / weightSum) : avgCrowd;
      
      // Calculate a quality score (lower is better)
      let qualityScore = weightedAvgCrowd;
      
      // Bonus for visiting during off-peak hours
      if (startHour <= 10) qualityScore -= 5; // Early morning bonus
      if (startHour >= 16) qualityScore -= 3; // Late afternoon bonus
      
      // Penalty for very short visits at busy times
      if (visitDuration < 60 && avgCrowd > 70) qualityScore += 10;
      
      possibleSlots.push({
        startHour,
        endHour: endTime.hour,
        endMinutes: endTime.minutes,
        crowdLevel: avgCrowd,
        weightedCrowdLevel: weightedAvgCrowd,
        qualityScore,
        timeSlot: `${formatTime(startHour)} - ${formatTime(endTime.hour, endTime.minutes)}`
      });
      
      console.log(`✅ Slot ${startHour}:00-${endTime.hour}:${endTime.minutes.toString().padStart(2, '0')} = ${avgCrowd}% avg, ${weightedAvgCrowd}% weighted, quality: ${qualityScore}`);
    }
    
    // Sort by quality score (lowest first = best)
    possibleSlots.sort((a, b) => a.qualityScore - b.qualityScore);
    
    console.log('🎯 All possible slots:', possibleSlots.map(s => `${s.timeSlot} (${s.crowdLevel}%, quality: ${s.qualityScore})`));
    
    // Return the best slot available today
    if (possibleSlots.length > 0) {
      const bestSlot = possibleSlots[0];
      console.log(`🏆 Best slot: ${bestSlot.timeSlot} with ${bestSlot.crowdLevel}% crowd (quality: ${bestSlot.qualityScore})`);
      return bestSlot.timeSlot;
    }
    
    // Fallback to tomorrow if no slots available today
    const tomorrowStartHour = openHour <= 9 ? openHour : 9;
    const tomorrowEndTime = addMinutesToHour(tomorrowStartHour, visitDuration);
    const fallback = `Tomorrow ${formatTime(tomorrowStartHour)} - ${formatTime(tomorrowEndTime.hour, tomorrowEndTime.minutes)}`;
    console.log(`🌅 Fallback: ${fallback}`);
    return fallback;
  };

  const handleCall = () => {
    if (placeData?.phone) {
      Linking.openURL(`tel:${placeData.phone}`);
    }
  };

  const handleWebsite = () => {
    if (placeData?.website) {
      Linking.openURL(placeData.website);
    }
  };

  const handleDirections = () => {
    if (placeData?.address) {
      const encodedAddress = encodeURIComponent(placeData.address);
      Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Check out ${placeData?.name || 'this place'}!\n\n${placeData?.description}\n\nAddress: ${placeData?.address}\nRating: ${placeData?.rating || 'N/A'} ⭐`;
      
      await Share.share({
        message,
        title: placeData?.name || 'Place Details',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsText = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starsText += '⭐';
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      starsText += '⭐'; // Using full star for half star (simpler)
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsText += '☆';
    }
    
    return (
      <Text style={styles.starsText}>{starsText}</Text>
    );
  };

  const renderHours = () => {
    if (!placeData?.hours) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <View style={styles.hoursContainer}>
        {days.map((day, index) => {
          const dayInfo = placeData.hours[day];
          const isToday = new Date().getDay() === (index + 1) % 7;
          
          return (
            <View key={day} style={[styles.hourRow, isToday && styles.hourRowToday]}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {dayLabels[index]}
              </Text>
              <Text style={[styles.hourText, isToday && styles.hourTextToday]}>
                {dayInfo?.opens === 'Closed' 
                  ? 'Closed' 
                  : `${dayInfo?.opens || 'N/A'} - ${dayInfo?.closes || 'N/A'}`
                }
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      {placeData?.phone && (
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <View style={styles.actionButtonIcon}>
            <Text style={styles.actionButtonEmoji}>📞</Text>
          </View>
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
      )}
      
      {placeData?.address && (
        <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
          <View style={styles.actionButtonIcon}>
            <Text style={styles.actionButtonEmoji}>🧭</Text>
          </View>
          <Text style={styles.actionButtonText}>Directions</Text>
        </TouchableOpacity>
      )}
      
      {placeData?.website && (
        <TouchableOpacity style={styles.actionButton} onPress={handleWebsite}>
          <View style={styles.actionButtonIcon}>
            <Text style={styles.actionButtonEmoji}>🌐</Text>
          </View>
          <Text style={styles.actionButtonText}>Website</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <View style={styles.actionButtonIcon}>
          <Text style={styles.actionButtonEmoji}>📤</Text>
        </View>
        <Text style={styles.actionButtonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );

  const headerOpacity = Math.min(scrollY / 200, 1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { backgroundColor: `rgba(10, 10, 11, ${headerOpacity})` }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.headerButtonEmoji}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { opacity: headerOpacity }]} numberOfLines={1}>
          {placeData?.name}
        </Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.headerButtonEmoji}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageContainer}>
            <PlaceImage 
              place={place}
              width={width}
              height={height * 0.4}
              borderRadius={0}
              fallbackIcon="🏛️"
              resizeMode="cover"
            />
            {/* Enhanced Fallback for when PlaceImage fails */}
            <View style={styles.heroFallbackOverlay}>
              <View style={styles.heroFallbackContent}>
                <Text style={styles.heroFallbackIcon}>
                  {placeData?.type?.includes('Museum') ? '🏛️' : 
                   placeData?.type?.includes('Park') ? '🌳' : 
                   placeData?.type?.includes('Restaurant') ? '🍽️' : 
                   placeData?.type?.includes('Hotel') ? '🏨' : '📍'}
                </Text>
                <Text style={styles.heroFallbackText}>{placeData?.name}</Text>
              </View>
            </View>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.typeContainer}>
                <Text style={styles.typeText}>{placeData?.type || 'Place'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Title and Rating Section */}
          <View style={styles.titleSection}>
            <Text style={styles.placeName}>{placeData?.name}</Text>
            {placeData?.rating && (
              <View style={styles.ratingContainer}>
                <View style={styles.ratingCard}>
                  <View style={styles.ratingLeft}>
                    <View style={styles.starsContainer}>
                      {renderRatingStars(placeData.rating)}
                    </View>
                    <Text style={styles.ratingScore}>{placeData.rating}</Text>
                  </View>
                  <View style={styles.ratingRight}>
                    <Text style={styles.ratingLabel}>Rating</Text>
                    {placeData?.user_ratings_total && (
                      <Text style={styles.reviewCount}>
                        {placeData.user_ratings_total.toLocaleString()} reviews
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          {placeData?.description && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>ℹ️</Text>
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <Text style={styles.description}>{placeData.description}</Text>
            </View>
          )}

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📍</Text>
              <Text style={styles.sectionTitle}>Contact & Location</Text>
            </View>
            
            {placeData?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>{placeData.address}</Text>
              </View>
            )}
            
            {placeData?.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={styles.infoText}>{placeData.phone}</Text>
              </View>
            )}
            
            {placeData?.website && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🌐</Text>
                <Text style={styles.infoText} numberOfLines={1}>
                  {placeData.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
            )}
          </View>

          {/* Business Hours */}
          {placeData?.hours && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🕒</Text>
                <Text style={styles.sectionTitle}>Hours</Text>
              </View>
              {renderHours()}
            </View>
          )}

          {/* Official Ticket Price */}
          {placeData?.ticket_info && placeData.ticket_info.some(ticket => ticket.is_official) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🎫</Text>
                <Text style={styles.sectionTitle}>Official Ticket Price</Text>
              </View>
              
              {(() => {
                const officialTicket = placeData.ticket_info.find(ticket => ticket.is_official);
                return officialTicket ? (
                  <View style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketBadgeText}>🏛️ Official</Text>
                      </View>
                      <Text style={styles.ticketPrice}>
                        {officialTicket.price.replace(/\s*min.*$/i, '')}
                      </Text>
                    </View>
                    <Text style={styles.ticketNote}>Official venue pricing</Text>
                  </View>
                ) : null;
              })()}
            </View>
          )}

          {/* Visit Planning */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⏰</Text>
              <Text style={styles.sectionTitle}>Visit Planning</Text>
            </View>
            
            <View style={styles.planningContainer}>
              {/* Recommended Visit Duration */}
              <View style={styles.planningCard}>
                <View style={styles.planningCardHeader}>
                  <Text style={styles.planningIcon}>🕐</Text>
                  <Text style={styles.planningTitle}>Recommended Visit Duration</Text>
                </View>
                {placeData?.estimatedVisitDuration ? (
                  <>
                    <Text style={styles.planningValue}>
                      {Math.floor(placeData.estimatedVisitDuration / 60)}h {placeData.estimatedVisitDuration % 60}m
                    </Text>
                    <Text style={styles.planningNote}>Average time for a complete visit</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.planningValue}>2-3 hours</Text>
                    <Text style={styles.planningNote}>Typical visit duration</Text>
                  </>
                )}
              </View>

              {/* Best Visit Time */}
              <View style={styles.planningCard}>
                <View style={styles.planningCardHeader}>
                  <Text style={styles.planningIcon}>🎯</Text>
                  <Text style={styles.planningTitle}>Best Visit Time</Text>
                </View>
                <Text style={styles.planningValue}>
                  {getBestVisitTime()}
                </Text>
                <Text style={styles.planningNote}>
                  Optimal time slot based on crowd patterns and visit duration
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {renderActionButtons()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Premium Design System
const DesignSystem = {
  colors: {
    primary: '#00D9FF',
    primaryDark: '#00B8CC',
    secondary: '#7C4DFF',
    accent: '#FFD700',
    
    background: {
      primary: '#0A0A0B',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1E1E20',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E7',
      tertiary: '#98989A',
      accent: '#00D9FF',
    },
    
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
  },
  
  typography: {
    hero: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    h1: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
    h2: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
    h3: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
    body: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1 },
    micro: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  },
  
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999 },
  
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
    strong: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    colored: { shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.primary,
  },
  
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: DesignSystem.spacing.md,
    paddingHorizontal: DesignSystem.spacing.lg,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  backButton: {
    width: 44,
    height: 44,
    borderRadius: DesignSystem.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DesignSystem.spacing.md,
    ...DesignSystem.shadows.soft,
  },
  
  headerTitle: {
    ...DesignSystem.typography.h3,
    color: DesignSystem.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: DesignSystem.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: DesignSystem.spacing.md,
    ...DesignSystem.shadows.soft,
  },
  
  headerButtonEmoji: {
    fontSize: 20,
    color: DesignSystem.colors.text.primary,
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  heroSection: {
    height: height * 0.4,
    position: 'relative',
  },
  
  heroImageContainer: {
    flex: 1,
    position: 'relative',
  },
  
  heroFallbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DesignSystem.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, // Behind the actual image when it loads
  },
  
  heroFallbackContent: {
    alignItems: 'center',
  },
  
  heroFallbackIcon: {
    fontSize: 64,
    marginBottom: DesignSystem.spacing.md,
  },
  
  heroFallbackText: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: DesignSystem.spacing.xl,
  },
  
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DesignSystem.colors.background.overlay,
  },
  
  heroContent: {
    position: 'absolute',
    bottom: DesignSystem.spacing.xl,
    left: DesignSystem.spacing.xl,
    right: DesignSystem.spacing.xl,
    alignItems: 'flex-start',
  },
  
  typeContainer: {
    backgroundColor: DesignSystem.colors.primary,
    paddingHorizontal: DesignSystem.spacing.md,
    paddingVertical: DesignSystem.spacing.xs,
    borderRadius: DesignSystem.radius.full,
    ...DesignSystem.shadows.colored,
  },
  
  typeText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.background.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  
  contentContainer: {
    backgroundColor: DesignSystem.colors.background.primary,
    borderTopLeftRadius: DesignSystem.radius.xxl,
    borderTopRightRadius: DesignSystem.radius.xxl,
    marginTop: -DesignSystem.spacing.xl,
    paddingTop: DesignSystem.spacing.xl,
    paddingHorizontal: DesignSystem.spacing.lg,
    paddingBottom: DesignSystem.spacing.xxl,
    minHeight: height * 0.7,
  },
  
  titleSection: {
    marginBottom: DesignSystem.spacing.xl,
  },
  
  placeName: {
    ...DesignSystem.typography.hero,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.sm,
    lineHeight: 32,
  },
  
  ratingContainer: {
    marginTop: DesignSystem.spacing.lg,
  },
  
  ratingCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.xl,
    padding: DesignSystem.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.medium,
  },
  
  ratingLeft: {
    alignItems: 'center',
    marginRight: DesignSystem.spacing.lg,
  },
  
  starsContainer: {
    flexDirection: 'row',
    marginBottom: DesignSystem.spacing.xs,
  },
  
  starsText: {
    fontSize: 18,
    lineHeight: 22,
  },
  
  ratingScore: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.primary,
    fontWeight: '800',
  },
  
  ratingRight: {
    flex: 1,
  },
  
  ratingLabel: {
    ...DesignSystem.typography.h3,
    color: DesignSystem.colors.text.primary,
    fontWeight: '700',
    marginBottom: DesignSystem.spacing.xs,
  },
  
  reviewCount: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.tertiary,
    fontWeight: '500',
  },
  
  section: {
    marginBottom: DesignSystem.spacing.xl,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.md,
  },
  
  sectionIcon: {
    fontSize: 20,
    marginRight: DesignSystem.spacing.sm,
  },
  
  sectionTitle: {
    ...DesignSystem.typography.h3,
    color: DesignSystem.colors.text.primary,
    flex: 1,
  },
  
  description: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    lineHeight: 22,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.md,
  },
  
  infoIcon: {
    fontSize: 18,
    marginRight: DesignSystem.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  
  infoText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    flex: 1,
  },
  
  hoursContainer: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.lg,
    padding: DesignSystem.spacing.lg,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
  },
  
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DesignSystem.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  hourRowToday: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: DesignSystem.radius.sm,
    paddingHorizontal: DesignSystem.spacing.sm,
    borderBottomColor: 'transparent',
  },
  
  dayLabel: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    fontWeight: '600',
    minWidth: 40,
  },
  
  dayLabelToday: {
    color: DesignSystem.colors.primary,
  },
  
  hourText: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
  },
  
  hourTextToday: {
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },
  
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -DesignSystem.spacing.sm,
  },
  
  detailItem: {
    width: '50%',
    paddingHorizontal: DesignSystem.spacing.sm,
    marginBottom: DesignSystem.spacing.md,
  },
  
  detailLabel: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    marginBottom: DesignSystem.spacing.xs,
    textTransform: 'uppercase',
  },
  
  detailValue: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.primary,
    fontWeight: '600',
  },
  
  statusOpen: {
    color: DesignSystem.colors.success,
  },
  
  statusClosed: {
    color: DesignSystem.colors.error,
  },
  
  // Ticket Pricing Styles
  ticketContainer: {
    gap: DesignSystem.spacing.md,
  },
  
  ticketCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.xl,
    padding: DesignSystem.spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    ...DesignSystem.shadows.medium,
    position: 'relative',
    overflow: 'hidden',
  },
  
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.sm,
  },
  
  ticketBadge: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: DesignSystem.spacing.md,
    paddingVertical: DesignSystem.spacing.xs,
    borderRadius: DesignSystem.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  
  ticketBadgeText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.primary,
    fontWeight: '700',
  },
  
  ticketPrice: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.primary,
    fontWeight: '800',
  },
  
  ticketNote: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
    fontStyle: 'italic',
  },
  
  // Visit Planning Styles
  planningContainer: {
    gap: DesignSystem.spacing.md,
  },
  
  planningCard: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.xl,
    padding: DesignSystem.spacing.xl,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.medium,
    marginBottom: DesignSystem.spacing.md,
  },
  
  planningCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.md,
  },
  
  planningIcon: {
    fontSize: 20,
    marginRight: DesignSystem.spacing.sm,
  },
  
  planningTitle: {
    ...DesignSystem.typography.h3,
    color: DesignSystem.colors.text.primary,
    flex: 1,
  },
  
  planningValue: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.primary,
    fontWeight: '700',
    marginBottom: DesignSystem.spacing.xs,
  },
  
  planningNote: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
  },
  
  
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.xxl,
    padding: DesignSystem.spacing.xl,
    marginTop: DesignSystem.spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.15)',
    ...DesignSystem.shadows.strong,
  },
  
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: DesignSystem.radius.full,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DesignSystem.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    ...DesignSystem.shadows.soft,
  },
  
  actionButtonEmoji: {
    fontSize: 24,
  },
  
  actionButtonText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.secondary,
    fontWeight: '600',
  },
});

export default PlaceDetailsPage;