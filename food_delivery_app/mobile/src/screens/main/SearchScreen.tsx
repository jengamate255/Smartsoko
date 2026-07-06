import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MainTabNavigationProp, SearchRouteProp } from '@/types/navigation';
import { vendorService, productService } from '@/services/supabase';
import { Vendor, Product } from '@/types/models';
import { formatCurrency } from '@/utils/formatters';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNavigationProp>();
  const route = useRoute<SearchRouteProp>();
  const initialQuery = route.params?.query || '';
  const initialCategory = route.params?.category || '';

  const [query, setQuery] = useState(initialQuery);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendors' | 'products'>('vendors');

  useEffect(() => {
    if (initialQuery || initialCategory) {
      performSearch();
    }
  }, [initialQuery, initialCategory]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const [vendorResults, productResults] = await Promise.all([
        vendorService.getAll({ search: query, category: initialCategory, limit: 20 }),
        productService.search(query, { category: initialCategory, limit: 20 }),
      ]);
      setVendors(vendorResults);
      setProducts(productResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendors, products..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={performSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vendors' && styles.activeTab]}
          onPress={() => setActiveTab('vendors')}
        >
          <Text style={[styles.tabText, activeTab === 'vendors' && styles.activeTabText]}>
            Vendors ({vendors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Products ({products.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loading}>Searching...</Text>
      ) : (
        <FlatList
          data={activeTab === 'vendors' ? vendors : products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem}>
              <Text style={styles.resultName}>{item.name}</Text>
              {'price' in item && (
                <Text style={styles.resultPrice}>{formatCurrency(item.price)}</Text>
              )}
              {'category' in item && (
                <Text style={styles.resultCategory}>{item.category}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No results found</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchHeader: { flexDirection: 'row', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12, padding: 12 },
  searchButton: { justifyContent: 'center', padding: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#012d1d' },
  tabText: { color: '#666' },
  activeTabText: { color: '#012d1d', fontWeight: '600' },
  loading: { textAlign: 'center', padding: 24 },
  resultItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultName: { fontSize: 16, fontWeight: '500', color: '#012d1d' },
  resultPrice: { fontSize: 14, color: '#666', marginTop: 4 },
  resultCategory: { fontSize: 12, color: '#999', textTransform: 'capitalize' },
  empty: { textAlign: 'center', padding: 48, color: '#666' },
});
