import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext';
import { fontSize, borderRadius } from '../theme';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_CONFIG = {
  success: { label: 'Success' },
  error: { label: 'Error' },
  warning: { label: 'Warning' },
  info: { label: 'Info' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info', duration = 2000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ToastCard: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = TOAST_CONFIG[toast.type];
  const toastColor = colors[toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info'];

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onRemove());
  };

  return (
    <Animated.View style={[styles.toastCard, { opacity, borderLeftColor: toastColor, backgroundColor: colors.card }]}>
      <View style={styles.toastContent}>
        <Text style={[styles.toastLabel, { color: toastColor }]}>{cfg.label}</Text>
        <Text style={[styles.toastMessage, { color: colors.text }]}>{toast.message}</Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.toastClose}>
        <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({
  toasts,
  removeToast,
}) => {
  if (toasts.length === 0) return null;
  return (
    <View style={styles.container}>
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toastCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: {
    flex: 1,
  },
  toastLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  toastClose: {
    paddingLeft: 10,
  },
  closeText: {
    fontSize: 14,
  },
});
