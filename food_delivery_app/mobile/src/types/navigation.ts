/**
 * Navigation Types for React Navigation
 */

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Signup: { role?: string } | undefined;
  ForgotPassword: undefined;
  RoleSelection: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Search: { query?: string; category?: string } | undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

// Root Stack (overlay screens)
export type RootStackParamList = {
  Main: undefined;
  VendorDetail: { vendorId: string };
  ProductDetail: { productId: string; vendorId?: string };
  PostProduct: undefined;
  Chat: { chatId?: string; orderId?: string; driverId?: string };
  ChatList: undefined;
  Checkout: { cartSnapshot?: string };
  OrderDetail: { orderId: string };
  EditProfile: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  Settings: undefined;
  Notifications: undefined;
};

// Navigation Props
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Route Props
export type VendorDetailRouteProp = RouteProp<RootStackParamList, 'VendorDetail'>;
export type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
export type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
export type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;
export type SearchRouteProp = RouteProp<MainTabParamList, 'Search'>;
export type SignupRouteProp = RouteProp<AuthStackParamList, 'Signup'>;
