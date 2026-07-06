import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStackNavigator } from './navigation/AuthStackNavigator';
import { RootNavigator } from './navigation/AppNavigator';
import { useAuthStore } from './store/authStore';

export default function App() {
  useEffect(() => {
    // Initialize auth state on app start
    useAuthStore.getState().initAuth();
  }, []);

  const { user, loading } = useAuthStore();

  // Show loading screen while initializing auth
  if (loading) {
    return (
      <NavigationContainer>
        <StatusBar style='auto' />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <RootNavigator />
      ) : (
        <AuthStackNavigator />
      )}
      <StatusBar style='auto' />
    </NavigationContainer>
  );
}
