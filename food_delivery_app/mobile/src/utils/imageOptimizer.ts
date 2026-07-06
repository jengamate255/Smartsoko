/**
 * Image Optimization Utilities
 * Compress and resize images before upload
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { IMAGE_QUALITY, MAX_IMAGE_WIDTH, THUMBNAIL_SIZE } from '@/constants/config';

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
  fileSize?: number;
  type?: string;
}

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Optimize an image for upload
 * Compresses and resizes to reduce file size
 */
export async function optimizeImage(
  uri: string,
  options: {
    maxWidth?: number;
    quality?: number;
    format?: 'jpeg' | 'png';
  } = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = MAX_IMAGE_WIDTH,
    quality = IMAGE_QUALITY,
    format = 'jpeg',
  } = options;

  try {
    // First, get image dimensions
    const imageInfo = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Calculate new dimensions
    let { width, height } = imageInfo;
    
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }

    // Resize if needed
    const actions: ImageManipulator.Action[] = [];
    
    if (width !== imageInfo.width) {
      actions.push({ resize: { width, height } });
    }

    // Compress and save
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: format === 'png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(
  uri: string,
  size: number = THUMBNAIL_SIZE
): Promise<OptimizedImage> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
    };
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw new Error('Failed to create thumbnail');
  }
}

/**
 * Pick image from camera or gallery
 */
export async function pickImage(
  source: 'camera' | 'gallery',
  options: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  } = {}
): Promise<ImageAsset | null> {
  const {
    allowsEditing = true,
    aspect = [4, 3],
    quality = 0.8,
  } = options;

  try {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission not granted');
      }

      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
      });
    } else {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission not granted');
      }

      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        allowsMultipleSelection: false,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize,
        type: asset.type,
      };
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

/**
 * Pick multiple images
 */
export async function pickMultipleImages(
  maxCount: number = 5,
  quality: number = 0.8
): Promise<ImageAsset[]> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
      quality,
    });

    if (!result.canceled && result.assets) {
      return result.assets.map(asset => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize,
        type: asset.type,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error picking multiple images:', error);
    throw error;
  }
}

/**
 * Get file size in readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate image before upload
 */
export function validateImage(
  asset: ImageAsset,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  // Check file size
  if (asset.fileSize && asset.fileSize > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `Image too large. Max size is ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (asset.type && !allowedTypes.includes(asset.type)) {
    return {
      valid: false,
      error: `Invalid image type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}
