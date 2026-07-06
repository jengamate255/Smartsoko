import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useProductsStore } from '../store/productsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const HomeScreen = () => {
  const { user } = useAuthStore();
  const { products, loading, error, fetchProducts } = useProductsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 10,
              margin: 10,
              backgroundColor: '#fff',
              borderRadius: 8,
              elevation: 2,
            }}
            onPress={() => {
              // Navigate to product detail (we would use navigation prop, but for simplicity we skip)
              console.log('Press product', item);
            }}
          >
            <Image
              source={{ uri: item.image_url }}
              style={{ width: 100, height: 100, borderRadius: 8 }}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
              <Text>{item.description}</Text>
              <Text style={{ color: 'green' }}></Text>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};
