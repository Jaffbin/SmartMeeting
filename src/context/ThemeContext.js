import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Light Theme Colors
export const lightTheme = {
  // Primary Colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA2FF',
  
  // Background Colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F9F9',
  
  // Text Colors
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  // Status Colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#00BCD4',
  
  // Border & Divider
  border: '#DDDDDD',
  divider: '#EEEEEE',
  
  // Task Priority Colors
  priorityHigh: '#FFEBEE',
  priorityHighBorder: '#F44336',
  priorityMedium: '#FFF3E0',
  priorityMediumBorder: '#FF9800',
  priorityLow: '#E8F5E9',
  priorityLowBorder: '#4CAF50',
  
  // Special Colors
  accent: '#9C27B0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Status Badge Colors
  statusCompleted: '#E8F5E9',
  statusProcessing: '#FFF3E0',
  statusFailed: '#FFEBEE',
  
  // Card Colors
  cardBackground: '#FFFFFF',
  cardBorder: 'transparent',
  
  // Input Colors
  inputBackground: '#F5F5F5',
  inputBorder: '#DDDDDD',
  placeholder: '#333333',
  
  // Modal Colors
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark Theme Colors
export const darkTheme = {
  // Primary Colors
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  primaryLight: '#409CFF',
  
  // Background Colors
  background: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',
  
  // Text Colors
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#EBEBF599',
  textInverse: '#000000',
  
  // Status Colors
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  
  // Border & Divider
  border: '#38383A',
  divider: '#48484A',
  
  // Task Priority Colors
  priorityHigh: '#3A2C2E',
  priorityHighBorder: '#FF453A',
  priorityMedium: '#3A342C',
  priorityMediumBorder: '#FF9F0A',
  priorityLow: '#2C3A2E',
  priorityLowBorder: '#30D158',
  
  // Special Colors
  accent: '#BF5AF2',
  overlay: 'rgba(0, 0, 0, 0.75)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Status Badge Colors
  statusCompleted: '#1C3A1C',
  statusProcessing: '#3A321C',
  statusFailed: '#3A1C1C',
  
  // Card Colors
  cardBackground: '#1C1C1E',
  cardBorder: '#38383A',
  
  // Input Colors
  inputBackground: '#2C2C2E',
  inputBorder: '#38383A',
  placeholder: '#FFFFFF',
  
  // Modal Colors
  modalBackground: '#1C1C1E',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};