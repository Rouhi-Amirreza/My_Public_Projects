import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { GeneratedItinerary, MultiDayItinerary } from '../types';

interface ItinerarySummaryProps {
  itinerary: GeneratedItinerary | MultiDayItinerary;
  isMultiDay: boolean;
  activeDay?: number;
}

const ItinerarySummary: React.FC<ItinerarySummaryProps> = ({
  itinerary,
  isMultiDay,
  activeDay = 1,
}) => {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryHeight] = useState(new Animated.Value(0));
  const [summaryRotation] = useState(new Animated.Value(0));

  const toggleSummary = () => {
    const toValue = summaryExpanded ? 0 : 1;
    setSummaryExpanded(!summaryExpanded);
    
    Animated.parallel([
      Animated.timing(summaryHeight, {
        toValue: toValue * 150,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(summaryRotation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotate = summaryRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getSummaryData = () => {
    if (isMultiDay) {
      const multiDayItinerary = itinerary as MultiDayItinerary;
      const currentDay = multiDayItinerary.dailyItineraries.find(day => day.day === activeDay);
      if (!currentDay) return null;
      
      return {
        places: currentDay.places,
        schedule: currentDay.schedule,
        optimizationNotes: currentDay.optimizationNotes || [],
      };
    } else {
      const singleDayItinerary = itinerary as GeneratedItinerary;
      return {
        places: singleDayItinerary.places,
        schedule: singleDayItinerary.schedule,
        optimizationNotes: singleDayItinerary.optimizationNotes || [],
      };
    }
  };

  const summaryData = getSummaryData();
  if (!summaryData) return null;

  const totalDiningStops = summaryData.schedule.reduce((total, item) => {
    return total + (item.diningStops?.length || 0);
  }, 0);

  const totalDuration = summaryData.schedule.reduce((total, item) => {
    return total + (item.visitDuration || 0);
  }, 0);

  const startTime = summaryData.schedule[0]?.arrivalTime || 'N/A';
  const endTime = summaryData.schedule[summaryData.schedule.length - 1]?.departureTime || 'N/A';

  return (
    <View style={styles.summaryContainer}>
      <TouchableOpacity style={styles.summaryHeader} onPress={toggleSummary}>
        <Text style={styles.summaryTitle}>📊 Day {activeDay} Summary</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Text style={styles.expandIcon}>▼</Text>
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View style={[styles.summaryContent, { height: summaryHeight }]}>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Places</Text>
            <Text style={styles.statValue}>{summaryData.places.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Dining Stops</Text>
            <Text style={styles.statValue}>{totalDiningStops}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{Math.round(totalDuration / 60)}h</Text>
          </View>
        </View>
        
        <View style={styles.timeRange}>
          <Text style={styles.timeText}>{startTime} - {endTime}</Text>
        </View>
        
        <View style={styles.notesPreview}>
          <Text style={styles.notesTitle}>Optimization Notes:</Text>
          <Text style={styles.notesCount}>{summaryData.optimizationNotes.length} notes</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryContent: {
    overflow: 'hidden',
    paddingHorizontal: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
  },
  timeRange: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  timeText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  notesPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  notesTitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  notesCount: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
});

export default ItinerarySummary;
