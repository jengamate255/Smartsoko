import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface ProductCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  onPress: () => void;
}

export const ProductCard = ({ id, title, description, price, image_url, onPress }: ProductCardProps) => {
  return (
    <TouchableOpacity
      style={{
        padding: 10,
        margin: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 2,
      }}
      onPress={onPress}
    >
      <Image
        source={{ uri: image_url }}
        style={{ width: 100, height: 100, borderRadius: 8 }}
      />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text style={{ fontWeight: 'bold' }}>{title}</Text>
        <Text>{description}</Text>
        <Text style={{ color: 'green' }}></Text>
      </View>
    </TouchableOpacity>
  );
};
