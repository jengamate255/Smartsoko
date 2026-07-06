import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Margherita Pizza', price: 18000, category: 'Pizza', stock: 45, image: '🍕', available: true },
  { id: '2', name: 'Veggie Burger', price: 12000, category: 'Burgers', stock: 100, image: '🍔', available: true },
  { id: '3', name: 'Salmon Roll', price: 15000, category: 'Sushi', stock: 20, image: '🍣', available: true },
  { id: '4', name: 'Chicken Curry', price: 14000, category: 'Curry', stock: 0, image: '🍛', available: false },
  { id: '5', name: 'Caesar Salad', price: 10000, category: 'Salads', stock: 30, image: '🥗', available: true },
];

export function ProductsScreen() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const toggleAvailability = (id: string) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, available: !p.available } : p
    ));
  };

  const renderProduct = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        <Text style={styles.productEmoji}>{item.image}</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>TZS {item.price.toLocaleString()}</Text>
          <Text style={[styles.stock, { color: item.stock === 0 ? '#ef4444' : '#6b7280' }]}>
            Stock: {item.stock}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.toggleBtn, item.available ? styles.available : styles.unavailable]}
        onPress={() => toggleAvailability(item.id)}
      >
        <MaterialIcons 
          name={item.available ? 'toggle-on' : 'toggle-off'} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity style={styles.addBtn}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#012d1d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productEmoji: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#012d1d',
  },
  stock: {
    fontSize: 12,
  },
  toggleBtn: {
    padding: 4,
  },
  available: {
    opacity: 1,
  },
  unavailable: {
    opacity: 0.5,
  },
});