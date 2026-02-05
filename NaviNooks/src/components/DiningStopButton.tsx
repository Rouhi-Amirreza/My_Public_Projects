import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import DiningService from '../services/DiningService';

interface DiningStopButtonProps {
  fromLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  toLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  arrivalTime: string;
  onPress: () => void;
  style?: any;
}

const DiningStopButton: React.FC<DiningStopButtonProps> = ({
  fromLocation,
  toLocation,
  arrivalTime,
  onPress,
  style,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  // Get appropriate meal types for the time
  const mealTypes = DiningService.getMealTypeForTime(arrivalTime);
  const primaryMealType = mealTypes[0];
  
  // Get meal config for primary meal type
  const mealConfigs = {
    breakfast: { emoji: '🥐', label: 'Breakfast', color: '#FF9500' },
    brunch: { emoji: '🥞', label: 'Brunch', color: '#FF9500' },
    coffee: { emoji: '☕', label: 'Coffee', color: '#8B4513' },
    lunch: { emoji: '🍽️', label: 'Lunch', color: '#4CAF50' },
    dinner: { emoji: '🍷', label: 'Dinner', color: '#9C27B0' },
    drinks: { emoji: '🍸', label: 'Drinks', color: '#E91E63' },
  };

  const config = mealConfigs[primaryMealType as keyof typeof mealConfigs] || mealConfigs.coffee;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleValue }] },
        style
      ]}
    >
      <TouchableOpacity
        style={[styles.button, { borderColor: config.color }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Animated background gradient effect */}
        <View style={[styles.gradientBackground, { backgroundColor: `${config.color}20` }]} />
        
        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.emoji}>{config.emoji}</Text>
            <View style={[styles.iconBadge, { backgroundColor: config.color }]}>
              <Text style={styles.badgeText}>+</Text>
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.primaryText}>Add {config.label} Stop</Text>
            <Text style={styles.secondaryText}>
              Between destinations
            </Text>
            <Text style={styles.timeText}>
              Perfect for {arrivalTime}
            </Text>
          </View>
          
          <View style={styles.chevron}>
            <Text style={styles.chevronText}>›</Text>
          </View>
        </View>
        
        {/* Subtle pulsing effect */}
        <View style={[styles.pulseRing, { borderColor: config.color }]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  emoji: {
    fontSize: 32,
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  textContainer: {
    flex: 1,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 13,
    color: '#cccccc',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontStyle: 'italic',
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  pulseRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 1,
    opacity: 0.3,
  },
});

export default DiningStopButton;