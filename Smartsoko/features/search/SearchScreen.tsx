import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useProductsStore } from '../../store/productsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SearchScreen = () => {
  const [query, setQuery] = React.useState('');
  const { products, loading, error } = useProductsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real app, we would refetch with the query
    setRefreshing(false);
  };

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(query.toLowerCase())
  );

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
      <View style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
        <TextInput
          placeholder='Search products...'
          value={query}
          onChangeText={setQuery}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 10,
            marginRight: 10,
          }}
        />
        <TouchableOpacity
          style={{
            backgroundColor: '#ff5a5f',
            padding: 10,
            borderRadius: 8,
          }}
        >
          <MaterialCommunityIcons name='magnify' color='white' size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
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
