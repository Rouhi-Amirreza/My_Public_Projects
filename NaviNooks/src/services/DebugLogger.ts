/**
 * DebugLogger Service - Captures debug output for schedule calculations
 * This helps track what's happening during travel mode selection and schedule calculations
 */

interface LogEntry {
  timestamp: string;
  level: 'LOG' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private isActive: boolean = false;
  private maxLogs: number = 1000; // Prevent memory issues

  constructor() {
    console.log('🔧 DebugLogger initialized');
  }

  /**
   * Start capturing debug logs
   */
  start(): void {
    try {
      this.isActive = true;
      this.logs = [];
      this.log('🔍 Debug logging started for schedule calculations');
      console.log('✅ DebugLogger started successfully');
    } catch (error) {
      console.error('❌ DebugLogger start failed:', error);
    }
  }

  /**
   * Stop capturing debug logs
   */
  stop(): void {
    this.log('🔍 Debug logging stopped');
    this.isActive = false;
  }

  /**
   * Log a message with optional data
   */
  log(message: string, data?: any): void {
    if (!this.isActive) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'LOG',
      message,
      data
    };

    this.addEntry(entry);
    
    // Also log to console for immediate visibility
    if (data) {
      console.log(`[DebugLogger] ${message}`, data);
    } else {
      console.log(`[DebugLogger] ${message}`);
    }
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: any): void {
    if (!this.isActive) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data
    };

    this.addEntry(entry);
    
    if (data) {
      console.warn(`[DebugLogger] ${message}`, data);
    } else {
      console.warn(`[DebugLogger] ${message}`);
    }
  }

  /**
   * Log an error
   */
  error(message: string, data?: any): void {
    if (!this.isActive) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      data
    };

    this.addEntry(entry);
    
    if (data) {
      console.error(`[DebugLogger] ${message}`, data);
    } else {
      console.error(`[DebugLogger] ${message}`);
    }
  }

  /**
   * Log detailed debug information
   */
  debug(message: string, data?: any): void {
    if (!this.isActive) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data
    };

    this.addEntry(entry);
    
    if (data) {
      console.log(`[DebugLogger] 🔍 ${message}`, data);
    } else {
      console.log(`[DebugLogger] 🔍 ${message}`);
    }
  }

  /**
   * Add entry to logs array
   */
  private addEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Prevent memory issues by keeping only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get all captured logs as a formatted string
   */
  getLogsAsText(): string {
    if (this.logs.length === 0) {
      return 'No debug logs captured yet.';
    }

    const header = `Debug Log Report - Generated: ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`;
    
    const logEntries = this.logs.map(entry => {
      let logLine = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
      
      if (entry.data) {
        const dataStr = typeof entry.data === 'object' 
          ? JSON.stringify(entry.data, null, 2)
          : String(entry.data);
        logLine += `\nData: ${dataStr}`;
      }
      
      return logLine;
    }).join('\n\n');

    const footer = `\n${'='.repeat(60)}\nTotal entries: ${this.logs.length}`;
    
    return header + logEntries + footer;
  }

  /**
   * Get logs as JSON array
   */
  getLogsAsJSON(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs = [];
    this.log('🗑️ Debug logs cleared');
  }

  /**
   * Get current status
   */
  getStatus(): { isActive: boolean; logCount: number } {
    return {
      isActive: this.isActive,
      logCount: this.logs.length
    };
  }

  /**
   * Export logs to a downloadable format (for React Native)
   */
  exportLogs(): string {
    const logsText = this.getLogsAsText();
    
    // In React Native, we'll just return the text content
    // The UI can handle copying to clipboard or sharing
    return logsText;
  }

  /**
   * Log travel mode selection specifically
   */
  logTravelModeSelection(rideId: string, mode: 'driving' | 'walking', travelTime: number): void {
    this.debug('Travel Mode Selection', {
      rideId,
      selectedMode: mode,
      travelTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log schedule calculation step
   */
  logScheduleCalculation(step: string, place: string, arrivalTime: string, departureTime: string, travelTime?: number): void {
    this.debug('Schedule Calculation Step', {
      step,
      place,
      arrivalTime,
      departureTime,
      travelTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log travel options data
   */
  logTravelOptions(rideId: string, options: any): void {
    this.debug('Travel Options Available', {
      rideId,
      options,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

export default debugLogger;