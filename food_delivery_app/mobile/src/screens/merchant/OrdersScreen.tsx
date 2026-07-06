import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { merchantService, MerchantOrder } from '@/services/merchant';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
];

export function OrdersScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await merchantService.getOrders(activeTab === 'all' ? undefined : activeTab);
      setOrders(data);
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadOrders();

    const sub = merchantService.subscribeToOrders(() => {
      loadOrders();
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleAcceptOrder = async (order: MerchantOrder) => {
    Alert.alert(
      'Accept Order',
      `Accept order ${order.id} from ${order.customer_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await merchantService.updateOrderStatus(order.id, 'confirmed');
              Alert.alert('Success', 'Order accepted');
            } catch (e) {
              Alert.alert('Error', 'Failed to accept order');
            }
          },
        },
      ]
    );
  };

  const handleMarkReady = async (order: MerchantOrder) => {
    try {
      await merchantService.updateOrderStatus(order.id, 'ready');
      Alert.alert('Success', 'Order marked as ready');
    } catch (e) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#012d1d';
      case 'dispatched': return '#6366f1';
      case 'delivered': case 'completed': return '#22c55e';
      default: return '#9ca3af';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending': return '#fef3c7';
      case 'confirmed': return '#dbeafe';
      case 'preparing': return '#f3e8ff';
      case 'ready': return '#d1fae5';
      case 'dispatched': return '#e0e7ff';
      case 'delivered': case 'completed': return '#dcfce7';
      default: return '#f3f4f6';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const renderOrder = ({ item }: { item: MerchantOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { order: item })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.id.substring(0, 12)}</Text>
        <Text style={styles.orderTime}>{getTimeAgo(item.created_at)}</Text>
      </View>
      <View style={styles.orderRow}>
        <View>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.itemsText}>{item.items?.length || 0} items</Text>
        </View>
        <Text style={styles.amount}>TZS {item.total.toLocaleString()}</Text>
      </View>
      <View style={styles.orderFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOrder(item)}>
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        )}
        {item.status === 'preparing' && (
          <TouchableOpacity style={styles.readyBtn} onPress={() => handleMarkReady(item)}>
            <Text style={styles.readyBtnText}>Mark Ready</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#012d1d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No {activeTab !== 'all' ? activeTab : ''} orders</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  tabs: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: '#012d1d' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#fff', fontWeight: '500' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  orderTime: { fontSize: 12, color: '#6b7280' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  customerName: { fontSize: 14, color: '#374151' },
  itemsText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#012d1d' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  acceptBtn: { backgroundColor: '#012d1d', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  readyBtn: { backgroundColor: '#22c55e', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  readyBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
});