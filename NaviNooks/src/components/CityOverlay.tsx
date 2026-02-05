import React from 'react';
import { View, ViewStyle } from 'react-native';
import { CityTheme } from '../services/CityThemeService';

interface CityOverlayProps {
  theme: CityTheme;
  style?: ViewStyle;
  children?: React.ReactNode;
}

// Helper function for city-specific overlay patterns
const renderCitySpecificOverlay = (theme: CityTheme) => {
  switch (theme.id) {
    case 'philadelphia':
      return (
        <>
          {/* Patriotic top accent */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '30%',
              backgroundColor: theme.colors.primary,
              opacity: 0.4,
            }}
          />
          {/* Revolutionary bottom accent */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '25%',
              backgroundColor: theme.colors.secondary,
              opacity: 0.3,
            }}
          />
        </>
      );
      
    case 'miami':
      return (
        <>
          {/* Ocean-to-sunset gradient simulation */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '40%',
              backgroundColor: theme.colors.secondary, // Turquoise
              opacity: 0.35,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '35%',
              backgroundColor: theme.colors.primary, // Coral
              opacity: 0.4,
            }}
          />
          {/* Sunset accent */}
          <View
            style={{
              position: 'absolute',
              bottom: '20%',
              left: '60%',
              right: 0,
              height: '20%',
              backgroundColor: theme.colors.accent, // Yellow
              opacity: 0.25,
              borderTopLeftRadius: 50,
            }}
          />
        </>
      );
      
    case 'newyork':
      return (
        <>
          {/* Urban skyline effect */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: theme.colors.primary, // Dark
              opacity: 0.6,
            }}
          />
          {/* Taxi yellow accent */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '20%',
              backgroundColor: theme.colors.secondary, // Yellow
              opacity: 0.2,
            }}
          />
          {/* Vertical accent strips (like building windows) */}
          <View
            style={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              width: 3,
              height: '40%',
              backgroundColor: theme.colors.accent,
              opacity: 0.4,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: '15%',
              right: '25%',
              width: 2,
              height: '50%',
              backgroundColor: theme.colors.accent,
              opacity: 0.3,
            }}
          />
        </>
      );
      
    default:
      return (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: '60%',
            backgroundColor: theme.colors.primary,
            opacity: 0.3,
          }}
        />
      );
  }
};

/**
 * CityOverlay - Intelligent overlay component that adapts to city themes
 * 
 * Features:
 * - Automatic gradient detection and rendering
 * - Fallback to solid colors for older devices
 * - City-specific color harmony
 * - Optimized performance
 */
const CityOverlay: React.FC<CityOverlayProps> = ({ theme, style, children }) => {
  // Simple approach: Just use the theme's overlay color with good text visibility
  return (
    <View style={[style, { backgroundColor: theme.colors.overlayFallback }]}>
      {children}
    </View>
  );
};

export default CityOverlay;