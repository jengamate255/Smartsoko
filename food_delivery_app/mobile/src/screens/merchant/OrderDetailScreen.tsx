import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function OrderDetailScreen({ route, navigation }: any) {
  const { order } = route.params || {};

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>No order details</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#012d1d';
      case 'dispatched': return '#6366f1';
      case 'delivered': return '#22c55e';
      default: return '#9ca3af';
    }
  };

  const orderSteps = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered'];
  const currentStep = orderSteps.indexOf(order.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Order {order.id}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.customerName}>{order.customer}</Text>
            <Text style={styles.amount}>TZS {order.amount?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Progress</Text>
          <View style={styles.progressRow}>
            {['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered'].map((step, i) => (
              <View key={step} style={styles.progressItem}>
                <View style={[
                  styles.progressDot,
                  i <= currentStep ? styles.progressDotActive : styles.progressDotInactive
                ]} />
                <Text style={[
                  styles.progressLabel,
                  i <= currentStep && styles.progressLabelActive
                ]}>
                  {step.substring(0, 3)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({order.items} items)</Text>
          {/* Add items list here */}
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Details</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{order.customer}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#6b7280" />
            <Text style={styles.infoText}>Dar es Salaam, Tanzania</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color="#6b7280" />
            <Text style={styles.infoText}>+255 700 000 000</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {order.status === 'pending' && (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]}>
                <Text style={styles.actionBtnText}>Accept Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]}>
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {order.status === 'preparing' && (
            <TouchableOpacity style={[styles.actionBtn, styles.readyBtn]}>
              <Text style={styles.actionBtnText}>Mark as Ready</Text>
            </TouchableOpacity>
          )}
          {order.status === 'ready' && (
            <TouchableOpacity style={[styles.actionBtn, styles.dispatchBtn]}>
              <Text style={styles.actionBtnText}>Request Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#012d1d',
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderInfo: {
    alignItems: 'center',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#012d1d',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#012d1d',
  },
  progressDotInactive: {
    backgroundColor: '#e5e7eb',
  },
  progressLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  progressLabelActive: {
    color: '#012d1d',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#012d1d',
  },
  rejectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  readyBtn: {
    backgroundColor: '#22c55e',
  },
  dispatchBtn: {
    backgroundColor: '#6366f1',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});