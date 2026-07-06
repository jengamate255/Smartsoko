import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';
import * as Location from 'expo-location';

import { MerchantNavigator } from './src/navigation/MerchantNavigator';

LogBox.ignoreLogs([
  'Warning: ...',
  'Sending ...',
]);

export default function App() {
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#012d1d" />
        <MerchantNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#012d1d',
  },
});