/**
 * Profile Screen
 * User profile management with settings and account options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp, RootNavigationProp } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProductStore } from '@/store/useProductStore';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNavigationProp & RootNavigationProp>();
  const { user, signOut, updateProfile } = useAuth();
  const { isOffline } = useProductStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleMyOrders = () => {
    navigation.navigate('Orders');
  };

  const handlePostProduct = () => {
    navigation.navigate('PostProduct');
  };

  const handleHelp = () => {
    Alert.alert('Help', 'Contact support at support@smartsoko.com');
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'Customer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const menuItems = [
    { icon: '📦', label: 'My Orders', onPress: handleMyOrders, showBadge: false },
    ...(user?.role === 'merchant' ? [{ icon: '➕', label: 'Post Product', onPress: handlePostProduct, showBadge: false }] : []),
    { icon: '📍', label: 'Addresses', onPress: () => navigation.navigate('AddressList'), showBadge: false },
    { icon: '💳', label: 'Payment Methods', onPress: () => {}, showBadge: false },
    { icon: '🎁', label: 'Promotions', onPress: () => {}, showBadge: true },
    { icon: '🔔', label: 'Notifications', onPress: () => {}, showBadge: false, hasSwitch: true, switchValue: notifications, onSwitchChange: setNotifications },
    { icon: '🌙', label: 'Dark Mode', onPress: () => {}, showBadge: false, hasSwitch: true, switchValue: darkMode, onSwitchChange: setDarkMode },
    { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings'), showBadge: false },
    { icon: '❓', label: 'Help & Support', onPress: handleHelp, showBadge: false },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
          {user?.role === 'merchant' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏪</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.full_name || user?.email || 'Guest'}</Text>
        <Text style={styles.role}>{getRoleDisplay(user?.role)}</Text>
        
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}

        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
            onPress={item.onPress}
            disabled={item.hasSwitch}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.hasSwitch ? (
              <Switch
                value={item.switchValue}
                onValueChange={item.onSwitchChange}
                trackColor={{ false: '#767577', true: '#012d1d' }}
                thumbColor={item.switchValue ? '#fff' : '#f4f3f4'}
              />
            ) : (
              <>
                {item.showBadge && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
                <Text style={styles.chevron}>›</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>SmartSoko v1.0.0</Text>
        <Text style={styles.terms}>Terms of Service • Privacy Policy</Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        {isLoading ? (
          <ActivityIndicator color="#ef4444" />
        ) : (
          <Text style={styles.logoutText}>Sign Out</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#012d1d',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#c1ecd4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarText: {
    fontSize: 50,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#012d1d',
  },
  badgeText: {
    fontSize: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  role: {
    fontSize: 14,
    color: '#c1ecd4',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  offlineBadge: {
    marginTop: 8,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e5e5',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#012d1d',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
  newBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});
