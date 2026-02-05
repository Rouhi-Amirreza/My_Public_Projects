import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Image,
} from 'react-native';


const { width, height } = Dimensions.get('window');

// Professional Design System
const DesignSystem = {
  colors: {
    primary: '#00D9FF',
    primaryDark: '#00B8CC',
    secondary: '#7C4DFF',
    accent: '#FF6B6B',
    
    background: {
      primary: '#0A0A0B',
      secondary: '#1C1C1E',
      tertiary: '#2C2C2E',
      card: '#1E1E20',
      modal: 'rgba(28, 28, 30, 0.95)',
    },
    
    text: {
      primary: '#FFFFFF',
      secondary: '#E5E5E7',
      tertiary: '#98989A',
      accent: '#00D9FF',
      placeholder: '#6C6C70',
    },
    
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
    },
    
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    
    gradients: {
      primary: ['#00D9FF', '#7C4DFF'],
      background: ['#0A0A0B', '#1C1C1E'],
      card: ['rgba(30, 30, 32, 0.8)', 'rgba(44, 44, 46, 0.4)'],
    },
  },
  
  typography: {
    hero: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, lineHeight: 28 },
    h1: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
    h2: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
    body: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.05 },
    micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  },
  
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999 },
  
  shadows: {
    soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    strong: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    colored: { shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  },
};

interface LoadingScreenProps {
  message?: string;
}

