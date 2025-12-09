import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationData, NotificationType } from '../components/Notification';

/**
 * Notification Context
 * 
 * Provides a global notification system for displaying success/error messages
 * 
 * Requirements: 6.4, 6.5
 */

interface NotificationContextValue {
  notifications: NotificationData[];
  showNotification: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

let notificationIdCounter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration: number = 4000) => {
      const id = `notification-${++notificationIdCounter}`;
      const notification: NotificationData = {
        id,
        type,
        title,
        message,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);
    },
    []
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showNotification('success', title, message);
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showNotification('error', title, message, 6000); // Errors stay longer
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showNotification('info', title, message);
    },
    [showNotification]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value: NotificationContextValue = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
