import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '@/types/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/supabase';
import { formatCurrency } from '@/utils/formatters';

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const { items, total, clearCart, vendorsInCart } = useCart();
  const { user } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'mobile_money'>('cod');

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter a delivery address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Group items by vendor
      const vendorGroups = vendorsInCart.map((vendorId) => ({
        vendorId,
        items: items.filter((item) => item.sellerId === vendorId),
      }));

      // Create orders for each vendor
      const orderPromises = vendorGroups.map((group) =>
        orderService.create({
          customerId: user!.id,
          sellerId: group.vendorId,
          items: group.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          total: group.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          deliveryAddress,
          phone,
          notes,
          paymentMethod,
        })
      );

      await Promise.all(orderPromises);

      await clearCart();

      Alert.alert('Order Placed!', 'Your order has been placed successfully.', [
        { text: 'View Orders', onPress: () => navigation.navigate('Orders') },
        { text: 'Continue Shopping', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemSeller}>{item.sellerName}</Text>
              </View>
              <View style={styles.itemPrice}>
                <Text style={styles.quantity}>x{item.quantity}</Text>
                <Text style={styles.price}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Delivery Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={2}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Any special instructions?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('cod')}
          >
            <Text style={styles.paymentIcon}>💵</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentSubtitle}>Pay when you receive</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'cod' && styles.radioActive]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'mobile_money' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('mobile_money')}
          >
            <Text style={styles.paymentIcon}>📱</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Mobile Money</Text>
              <Text style={styles.paymentSubtitle}>M-Pesa, Tigo Pesa, etc.</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'mobile_money' && styles.radioActive]} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>{formatCurrency(total)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, isLoading && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666' },
  backLink: { color: '#012d1d', marginTop: 16, fontWeight: '600' },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#012d1d', marginBottom: 16 },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  itemSeller: { fontSize: 12, color: '#666', marginTop: 2 },
  itemPrice: { alignItems: 'flex-end' },
  quantity: { fontSize: 12, color: '#666' },
  price: { fontSize: 14, fontWeight: '600', color: '#012d1d', marginTop: 2 },
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
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionActive: { borderColor: '#012d1d', backgroundColor: '#f0f9f4' },
  paymentIcon: { fontSize: 24, marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  paymentSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  radioActive: { borderColor: '#012d1d', backgroundColor: '#012d1d' },
  bottomSpacing: { height: 100 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalContainer: { flex: 1 },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: '#012d1d' },
  placeOrderButton: {
    backgroundColor: '#012d1d',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  placeOrderButtonDisabled: { opacity: 0.7 },
  placeOrderText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
