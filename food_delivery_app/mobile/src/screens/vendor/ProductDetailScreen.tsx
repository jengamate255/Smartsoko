import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootNavigationProp, ProductDetailRouteProp } from '@/types/navigation';
import { productService, vendorService } from '@/services/supabase';
import { useCart } from '@/context/CartContext';
import { Product, Vendor } from '@/types/models';
import { formatCurrency } from '@/utils/formatters';

export const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ProductDetailRouteProp>();
  const { productId, vendorId } = route.params;
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [productData, vendorData] = await Promise.all([
        productService.getById(productId),
        vendorService.getById(vendorId),
      ]);
      setProduct(productData);
      setVendor(vendorData);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  }, [productId, vendorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addItem({
        productId: product.id,
        sellerId: product.sellerId,
        name: product.name,
        price: product.price,
        quantity,
        image: undefined,
        sellerName: vendor?.name || '',
      });
      Alert.alert('Added to Cart', `${quantity} x ${product.name} added to your cart`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Could not add item to cart');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#012d1d" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPrice = product.price * quantity;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Text style={styles.imagePlaceholder}>🍽️</Text>
          {product.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.category}>{product.category}</Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          </View>

          {/* Vendor Info */}
          <TouchableOpacity
            style={styles.vendorRow}
            onPress={() => navigation.navigate('VendorDetail', { vendorId })}
          >
            <Text style={styles.vendorLabel}>From</Text>
            <Text style={styles.vendorName}>{vendor?.name}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{product.category}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Availability</Text>
              <Text style={styles.detailValue}>
                {product.inStock !== false ? '✅ In Stock' : '❌ Out of Stock'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <Text style={[styles.quantityButtonText, quantity <= 1 && styles.disabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(1)}>
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Total & Add Button */}
        <View style={styles.actionContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <Text style={styles.addButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#666' },
  backLink: { color: '#012d1d', marginTop: 16, fontWeight: '600' },
  imageContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePlaceholder: { fontSize: 80 },
  popularBadge: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popularText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 20, color: '#012d1d' },
  infoContainer: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  category: { fontSize: 12, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#012d1d', flex: 1, marginRight: 16 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#012d1d' },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 20,
  },
  vendorLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  vendorName: { fontSize: 14, fontWeight: '600', color: '#012d1d', flex: 1 },
  arrow: { fontSize: 18, color: '#666' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#012d1d', marginBottom: 12 },
  description: { fontSize: 14, color: '#666', lineHeight: 22 },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  bottomSpacing: { height: 120 },
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
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: { fontSize: 20, fontWeight: '600', color: '#012d1d' },
  disabled: { color: '#ccc' },
  quantityText: { fontSize: 16, fontWeight: '600', minWidth: 30, textAlign: 'center' },
  actionContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  totalContainer: { flex: 1 },
  totalLabel: { fontSize: 12, color: '#666' },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: '#012d1d' },
  addButton: {
    backgroundColor: '#012d1d',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
