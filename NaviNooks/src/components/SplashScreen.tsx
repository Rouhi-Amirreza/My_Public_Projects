import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      delay: 500,
      useNativeDriver: false,
    }).start();

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideAnim, progressAnim, onFinish]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Background Gradient Effect */}
      <View style={styles.gradientBackground}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Logo Section */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../NaviNooks_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Name Section */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.appName}>NaviNooks</Text>
        <Text style={styles.tagline}>Your Perfect Journey Awaits</Text>
      </Animated.View>

      {/* Progress Bar */}
      <Animated.View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Company Info */}
      <Animated.View
        style={[
          styles.companyContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.companyText}>Powered by</Text>
        <Text style={styles.companyName}>XNooks</Text>
      </Animated.View>

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 160,
    height: 160,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  progressContainer: {
    width: width * 0.6,
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  companyContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 60,
  },
  companyText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 1,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  circle1: {
    width: 100,
    height: 100,
    top: '20%',
    left: '10%',
  },
  circle2: {
    width: 150,
    height: 150,
    top: '60%',
    right: '5%',
  },
  circle3: {
    width: 80,
    height: 80,
    bottom: '30%',
    left: '15%',
  },
});

export default SplashScreen;