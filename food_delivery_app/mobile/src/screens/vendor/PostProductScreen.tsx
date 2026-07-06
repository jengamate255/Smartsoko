/**
 * Post Product Screen
 * Merchant interface for adding new products with image upload
 * Features: Camera/Gallery selection, image optimization, offline handling
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { storageService } from '@/services/supabase';
import { pickImage, optimizeImage, validateImage, formatFileSize } from '@/utils/imageOptimizer';
import { CATEGORIES } from '@/constants/categories';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  stock: string;
  unit: string;
  isAvailable: boolean;
  tags: string;
}

interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
  fileSize?: number;
  type?: string;
}

export const PostProductScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const { user } = useAuth();

  // Form state
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: CATEGORIES[0].name,
    stock: '',
    unit: 'piece',
    isAvailable: true,
    tags: '',
  });

  // Image state
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle form input changes
  const updateForm = useCallback((field: keyof ProductForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Pick image from camera
  const handleCameraPick = async () => {
    try {
      const asset = await pickImage('camera', {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (asset) {
        const validation = validateImage(asset, { maxSizeMB: 10 });
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.error);
          return;
        }
        setImages(prev => [...prev, asset]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to capture image');
    }
  };

  // Pick image from gallery
  const handleGalleryPick = async () => {
    try {
      const asset = await pickImage('gallery', {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (asset) {
        const validation = validateImage(asset, { maxSizeMB: 10 });
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.error);
          return;
        }
        setImages(prev => [...prev, asset]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select image');
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Optimize and upload images
  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        // Optimize image before upload
        const optimized = await optimizeImage(images[i].uri, {
          maxWidth: 1200,
          quality: 0.8,
          format: 'jpeg',
        });

        // Upload to Supabase Storage
        const fileName = `products/${user?.id}/${Date.now()}_${i}.jpg`;
        
        // Convert URI to blob for upload
        const response = await fetch(optimized.uri);
        const blob = await response.blob();

        await storageService.uploadFile('products', fileName, blob);
        
        // Get public URL
        const publicUrl = storageService.getPublicUrl('products', fileName);
        uploadedUrls.push(publicUrl);

        setUploadProgress(((i + 1) / images.length) * 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image ${i + 1}`);
      }
    }

    return uploadedUrls;
  };

  // Submit product
  const handleSubmit = async () => {
    // Validation
    if (!form.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    if (!form.price.trim() || isNaN(parseFloat(form.price))) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Prepare product data
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        original_price: form.originalPrice ? parseFloat(form.originalPrice) : null,
        category: form.category,
        stock: form.stock ? parseInt(form.stock) : null,
        unit: form.unit,
        is_available: form.isAvailable,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: imageUrls,
        seller_id: user?.id,
        created_at: new Date().toISOString(),
      };

      // Create product in database
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      Alert.alert(
        'Success',
        'Product created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create product');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Category selector
  const renderCategorySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryScrollContent}
    >
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.name}
          style={[
            styles.categoryChip,
            form.category === category.name && styles.categoryChipActive,
          ]}
          onPress={() => updateForm('category', category.name)}
        >
          <Text
            style={[
              styles.categoryChipText,
              form.category === category.name && styles.categoryChipTextActive,
            ]}
          >
            {category.displayName}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagePreviewScroll}
            >
              {images.map((image, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                  {image.fileSize && (
                    <Text style={styles.imageSizeText}>
                      {formatFileSize(image.fileSize)}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleCameraPick}
              disabled={isUploading}
            >
              <Text style={styles.imageButtonIcon}>📷</Text>
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleGalleryPick}
              disabled={isUploading}
            >
              <Text style={styles.imageButtonIcon}>🖼️</Text>
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Product Name *"
            value={form.name}
            onChangeText={(text) => updateForm('name', text)}
            maxLength={100}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={form.description}
            onChangeText={(text) => updateForm('description', text)}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <Text style={styles.label}>Category *</Text>
          {renderCategorySelector()}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={form.price}
                onChangeText={(text) => updateForm('price', text)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Original Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={form.originalPrice}
                onChangeText={(text) => updateForm('originalPrice', text)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Stock</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={form.stock}
                onChangeText={(text) => updateForm('stock', text)}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="piece, kg, liter..."
                value={form.unit}
                onChangeText={(text) => updateForm('unit', text)}
              />
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChangeText={(text) => updateForm('tags', text)}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Available for Sale</Text>
            <Switch
              value={form.isAvailable}
              onValueChange={(value) => updateForm('isAvailable', value)}
              trackColor={{ false: '#767577', true: '#012d1d' }}
              thumbColor={form.isAvailable ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Product</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#012d1d',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 12,
  },
  imagePreviewScroll: {
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSizeText: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  imageButtonIcon: {
    fontSize: 20,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#012d1d',
  },
  progressText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#012d1d',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#012d1d',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});
