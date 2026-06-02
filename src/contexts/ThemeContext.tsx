import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardBorder: string;
  surface: string;
  surfaceLight: string;
  input: string;
  inputBorder: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  warning: string;
  danger: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  error: string;
  tabBg: string;
  tabInactive: string;
  overlay: string;
  white: string;
  black: string;
  green: Record<string, string>;
  gray: Record<string, string>;
}

export const lightColors: ThemeColors = {
  background: '#F3F4F6',
  foreground: '#111827',
  card: '#FFFFFF',
  cardBorder: '#F0F0F0',
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
  input: '#F9FAFB',
  inputBorder: '#E5E7EB',
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  accent: '#00BCD4',
  warning: '#EF6C00',
  danger: '#C62828',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#4CAF50',
  error: '#EF5350',
  tabBg: '#F3F4F6',
  tabInactive: '#9CA3AF',
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  black: '#111111',
  green: {
    '50': '#E8F5E9', '100': '#C8E6C9', '200': '#A5D6A7', '300': '#81C784',
    '400': '#66BB6A', '500': '#4CAF50', '600': '#43A047', '700': '#388E3C',
    '800': '#2E7D32', '900': '#1B5E20',
  },
  gray: {
    '50': '#F9FAFB', '100': '#F3F4F6', '200': '#E5E7EB', '300': '#D1D5DB',
    '400': '#9CA3AF', '500': '#6B7280', '600': '#4B5563', '700': '#374151',
    '800': '#1F2937', '900': '#111827',
  },
};

export const darkColors: ThemeColors = {
  background: '#0A0A0A',
  foreground: '#F3F4F6',
  card: '#1F2937',
  cardBorder: '#374151',
  surface: '#1F2937',
  surfaceLight: '#111827',
  input: '#111827',
  inputBorder: '#374151',
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  accent: '#00BCD4',
  warning: '#EF6C00',
  danger: '#C62828',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#374151',
  success: '#4CAF50',
  error: '#EF5350',
  tabBg: '#374151',
  tabInactive: '#6B7280',
  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
  black: '#000000',
  green: {
    '50': '#E8F5E9', '100': '#C8E6C9', '200': '#A5D6A7', '300': '#81C784',
    '400': '#66BB6A', '500': '#4CAF50', '600': '#43A047', '700': '#388E3C',
    '800': '#2E7D32', '900': '#1B5E20',
  },
  gray: {
    '50': '#F9FAFB', '100': '#F3F4F6', '200': '#E5E7EB', '300': '#D1D5DB',
    '400': '#9CA3AF', '500': '#6B7280', '600': '#4B5563', '700': '#374151',
    '800': '#1F2937', '900': '#111827',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const fontSize = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, xxxl: 28, title: 32 };
export const borderRadius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 };

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setDark: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('theme').then((val) => {
      if (val === 'light' || val === 'dark') {
        setIsDark(val === 'dark');
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      SecureStore.setItemAsync('theme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const setDark = useCallback((val: boolean) => {
    setIsDark(val);
    SecureStore.setItemAsync('theme', val ? 'dark' : 'light').catch(() => {});
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
