import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';

interface OptimizationNotesPanelProps {
  notes: string[];
}

const OptimizationNotesPanel: React.FC<OptimizationNotesPanelProps> = ({ notes }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.optimizationContainer}>
      <TouchableOpacity 
        style={styles.optimizationHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.optimizationHeaderContent}>
          <Text style={styles.optimizationTitle}>💡 Optimization Notes</Text>
          <Text style={styles.optimizationCount}>({notes.length})</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Text style={styles.expandIcon}>▼</Text>
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View style={[styles.optimizationContent, { maxHeight }]}>
        <ScrollView 
          style={styles.optimizationScrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {notes.map((note, index) => (
            <Text key={index} style={styles.optimizationNote}>
              • {note}
            </Text>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  optimizationContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  optimizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e3f2fd',
  },
  optimizationHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optimizationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  optimizationCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  expandIcon: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  optimizationContent: {
    overflow: 'hidden',
  },
  optimizationScrollView: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  optimizationNote: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default OptimizationNotesPanel;
