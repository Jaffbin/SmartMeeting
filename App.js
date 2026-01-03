import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { auth } from './src/config/firebase';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MeetingDetailScreen from './src/screens/MeetingDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import TeamMemberScreen from './src/screens/TeamMemberScreen';
import UploadScreen from './src/screens/UploadScreen';

const Stack = createNativeStackNavigator();

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef(null);
  const { theme, isDarkMode, isLoading: themeLoading } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (navigationRef.current) {
        if (user) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }
    });
    return unsubscribe;
  }, []);

  if (loading || themeLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.background 
      }}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={user ? "Home" : "Login"}
          screenOptions={{
            headerShown: true,
            headerStyle: { 
              backgroundColor: theme.surface,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            headerTintColor: theme.text,
            headerTitleStyle: { 
              fontWeight: 'bold',
              color: theme.text,
            },
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: theme.background,
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />

          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              title: 'Meeting Assistant',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="Recording" 
            component={RecordingScreen}
            options={{ title: 'Record Meeting' }}
          />
          <Stack.Screen 
            name="Upload" 
            component={UploadScreen}
            options={{ title: 'Upload Audio' }}
          />
          <Stack.Screen 
            name="MeetingDetail" 
            component={MeetingDetailScreen}
            options={{ title: 'Meeting Details' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen 
            name="TeamMember" 
            component={TeamMemberScreen}
            options={{ title: 'Team Members' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}