/**
 * Root Navigation - Handles Auth vs Main app flow
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList } from '@/types/navigation';

// Navigators
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

// Screens that can be accessed from anywhere
import { ChatScreen } from '@/screens/chat/ChatScreen';
import { VendorDetailScreen } from '@/screens/vendor/VendorDetailScreen';
import { ProductDetailScreen } from '@/screens/vendor/ProductDetailScreen';
import { PostProductScreen } from '@/screens/vendor/PostProductScreen';
import { OrderDetailScreen } from '@/screens/orders/OrderDetailScreen';
import { CheckoutScreen } from '@/screens/cart/CheckoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Could show a splash screen here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Flow
          <Stack.Screen name="Main" component={AuthNavigator} />
        ) : (
          // Main App Flow
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            
            {/* Modal/Overlay Screens */}
            <Stack.Screen 
              name="VendorDetail" 
              component={VendorDetailScreen}
              options={{ 
                headerShown: true,
                headerTitle: '',
                presentation: 'card',
              }}
            />
            <Stack.Screen 
              name="ProductDetail" 
              component={ProductDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OrderDetail" 
              component={OrderDetailScreen}
              options={{ 
                headerShown: true,
                headerTitle: 'Order Details',
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ 
                headerShown: true,
                headerTitle: 'Chat',
              }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ 
                headerShown: true,
                headerTitle: 'Checkout',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="PostProduct" 
              component={PostProductScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
