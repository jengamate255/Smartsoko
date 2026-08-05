import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useProductsStore } from '../../store/productsStore';
import { supabase } from '../../services/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const PostProductScreen = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { addProduct } = useProductsStore();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled && result.assets.length > 0) {
      setImageUrls(result.assets.map((asset) => asset.uri));
    }
  };

  const uploadImageToSupabase = async (fileUri: string): Promise<string> => {
    try {
      // Get file extension
      const fileExt = fileUri.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Get file as blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('product-images')
        .upload(fileName, blob, {
          contentType: 'image/' + fileExt,
          upsert: false
        });

      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !price || imageUrls.length === 0) {
      Alert.alert('Please fill in all fields and select at least one image');
      return;
    }

    setLoading(true);
    try {
      // Upload all images to Supabase Storage
      setUploading(true);
      const uploadedImageUrls = await Promise.all(
        imageUrls.map(async (uri) => {
          return await uploadImageToSupabase(uri);
        })
      );
      setUploading(false);

      // Create product record with uploaded image URLs
      await addProduct({
        title,
        description,
        price: parseFloat(price),
        image_url: uploadedImageUrls[0], // Using first image for main product image
        user_id: user?.id || '',
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setImageUrls([]);
      
      Alert.alert('Success', 'Product posted successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <MaterialCommunityIcons name='camera' size={80} color='#ff5a5f' style={{ alignSelf: 'center', marginBottom: 20 }} />
      <Text style={{ textAlign: 'center', fontSize: 24, marginVertical: 10 }}>Post a Product</Text>
      
      <TouchableOpacity
        onPress={pickImage}
        style={{
          borderWidth: 2,
          borderColor: '#ddd',
          borderRadius: 8,
          padding: 20,
          marginVertical: 10,
          alignItems: 'center',
        }}
      >
        {imageUrls.length === 0 ? (
          <>
            <MaterialCommunityIcons name='image' size={40} color='#666' />
            <Text style={{ marginTop: 10, color: '#666' }}>Tap to select images</Text>
          </>
        ) : (
          <>
            {imageUrls.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{ width: 100, height: 100, borderRadius: 8, margin: 5 }}
              />
            ))}
          </>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder='Product title'
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
      />
      <TextInput
        placeholder='Description'
        value={description}
        onChangeText={setDescription}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
      />
      <TextInput
        placeholder='Price'
        value={price}
        onChangeText={setPrice}
        keyboardType='numeric'
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
      />

      {uploading && (
        <View style={{ marginVertical: 10, alignItems: 'center' }}>
          <ActivityIndicator size='large' color='#ff5a5f' />
          <Text style={{ marginTop: 10 }}>Uploading images...</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        style={{ backgroundColor: '#ff5a5f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size='small' color='white' />
        ) : (
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Post Product</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
