import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ProductDetailScreenProps {
  // We would get the product ID from route params, but for simplicity we skip
}

export const ProductDetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Product Detail Screen</Text>
      {/* In a real app, we would fetch and display product details here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
