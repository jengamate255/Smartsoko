import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MERCHANT_PROFILE = {
  name: 'Pizza Palace',
  owner: 'Ali Hassan',
  email: 'ali@pizzapalace.com',
  phone: '+255 700 000 123',
  address: 'Dar es Salaam, Tanzania',
  rating: 4.8,
  totalOrders: 1247,
  totalRevenue: 'TZS 24.5M',
  commission: 10,
};

export function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{MERCHANT_PROFILE.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{MERCHANT_PROFILE.name}</Text>
        <Text style={styles.owner}>Owner: {MERCHANT_PROFILE.owner}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{MERCHANT_PROFILE.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{MERCHANT_PROFILE.totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{MERCHANT_PROFILE.totalRevenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {[
          { icon: 'person', label: 'Profile Details' },
          { icon: 'store', label: 'Shop Settings' },
          { icon: 'receipt', label: 'Commission Rate', value: `${MERCHANT_PROFILE.commission}%` },
          { icon: 'payments', label: 'Payment Settings' },
          { icon: 'notifications', label: 'Notification Preferences' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem}>
            <MaterialIcons name={item.icon as any} size={24} color="#6b7280" />
            <Text style={styles.menuText}>{item.label}</Text>
            <Text style={styles.menuValue}>{item.value || ''}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        {[
          { icon: 'help', label: 'Help Center' },
          { icon: 'chat', label: 'Contact Support' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem}>
            <MaterialIcons name={item.icon as any} size={24} color="#6b7280" />
            <Text style={styles.menuText}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <MaterialIcons name="logout" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#012d1d',
    paddingTop: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  owner: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  menuValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});