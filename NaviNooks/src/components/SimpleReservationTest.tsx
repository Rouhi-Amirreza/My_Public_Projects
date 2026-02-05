import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { DiningStop } from '../types';

interface SimpleReservationTestProps {
  diningStop: DiningStop | null;
  onClose: () => void;
}

const SimpleReservationTest: React.FC<SimpleReservationTestProps> = ({ diningStop, onClose }) => {
  console.log('🔔 SimpleReservationTest render - diningStop:', diningStop);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reservation Test Screen</Text>
        
        <Text style={styles.subtitle}>
          Restaurant: {diningStop?.name || 'Unknown'}
        </Text>
        
        <Text style={styles.subtitle}>
          Meal Type: {diningStop?.meal_type || 'Unknown'}
        </Text>
        
        <Text style={styles.subtitle}>
          Address: {diningStop?.address || 'Unknown'}
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close Modal</Text>
        </TouchableOpacity>
        
        <Text style={styles.debug}>
          Debug: {JSON.stringify(diningStop, null, 2)}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debug: {
    fontSize: 10,
    color: '#666666',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default SimpleReservationTest;