import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeStackNavigator } from './HomeStackNavigator';
import { SearchStackNavigator } from './SearchStackNavigator';
import { ChatStackNavigator } from './ChatStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { PostProductStackNavigator } from './PostProductStackNavigator';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#944a00';
const INACTIVE_COLOR = '#897365';

export const RootNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Search':
              iconName = 'magnify';
              break;
            case 'PostProduct':
              iconName = 'plus-circle';
              break;
            case 'Chat':
              iconName = 'chat';
              break;
            case 'Profile':
              iconName = 'account';
              break;
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Search" component={SearchStackNavigator} />
      <Tab.Screen name="PostProduct" component={PostProductStackNavigator} />
      <Tab.Screen name="Chat" component={ChatStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};
