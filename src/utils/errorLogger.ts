/**
 * Error Logger Utility
 * 
 * Provides centralized error logging functionality for the application.
 * In development, logs to console. In production, could send to error tracking service.
 * 
 * Requirements: 7.4
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  component?: string;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  /**
   * Log an error with context
   */
  log(
    message: string,
    error?: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    component?: string,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      severity,
      component,
      message,
      error,
      context,
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Log to console based on severity
    this.logToConsole(entry);

    // In production, send to error tracking service
    // this.sendToErrorTrackingService(entry);
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.severity.toUpperCase()}]${
      entry.component ? ` [${entry.component}]` : ''
    }`;

    switch (entry.severity) {
      case ErrorSeverity.LOW:
        console.info(prefix, entry.message, entry.context || '');
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(prefix, entry.message, entry.context || '');
        if (entry.error) {
          console.warn('Error:', entry.error);
        }
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error(prefix, entry.message, entry.context || '');
        if (entry.error) {
          console.error('Error:', entry.error);
          if (entry.error.stack) {
            console.error('Stack:', entry.error.stack);
          }
        }
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by severity
   */
  getLogsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
    return this.logs.filter((log) => log.severity === severity);
  }

  /**
   * Get logs filtered by component
   */
  getLogsByComponent(component: string): ErrorLogEntry[] {
    return this.logs.filter((log) => log.component === component);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Convenience functions for different severity levels
 */
export const logError = (
  message: string,
  error?: Error,
  component?: string,
  context?: Record<string, unknown>
): void => {
  errorLogger.log(message, error, ErrorSeverity.HIGH, component, context);
};

export const logWarning = (
  message: string,
  component?: string,
  context?: Record<string, unknown>
): void => {
  errorLogger.log(message, undefined, ErrorSeverity.MEDIUM, component, context);
};

export const logInfo = (
  message: string,
  component?: string,
  context?: Record<string, unknown>
): void => {
  errorLogger.log(message, undefined, ErrorSeverity.LOW, component, context);
};

export const logCritical = (
  message: string,
  error?: Error,
  component?: string,
  context?: Record<string, unknown>
): void => {
  errorLogger.log(message, error, ErrorSeverity.CRITICAL, component, context);
};
