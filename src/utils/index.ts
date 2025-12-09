/**
 * Utility functions export
 */

export {
  deepCopyImageData,
  areImageDataEqual,
  verifyImmutability,
  createImmutableSnapshot,
  validateEditImmutability,
} from './imageData';

export {
  errorLogger,
  logError,
  logWarning,
  logInfo,
  logCritical,
  ErrorSeverity,
} from './errorLogger';

export type { ErrorLogEntry } from './errorLogger';
