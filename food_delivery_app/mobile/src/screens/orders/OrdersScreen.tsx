import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp, RootNavigationProp } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/supabase';
import { Order } from '@/types/models';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNavigationProp & RootNavigationProp>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await orderService.getForCustomer(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      preparing: '#8b5cf6',
      ready_for_delivery: '#06b6d4',
      dispatched: '#6366f1',
      in_transit: '#0ea5e9',
      delivered: '#22c55e',
      cancelled: '#ef4444',
    };
    return colors[status] || '#666';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadOrders} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{formatRelativeTime(item.createdAt)}</Text>
            <Text style={styles.orderItems}>{item.items.length} items • {formatCurrency(item.total)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#012d1d', marginBottom: 16 },
  orderCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  orderDate: { fontSize: 12, color: '#666', marginBottom: 4 },
  orderItems: { fontSize: 14, color: '#012d1d', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#012d1d', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666' },
});
