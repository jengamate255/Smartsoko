import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootNavigationProp, OrderDetailRouteProp } from '@/types/navigation';
import { orderService } from '@/services/supabase';
import { Order, OrderStatus } from '@/types/models';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';

const ORDER_STATUSES: { status: OrderStatus; label: string; icon: string; color: string }[] = [
  { status: 'pending', label: 'Order Placed', icon: '📝', color: '#f59e0b' },
  { status: 'confirmed', label: 'Confirmed', icon: '✅', color: '#3b82f6' },
  { status: 'preparing', label: 'Preparing', icon: '👨‍🍳', color: '#8b5cf6' },
  { status: 'ready_for_delivery', label: 'Ready', icon: '📦', color: '#06b6d4' },
  { status: 'dispatched', label: 'Dispatched', icon: '🚚', color: '#6366f1' },
  { status: 'in_transit', label: 'In Transit', icon: '🛵', color: '#0ea5e9' },
  { status: 'delivered', label: 'Delivered', icon: '🎉', color: '#22c55e' },
  { status: 'cancelled', label: 'Cancelled', icon: '❌', color: '#ef4444' },
];

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    try {
      const data = await orderService.getById(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();

    // Subscribe to order updates
    const subscription = orderService.subscribeToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, loadOrder]);

  const getStatusIndex = (status: OrderStatus) => {
    return ORDER_STATUSES.findIndex((s) => s.status === status);
  };

  const currentStatusIndex = order ? getStatusIndex(order.status) : -1;

  if (!order && !isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadOrder} />}
    >
      {/* Order Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order?.id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.orderDate}>{order && formatRelativeTime(order.createdAt)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: ORDER_STATUSES[currentStatusIndex]?.color || '#666' },
          ]}
        >
          <Text style={styles.statusText}>
            {ORDER_STATUSES[currentStatusIndex]?.label || order?.status}
          </Text>
        </View>
      </View>

      {/* Order Tracking */}
      {order?.status !== 'cancelled' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.timeline}>
            {ORDER_STATUSES.filter((s) => s.status !== 'cancelled').map((status, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <View key={status.status} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    <Text style={styles.timelineIcon}>{status.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelCompleted,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}
                  >
                    {status.label}
                  </Text>
                  {index < ORDER_STATUSES.length - 2 && (
                    <View
                      style={[
                        styles.timelineLine,
                        index < currentStatusIndex && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order?.items.map((item, index) => (
          <View key={index} style={styles.item}>
            <View style={styles.itemQuantity}>
              <Text style={styles.quantityText}>{item.quantity}x</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(order?.total || 0)}</Text>
        </View>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{order?.deliveryAddress}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{order?.phone}</Text>
        </View>
        {order?.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={styles.detailValue}>{order.notes}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment</Text>
          <Text style={styles.detailValue}>
            {order?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Mobile Money'}
          </Text>
        </View>
      </View>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => order && navigation.navigate('Chat', { orderId: order.id })}
      >
        <Text style={styles.chatButtonText}>💬 Chat about this order</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#666' },
  backLink: { color: '#012d1d', marginTop: 16, fontWeight: '600' },
  header: {
    backgroundColor: '#012d1d',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  orderId: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  orderDate: { fontSize: 14, color: '#c1ecd4', marginTop: 4 },
  statusBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#012d1d', marginBottom: 16 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  timelineItem: { alignItems: 'center', flex: 1 },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDotCompleted: { backgroundColor: '#012d1d' },
  timelineDotCurrent: { backgroundColor: '#012d1d', transform: [{ scale: 1.1 }] },
  timelineIcon: { fontSize: 16 },
  timelineLabel: { fontSize: 10, color: '#999', textAlign: 'center' },
  timelineLabelCompleted: { color: '#012d1d', fontWeight: '500' },
  timelineLabelCurrent: { color: '#012d1d', fontWeight: 'bold' },
  timelineLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#f0f0f0',
  },
  timelineLineCompleted: { backgroundColor: '#012d1d' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemQuantity: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityText: { fontSize: 12, fontWeight: '600', color: '#666' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#012d1d' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e5e5',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#012d1d' },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#333' },
  chatButton: {
    margin: 20,
    backgroundColor: '#012d1d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bottomSpacing: { height: 40 },
});