interface TaskItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  completed: boolean;
  inProgress: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Creating your perfect itinerary..." 
}) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'create-itinerary',
      title: 'Create Itinerary',
      icon: '🗺️',
      description: 'Building your personalized travel plan',
      completed: false,
      inProgress: true,
    },
    {
      id: 'check-traffic',
      title: 'Check Traffic Status',
      icon: '🚦',
      description: 'Analyzing real-time traffic conditions',
      completed: false,
      inProgress: false,
    },
    {
      id: 'check-tickets',
      title: 'Check Tickets',
      icon: '🎫',
      description: 'Finding available tickets and prices',
      completed: false,
      inProgress: false,
    },
    {
      id: 'check-rides',
      title: 'Check Rides',
      icon: '🚗',
      description: 'Calculating ride options and costs',
      completed: false,
      inProgress: false,
    },
  ]);

  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const taskAnimations = useRef(tasks.map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating movement animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Update progress percentage
    const progressListener = progressAnim.addListener(({ value }) => {
      setProgressPercentage(Math.round(value * 100));
    });

    // Simulate task progression - ultra fast to match actual generation speed
    const taskInterval = setInterval(() => {
      setCurrentTaskIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < tasks.length) {
          // Mark current task as completed and start next
          setTasks(prevTasks => 
            prevTasks.map((task, index) => ({
              ...task,
              completed: index < nextIndex,
              inProgress: index === nextIndex,
            }))
          );
          
          // Animate the new task
          Animated.timing(taskAnimations[nextIndex], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
          
          return nextIndex;
        } else {
          // All tasks completed
          clearInterval(taskInterval);
          return prevIndex;
        }
      });
    }, 300); // Change task every 300ms for ultra fast progression

    return () => {
      clearInterval(taskInterval);
      progressAnim.removeListener(progressListener);
    };
  }, [pulseAnim, fadeAnim, moveAnim, progressAnim, taskAnimations, glowAnim]);

  const renderTaskItem = (task: TaskItem, index: number) => {
    const isActive = task.inProgress || task.completed;
    const animation = taskAnimations[index];
    
    return (
      <Animated.View
        key={task.id}
        style={[
          styles.taskItem,
          {
            opacity: animation,
            transform: [
              {
                translateX: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.taskContent}>
          <Animated.View style={[
            styles.taskIcon,
            task.completed && styles.taskIconCompleted,
            task.inProgress && styles.taskIconActive,
            {
              transform: [
                {
                  scale: task.inProgress ? pulseAnim : 1,
                },
              ],
            },
          ]}>
            <Text style={styles.taskIconText}>{task.icon}</Text>
            {task.inProgress && (
              <View style={styles.taskProgressIndicator}>
                <ActivityIndicator size="small" color={DesignSystem.colors.primary} />
              </View>
            )}
            {task.completed && (
              <View style={styles.taskCompletedIndicator}>
                <Text style={styles.taskCompletedText}>✓</Text>
              </View>
            )}
          </Animated.View>
          
          <View style={styles.taskInfo}>
            <Text style={[
              styles.taskTitle,
              task.completed && styles.taskTitleCompleted,
              task.inProgress && styles.taskTitleActive,
            ]}>
              {task.title}
            </Text>
            <Text style={[
              styles.taskDescription,
              task.completed && styles.taskDescriptionCompleted,
            ]}>
              {task.description}
            </Text>
          </View>
        </View>
        
        {task.inProgress && (
          <Animated.View style={styles.taskProgressBar}>
            <Animated.View
              style={[
                styles.taskProgressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated Background Elements */}
      <Animated.View style={[
        styles.backgroundCircle1,
        {
          opacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 0.3],
          }),
        },
      ]} />
      <Animated.View style={[
        styles.backgroundCircle2,
        {
          opacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.05, 0.2],
          }),
        },
      ]} />
      
      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { 
                  scale: pulseAnim.interpolate({
                    inputRange: [0.8, 1.2],
                    outputRange: [0.9, 1.1],
                  })
                },
                { 
                  translateY: moveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  })
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                shadowOpacity: moveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                shadowRadius: moveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 40],
                }),
              },
            ]}
          >
            <Image
              source={require('../../NaviNooks_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        
        {/* Main Message */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>🤖 AI Working</Text>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
        
        {/* Task Progress */}
        <Animated.View style={[styles.tasksContainer, { opacity: fadeAnim }]}>
          <Text style={styles.tasksTitle}>Completing Tasks</Text>
          {tasks.map((task, index) => renderTaskItem(task, index))}
        </Animated.View>
        
        {/* Overall Progress */}
        <Animated.View style={[styles.overallProgress, { opacity: fadeAnim }]}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressPercentage}% Complete
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: DesignSystem.colors.primary,
    top: -100,
    right: -100,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: DesignSystem.colors.secondary,
    bottom: -50,
    left: -50,
  },
  content: {
    alignItems: 'center',
    padding: DesignSystem.spacing.xxl,
    width: '100%',
    maxWidth: 450,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: DesignSystem.spacing.xxl,
  },
  logoWrapper: {
    shadowColor: DesignSystem.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: 140,
    height: 140,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: DesignSystem.spacing.xxl,
  },
  title: {
    ...DesignSystem.typography.hero,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.md,
    textAlign: 'center',
  },
  message: {
    ...DesignSystem.typography.body,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tasksContainer: {
    width: '100%',
    marginBottom: DesignSystem.spacing.xxl,
  },
  tasksTitle: {
    ...DesignSystem.typography.h1,
    color: DesignSystem.colors.text.primary,
    marginBottom: DesignSystem.spacing.lg,
    textAlign: 'center',
  },
  taskItem: {
    backgroundColor: DesignSystem.colors.background.card,
    borderRadius: DesignSystem.radius.xl,
    padding: DesignSystem.spacing.lg,
    marginBottom: DesignSystem.spacing.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.glass.border,
    ...DesignSystem.shadows.medium,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 56,
    height: 56,
    borderRadius: DesignSystem.radius.lg,
    backgroundColor: DesignSystem.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DesignSystem.spacing.lg,
    position: 'relative',
    ...DesignSystem.shadows.soft,
  },
  taskIconActive: {
    backgroundColor: DesignSystem.colors.primary,
    ...DesignSystem.shadows.colored,
  },
  taskIconCompleted: {
    backgroundColor: DesignSystem.colors.success,
    ...DesignSystem.shadows.soft,
  },
  taskIconText: {
    fontSize: 28,
  },
  taskProgressIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: DesignSystem.colors.background.primary,
    borderRadius: DesignSystem.radius.full,
    padding: 4,
    ...DesignSystem.shadows.soft,
  },
  taskCompletedIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: DesignSystem.colors.success,
    borderRadius: DesignSystem.radius.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...DesignSystem.shadows.soft,
  },
  taskCompletedText: {
    color: DesignSystem.colors.background.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...DesignSystem.typography.h2,
    color: DesignSystem.colors.text.tertiary,
    marginBottom: DesignSystem.spacing.xs,
  },
  taskTitleActive: {
    color: DesignSystem.colors.text.primary,
  },
  taskTitleCompleted: {
    color: DesignSystem.colors.text.secondary,
  },
  taskDescription: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
  },
  taskDescriptionCompleted: {
    color: DesignSystem.colors.text.tertiary,
  },
  taskProgressBar: {
    height: 4,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.sm,
    marginTop: DesignSystem.spacing.md,
    overflow: 'hidden',
  },
  taskProgressFill: {
    height: '100%',
    backgroundColor: DesignSystem.colors.primary,
    borderRadius: DesignSystem.radius.sm,
  },
  overallProgress: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: DesignSystem.colors.background.tertiary,
    borderRadius: DesignSystem.radius.sm,
    marginBottom: DesignSystem.spacing.md,
    overflow: 'hidden',
    ...DesignSystem.shadows.soft,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DesignSystem.colors.primary,
    borderRadius: DesignSystem.radius.sm,
  },
  progressText: {
    ...DesignSystem.typography.caption,
    color: DesignSystem.colors.text.tertiary,
  },
});

export default LoadingScreen;

