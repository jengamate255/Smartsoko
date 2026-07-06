import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp, RootNavigationProp } from '@/types/navigation';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNavigationProp & RootNavigationProp>();
  const { items, total, updateQuantity, removeItem, itemCount } = useCart();

  if (itemCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items to get started</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.browseButtonText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemImage}>
              <Text style={styles.itemImagePlaceholder}>🍽️</Text>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity onPress={() => updateQuantity(item.productId, -1)}>
                  <Text style={styles.quantityButton}>➖</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.productId, 1)}>
                  <Text style={styles.quantityButton}>➕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeItem(item.productId)}>
              <Text style={styles.removeButton}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#012d1d', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  browseButton: { backgroundColor: '#012d1d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  browseButtonText: { color: '#fff', fontWeight: 'bold' },
  cartItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  itemImage: { width: 60, height: 60, backgroundColor: '#f0f0f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemImagePlaceholder: { fontSize: 24 },
  itemDetails: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  itemPrice: { fontSize: 14, color: '#012d1d', marginTop: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  quantityButton: { fontSize: 16, padding: 4 },
  quantity: { fontSize: 14, fontWeight: '600', marginHorizontal: 12 },
  removeButton: { fontSize: 20, padding: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 16, color: '#666' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#012d1d' },
  checkoutButton: { backgroundColor: '#012d1d', padding: 16, borderRadius: 25, alignItems: 'center' },
  checkoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
