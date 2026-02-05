import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import DebugLogger from '../services/DebugLogger';

export const useDebugState = () => {
  const [isDebugLogging, setIsDebugLogging] = useState(false);
  const [debugLogContent, setDebugLogContent] = useState<string>('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Auto-start debug logging on mount
  useEffect(() => {
    DebugLogger.start();
    setIsDebugLogging(true);
    console.log('🔍 Auto-started debug logging for schedule calculations');
    
    // Cleanup on unmount
    return () => {
      DebugLogger.stop();
    };
  }, []);

  // Debug logging controls
  const startDebugLogging = useCallback(() => {
    DebugLogger.start();
    setIsDebugLogging(true);
    console.log('🔍 Debug logging started');
  }, []);

  const stopDebugLogging = useCallback(() => {
    DebugLogger.stop();
    setIsDebugLogging(false);
    setDebugLogContent(DebugLogger.getLogsAsText());
    console.log('🔍 Debug logging stopped');
  }, []);

  const clearDebugLogs = useCallback(() => {
    DebugLogger.clear();
    setDebugLogContent('');
    console.log('🗑️ Debug logs cleared');
  }, []);

  const exportDebugLogs = useCallback(() => {
    const logs = DebugLogger.getLogsAsText();
    console.log('📄 Debug logs exported:', logs);
    Alert.alert(
      'Debug Logs',
      'Debug logs have been copied to console. Check the development console for the full log.',
      [{ text: 'OK' }]
    );
  }, []);

  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };

  return {
    // State
    isDebugLogging,
    debugLogContent,
    showDebugPanel,
    
    // Actions
    setIsDebugLogging,
    setDebugLogContent,
    setShowDebugPanel,
    startDebugLogging,
    stopDebugLogging,
    clearDebugLogs,
    exportDebugLogs,
    toggleDebugPanel,
  };
};