import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { merchantService } from '@/services/merchant';

export function DashboardScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    averageOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        merchantService.getStats(),
        merchantService.getOrders(),
      ]);
      setStats(statsData);
      setRecentOrders(ordersData.slice(0, 5));
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const sub = merchantService.subscribeToOrders(() => {
      loadData();
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatTZS = (amount: number) => {
    if (amount >= 1000000) return `TZS ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `TZS ${(amount / 1000).toFixed(0)}K`;
    return `TZS ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#012d1d';
      case 'dispatched': return '#6366f1';
      case 'delivered': case 'completed': return '#22c55e';
      default: return '#9ca3af';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#012d1d" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#012d1d" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>SmartSoko Merchant</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <MaterialIcons name="notifications" size={24} color="#012d1d" />
          {stats.pendingOrders > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#012d1d' }]}>
          <Text style={styles.statLabel}>Today Orders</Text>
          <Text style={styles.statValue}>{stats.todayOrders}</Text>
          <Text style={styles.statSub}>{stats.totalOrders} total</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#22c55e' }]}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={styles.statValue}>{formatTZS(stats.todayRevenue)}</Text>
          <Text style={styles.statSub}>{formatTZS(stats.totalRevenue)} total</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statSub}>Needs action</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#6366f1' }]}>
          <Text style={styles.statLabel}>Avg Order</Text>
          <Text style={styles.statValue}>{formatTZS(stats.averageOrderValue)}</Text>
          <Text style={styles.statSub}>Per order</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Orders')}>
            <MaterialIcons name="receipt-long" size={28} color="#fff" />
            <Text style={styles.actionText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Tracking')}>
            <MaterialIcons name="map" size={28} color="#fff" />
            <Text style={styles.actionText}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="add-circle" size={28} color="#fff" />
            <Text style={styles.actionText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentOrders.length > 0 ? recentOrders.map((order) => (
          <TouchableOpacity 
            key={order.id} 
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderDetail', { order })}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderTime}>{getTimeAgo(order.created_at)}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.customerName}>{order.customer_name}</Text>
              <Text style={styles.amount}>TZS {order.total.toLocaleString()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#012d1d', paddingTop: 60,
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  notificationBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#ef4444',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12,
    padding: 16, borderLeftWidth: 4,
  },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  statSub: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  seeAll: { fontSize: 14, color: '#012d1d', fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: '#012d1d', borderRadius: 12, padding: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  orderTime: { fontSize: 12, color: '#6b7280' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  customerName: { fontSize: 14, color: '#374151' },
  amount: { fontSize: 14, fontWeight: 'bold', color: '#012d1d' },
  statusBadge: { alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
});