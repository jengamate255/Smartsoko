import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Screens
import { DashboardScreen } from '../screens/merchant/DashboardScreen';
import { OrdersScreen } from '../screens/merchant/OrdersScreen';
import { MapTrackingScreen } from '../screens/merchant/MapTrackingScreen';
import { ProductsScreen } from '../screens/merchant/ProductsScreen';
import { ProfileScreen } from '../screens/merchant/ProfileScreen';
import { OrderDetailScreen } from '../screens/merchant/OrderDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Icons
function getTabIcon(routeName: string, focused: boolean) {
  const iconMap: Record<string, string> = {
    Dashboard: 'dashboard',
    Orders: 'receipt-long',
    Tracking: 'map',
    Products: 'inventory-2',
    Profile: 'person',
  };
  
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <MaterialIcons
        name={iconMap[routeName] as any}
        size={24}
        color={focused ? '#fff' : '#9ca3af'}
      />
    </View>
  );
}

// Main Tab Navigator
function MerchantTabs() {
  return (
    <Tab.Navigator
      screen={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => getTabIcon(route.name, focused),
        tabBarLabel: '',
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Tracking" component={MapTrackingScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Stack Navigator
export function MerchantNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MerchantTabs} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {
    backgroundColor: '#012d1d',
  },
  tabBar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingTop: 8,
  },
});