/**
 * Home Screen
 * Main entry point with FlatList pagination, categories, and featured vendors
 * Optimized for mobile with proper list virtualization
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Dimensions,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainTabNavigationProp, RootNavigationProp } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProductStore } from '@/store/useProductStore';
import { Product, Vendor, CategoryInfo } from '@/types/models';
import { CATEGORIES } from '@/constants/categories';
import { formatCurrency, truncateText } from '@/utils/formatters';

const { width } = Dimensions.get('window');

// Section types for FlatList
enum SectionType {
  HEADER = 'header',
  CATEGORIES = 'categories',
  VENDORS = 'vendors',
  PRODUCTS_HEADER = 'products_header',
  PRODUCT = 'product',
  LOADING_MORE = 'loading_more',
}

interface Section {
  type: SectionType;
  data?: any;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNavigationProp & RootNavigationProp>();
  const { user } = useAuth();
  
  const {
    products,
    vendors,
    featuredProducts,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchProducts,
    fetchVendors,
    fetchMoreProducts,
    refresh,
    error,
    isOffline,
    clearError,
  } = useProductStore();

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchProducts(true),
      fetchVendors(),
    ]);
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Load more products (pagination)
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchMoreProducts();
    }
  }, [isLoadingMore, hasMore, fetchMoreProducts]);

  // Navigation handlers
  const handleCategoryPress = (category: CategoryInfo) => {
    navigation.navigate('Search', { category: category.name });
  };

  const handleVendorPress = (vendorId: string) => {
    navigation.navigate('VendorDetail', { vendorId });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { 
      productId: product.id, 
      vendorId: product.sellerId 
    });
  };

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  // Render Header Section
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.greeting}>
        Hello{user?.full_name ? `, ${user.full_name}` : ''} 👋
      </Text>
      <Text style={styles.subtitle}>What would you like to order today?</Text>

      <TouchableOpacity 
        style={styles.searchContainer}
        onPress={handleSearch}
        activeOpacity={0.8}
      >
        <Text style={styles.searchPlaceholder}>🔍 Search vendors, products...</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Categories Section
  const renderCategories = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shop by Category</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.name}
        renderItem={({ item }: { item: CategoryInfo }) => (
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(item)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
              <Text style={styles.categoryIconText}>
                {item.name === 'fishing' ? '🐟' :
                 item.name === 'fruits' ? '🍎' :
                 item.name === 'dairy' ? '🥛' :
                 item.name === 'vegetables' ? '🥬' :
                 item.name === 'bakery' ? '🥖' :
                 item.name === 'honey' ? '🍯' :
                 item.name === 'artisan' ? '🎨' :
                 item.name === 'food' ? '🍽️' : '🛍️'}
              </Text>
            </View>
            <Text style={styles.categoryName}>{item.displayName}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoriesContainer}
      />
    </View>
  );

  // Render Vendors Section
  const renderVendors = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Vendors</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={vendors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Vendor }) => (
          <TouchableOpacity
            style={styles.vendorCard}
            onPress={() => handleVendorPress(item.id)}
          >
            <View style={[styles.vendorAvatar, { backgroundColor: '#c1ecd4' }]}>
              <Text style={styles.vendorAvatarText}>🏪</Text>
            </View>
            <Text style={styles.vendorName} numberOfLines={1}>
              {truncateText(item.name, 20)}
            </Text>
            <Text style={styles.vendorCategory}>{item.category}</Text>
            <View style={styles.vendorMeta}>
              <Text style={styles.vendorRating}>⭐ {item.rating}</Text>
              <Text style={styles.vendorTime}>⏱️ {item.deliveryTime}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.vendorsContainer}
      />
    </View>
  );

  // Render Product Item
  const renderProduct: ListRenderItem<Product> = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
    >
      <View style={styles.productImage}>
        <Text style={styles.productImagePlaceholder}>🍽️</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>
        {formatCurrency(item.price)}
      </Text>
    </TouchableOpacity>
  );

  // Render Products Header
  const renderProductsHeader = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Popular Products</Text>
    </View>
  );

  // Render Loading More Footer
  const renderLoadingMore = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#012d1d" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  // Render Empty State
  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products found</Text>
        {error && (
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render Offline Banner
  const renderOfflineBanner = () => {
    if (!isOffline) return null;
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>⚠️ You are offline. Showing cached data.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderOfflineBanner()}
      
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productsRow}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={handleRefresh}
            tintColor="#012d1d"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={(
          <>
            {renderHeader()}
            {renderCategories()}
            {renderVendors()}
            {renderProductsHeader()}
          </>
        )}
        ListFooterComponent={renderLoadingMore}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#012d1d',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#c1ecd4',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  searchButton: {
    padding: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#012d1d',
  },
  seeAll: {
    color: '#666',
    fontSize: 14,
  },
  categoriesContainer: {
    paddingRight: 16,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconText: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    maxWidth: 70,
  },
  vendorsContainer: {
    paddingRight: 16,
  },
  vendorCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 160,
    alignItems: 'center',
  },
  vendorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorAvatarText: {
    fontSize: 28,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#012d1d',
    textAlign: 'center',
  },
  vendorCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  vendorMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  vendorRating: {
    fontSize: 12,
    color: '#666',
  },
  vendorTime: {
    fontSize: 12,
    color: '#666',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  productCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    width: (width - 56) / 2,
  },
  productImage: {
    height: 100,
    backgroundColor: '#e5e5e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImagePlaceholder: {
    fontSize: 32,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#012d1d',
  },
  bottomSpacing: {
    height: 100,
  },
  searchPlaceholder: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 100,
  },
  productsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
});
