import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
  isDebugLogging: boolean;
  debugLogContent: string;
  onToggleDebugLogging: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  visible,
  onClose,
  isDebugLogging,
  debugLogContent,
  onToggleDebugLogging,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>🔍 Debug Panel</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.debugControls}>
            <TouchableOpacity
              style={[styles.debugButton, isDebugLogging && styles.debugButtonActive]}
              onPress={onToggleDebugLogging}
            >
              <Text style={[styles.debugButtonText, isDebugLogging && styles.debugButtonTextActive]}>
                {isDebugLogging ? 'Stop Logging' : 'Start Logging'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.debugContent}>
            <Text style={styles.debugText}>
              {debugLogContent || 'No debug information available'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugPanel: {
    backgroundColor: '#fff',
    width: '90%',
    height: '80%',
    borderRadius: 12,
    padding: 20,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  debugControls: {
    marginBottom: 20,
  },
  debugButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugButtonActive: {
    backgroundColor: '#dc3545',
  },
  debugButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButtonTextActive: {
    color: '#fff',
  },
  debugContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 16,
  },
});

export default DebugPanel;
