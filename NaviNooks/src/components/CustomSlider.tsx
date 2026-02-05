import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  clamp,
} from 'react-native-reanimated';

interface CustomSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  style?: any;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbStyle?: any;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  style,
  minimumTrackTintColor = '#4ECDC4',
  maximumTrackTintColor = '#555555',
}) => {
  const translateX = useSharedValue(0);
  const sliderWidth = 280; // Fixed width for simplicity
  const thumbSize = 20;

  // Calculate initial position
  React.useEffect(() => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    translateX.value = percentage * (sliderWidth - thumbSize);
  }, [value, minimumValue, maximumValue]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newX = clamp(
        context.startX + event.translationX,
        0,
        sliderWidth - thumbSize
      );
      translateX.value = newX;

      // Calculate new value
      const percentage = newX / (sliderWidth - thumbSize);
      const newValue = minimumValue + percentage * (maximumValue - minimumValue);
      const steppedValue = Math.round(newValue / step) * step;
      
      runOnJS(onValueChange)(steppedValue);
    },
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + thumbSize / 2,
    };
  });

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <View style={styles.sliderContainer}>
        {/* Track background */}
        <View
          style={[
            styles.track,
            { backgroundColor: maximumTrackTintColor, width: sliderWidth },
          ]}
        />
        
        {/* Active track */}
        <Animated.View
          style={[
            styles.activeTrack,
            { backgroundColor: minimumTrackTintColor },
            animatedTrackStyle,
          ]}
        />
        
        {/* Thumb */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: minimumTrackTintColor,
                width: thumbSize,
                height: thumbSize,
              },
              animatedThumbStyle,
            ]}
          />
        </PanGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  activeTrack: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  thumb: {
    borderRadius: 10,
    position: 'absolute',
    top: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default CustomSlider;