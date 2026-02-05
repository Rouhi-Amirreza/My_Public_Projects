import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MultiDayItinerary } from '../types';

interface DayTabsProps {
  itinerary: MultiDayItinerary;
  activeDay: number;
  onDayChange: (day: number) => void;
}

const DayTabs: React.FC<DayTabsProps> = ({
  itinerary,
  activeDay,
  onDayChange,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {itinerary.dailyItineraries.map((day, index) => (
        <TouchableOpacity
          key={day.day}
          style={[
            styles.dayTab,
            activeDay === day.day && styles.activeDayTab,
          ]}
          onPress={() => onDayChange(day.day)}
        >
          <Text
            style={[
              styles.dayTabText,
              activeDay === day.day && styles.activeDayTabText,
            ]}
          >
            Day {day.day}
          </Text>
          <Text
            style={[
              styles.dayTabSubtext,
              activeDay === day.day && styles.activeDayTabSubtext,
            ]}
          >
            {day.places.length} places
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    maxHeight: 80,
    backgroundColor: '#f8f9fa',
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dayTab: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  activeDayTab: {
    backgroundColor: '#007bff',
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeDayTabText: {
    color: '#fff',
  },
  dayTabSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  activeDayTabSubtext: {
    color: '#e3f2fd',
  },
});

export default DayTabs;
