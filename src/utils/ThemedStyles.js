import { Platform } from 'react-native';

export const createThemedStyles = (theme) => ({
  shadow: Platform.select({
    ios: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }),
  
  lightShadow: Platform.select({
    ios: {
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),

  // Common card style
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },

  // Common button styles
  primaryButton: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },

  secondaryButton: {
    backgroundColor: theme.surface,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },

  // Common text styles
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },

  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 15,
  },

  body: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 24,
  },

  caption: {
    fontSize: 14,
    color: theme.textSecondary,
  },

  // Common input style
  input: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    color: theme.text,
  },
});