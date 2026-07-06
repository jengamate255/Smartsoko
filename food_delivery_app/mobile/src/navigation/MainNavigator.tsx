/**
 * Main App Navigation - Bottom Tab Navigator
 * Core navigation structure for the mobile app
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types/navigation';
import { useCart } from '@/context/CartContext';

// Icons (using text-based icons for simplicity - replace with proper icon library)
const Icons = {
  Home: '🏠',
  Search: '🔍',
  Cart: '🛒',
  Orders: '📦',
  Profile: '👤',
};

// Screens
import { HomeScreen } from '@/screens/main/HomeScreen';
import { SearchScreen } from '@/screens/main/SearchScreen';
import { CartScreen } from '@/screens/cart/CartScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';

import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Cart Badge Component
const CartBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

export const MainNavigator: React.FC = () => {
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#012d1d',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={[styles.icon, { color }]}>{Icons.Home}</Text>
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={[styles.icon, { color }]}>{Icons.Search}</Text>
          ),
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View>
              <Text style={[styles.icon, { color }]}>{Icons.Cart}</Text>
              <CartBadge count={itemCount} />
            </View>
          ),
          tabBarLabel: 'Cart',
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={[styles.icon, { color }]}>{Icons.Orders}</Text>
          ),
          tabBarLabel: 'Orders',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={[styles.icon, { color }]}>{Icons.Profile}</Text>
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 5,
    paddingBottom: 25,
    height: 80,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
