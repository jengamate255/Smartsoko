import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootNavigationProp, VendorDetailRouteProp } from '@/types/navigation';
import { vendorService, productService } from '@/services/supabase';
import { useCart } from '@/context/CartContext';
import { Vendor, Product } from '@/types/models';
import { formatCurrency, formatRating, truncateText } from '@/utils/formatters';

const { width } = Dimensions.get('window');

export const VendorDetailScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<VendorDetailRouteProp>();
  const { vendorId } = route.params;
  const { addItem } = useCart();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadVendorData = useCallback(async () => {
    try {
      const [vendorData, productsData] = await Promise.all([
        vendorService.getById(vendorId),
        productService.getByVendor(vendorId),
      ]);
      setVendor(vendorData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading vendor:', error);
      Alert.alert('Error', 'Failed to load vendor details');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadVendorData();
  }, [loadVendorData]);

  const handleAddToCart = async (product: Product) => {
    try {
      await addItem({
        productId: product.id,
        sellerId: product.sellerId,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        sellerName: vendor?.name || '',
      });
      Alert.alert('Added to Cart', `${product.name} added to your cart`);
    } catch (error) {
      Alert.alert('Error', 'Could not add item to cart');
    }
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id, vendorId });
  };

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  if (!vendor && !isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadVendorData} />}
      >
        {/* Vendor Header */}
        <View style={styles.header}>
          <View style={styles.vendorImagePlaceholder}>
            <Text style={styles.vendorImageText}>🏪</Text>
          </View>
          <Text style={styles.vendorName}>{vendor?.name}</Text>
          <Text style={styles.vendorCategory}>{vendor?.category}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatRating(vendor?.rating || 0)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{vendor?.deliveryTime}</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {vendor?.deliveryFee === 0 ? 'Free' : formatCurrency(vendor?.deliveryFee || 0)}
              </Text>
              <Text style={styles.statLabel}>Delivery Fee</Text>
            </View>
          </View>

          {vendor?.description && (
            <Text style={styles.description}>{vendor.description}</Text>
          )}

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat', { vendorId })}
          >
            <Text style={styles.chatButtonText}>💬 Chat with Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilter}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat === 'all' ? 'All Items' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'Item' : 'Items'}
          </Text>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => handleProductPress(product)}
                activeOpacity={0.8}
              >
                <View style={styles.productImage}>
                  <Text style={styles.productImagePlaceholder}>🍽️</Text>
                  {product.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Popular</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {truncateText(product.name, 30)}
                  </Text>
                  <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  {product.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddToCart(product)}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
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
  vendorImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#c1ecd4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  vendorImageText: { fontSize: 48 },
  vendorName: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  vendorCategory: { fontSize: 14, color: '#c1ecd4', textTransform: 'capitalize', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#c1ecd4', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  description: {
    fontSize: 14,
    color: '#c1ecd4',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  chatButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  chatButtonText: { color: '#012d1d', fontWeight: '600', fontSize: 14 },
  categoryFilter: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#012d1d' },
  categoryChipText: { color: '#666', fontSize: 14, textTransform: 'capitalize' },
  categoryChipTextActive: { color: '#fff' },
  productsSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#012d1d', marginBottom: 16 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: (width - 56) / 2,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    height: 120,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImagePlaceholder: { fontSize: 40 },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '500', color: '#333', lineHeight: 20 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#012d1d', marginTop: 4 },
  productDescription: { fontSize: 12, color: '#666', marginTop: 4, lineHeight: 16 },
  addButton: {
    backgroundColor: '#012d1d',
    margin: 12,
    marginTop: 0,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bottomSpacing: { height: 100 },
});
