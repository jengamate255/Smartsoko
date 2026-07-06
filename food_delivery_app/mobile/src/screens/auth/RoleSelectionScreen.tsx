/**
 * Role Selection Screen
 * Choose between Customer, Merchant, or Driver during signup
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp, UserRole } from '@/types/navigation';

const ROLES: { id: UserRole; title: string; description: string; icon: string }[] = [
  {
    id: 'customer',
    title: 'Customer',
    description: 'Shop from local vendors and get delivery',
    icon: '🛒',
  },
  {
    id: 'merchant',
    title: 'Vendor/Merchant',
    description: 'Sell your products and manage orders',
    icon: '🏪',
  },
  {
    id: 'driver',
    title: 'Delivery Driver',
    description: 'Earn by delivering orders to customers',
    icon: '🚚',
  },
];

export const RoleSelectionScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();

  const selectRole = (role: UserRole) => {
    navigation.navigate('Signup', { role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join SmartSoko</Text>
        <Text style={styles.subtitle}>Select how you want to use the app</Text>

        <View style={styles.rolesContainer}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={styles.roleCard}
              onPress={() => selectRole(role.id)}
            >
              <Text style={styles.roleIcon}>{role.icon}</Text>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  rolesContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  roleIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#012d1d',
    fontSize: 14,
    fontWeight: '500',
  },
});
