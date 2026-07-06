/**
 * Auth Navigation Stack - Login, Signup, Forgot Password
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignupScreen } from '@/screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { RoleSelectionScreen } from '@/screens/auth/RoleSelectionScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ headerShown: true, headerTitle: 'Reset Password' }}
      />
    </Stack.Navigator>
  );
};
