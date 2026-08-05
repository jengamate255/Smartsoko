import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#944a00',
  primaryContainer: '#e67e22',
  onPrimary: '#ffffff',
  surface: '#f7f9ff',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#edf4ff',
  onSurface: '#091d2e',
  onSurfaceVariant: '#564337',
  outlineVariant: '#dcc1b1',
  secondary: '#006d37',
  secondaryContainer: '#7bf8a1',
};

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const product = route?.params?.product;
  const productId = route?.params?.productId;

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.onSurface} />
      </TouchableOpacity>

      <Image source={{ uri: product.image_url }} style={styles.image} />

      <View style={styles.details}>
        <Text style={styles.brand}>By SmartSoko</Text>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.row}>
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={16} color="#fff" />
            <Text style={styles.ratingText}>4.5</Text>
          </View>
          <Text style={styles.reviewCount}>(24 reviews)</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.price}>KES {product.price?.toLocaleString()}</Text>

        <TouchableOpacity style={styles.addToCartBtn}>
          <MaterialCommunityIcons name="cart-plus" size={20} color={COLORS.onPrimary} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  scroll: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { paddingBottom: 32 },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, backgroundColor: COLORS.surfaceLowest, padding: 8, borderRadius: 24, elevation: 4 },
  image: { width: '100%', aspectRatio: 1 },
  details: { padding: 20 },
  brand: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.onSurface, marginTop: 4 },
  description: { fontSize: 15, color: COLORS.onSurfaceVariant, marginTop: 12, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  ratingText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  reviewCount: { marginLeft: 8, fontSize: 13, color: COLORS.onSurfaceVariant },
  divider: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: 16 },
  price: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryContainer, paddingVertical: 16, borderRadius: 12, marginTop: 16, gap: 8 },
  addToCartText: { color: COLORS.onPrimary, fontWeight: '600', fontSize: 16 },
  errorText: { fontSize: 16, color: COLORS.onSurfaceVariant },
});
