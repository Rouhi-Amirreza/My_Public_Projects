import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface DurationSelectorProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  style?: any;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  style,
}) => {
  // Generate quick select options
  const quickOptions = [15, 30, 45, 60, 90, 120];
  
  // Generate step options
  const stepOptions = [];
  for (let i = minimumValue; i <= maximumValue; i += step) {
    stepOptions.push(i);
  }

  const handleQuickSelect = (selectedValue: number) => {
    onValueChange(selectedValue);
  };

  const handleStepChange = (increment: boolean) => {
    const newValue = increment 
      ? Math.min(value + step, maximumValue)
      : Math.max(value - step, minimumValue);
    onValueChange(newValue);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Quick Select Buttons */}
      <Text style={styles.sectionLabel}>Quick Select (minutes):</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickSelectContainer}
      >
        {quickOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.quickSelectButton,
              value === option && styles.selectedQuickButton
            ]}
            onPress={() => handleQuickSelect(option)}
          >
            <Text style={[
              styles.quickSelectText,
              value === option && styles.selectedQuickText
            ]}>
              {option}m
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Step Controls */}
      <View style={styles.stepContainer}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => handleStepChange(false)}
          disabled={value <= minimumValue}
        >
          <Text style={[
            styles.stepButtonText,
            value <= minimumValue && styles.disabledStepText
          ]}>
            − {step}m
          </Text>
        </TouchableOpacity>
        
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{value} min</Text>
        </View>
        
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => handleStepChange(true)}
          disabled={value >= maximumValue}
        >
          <Text style={[
            styles.stepButtonText,
            value >= maximumValue && styles.disabledStepText
          ]}>
            + {step}m
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%` 
              }
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{minimumValue}m</Text>
          <Text style={styles.progressLabel}>{maximumValue}m</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
    fontWeight: '600',
  },
  quickSelectContainer: {
    marginBottom: 20,
  },
  quickSelectButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555555',
  },
  selectedQuickButton: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  quickSelectText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedQuickText: {
    color: '#1a1a1a',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
  },
  stepButtonText: {
    fontSize: 16,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  disabledStepText: {
    color: '#666666',
  },
  currentValueContainer: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  currentValue: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#555555',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#888888',
  },
});

export default DurationSelector;