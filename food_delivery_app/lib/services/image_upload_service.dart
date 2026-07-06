import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

class ImageUploadService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final ImagePicker _picker = ImagePicker();

  Future<bool> _requestPermissions() async {
    if (Platform.isAndroid) {
      final cameraStatus = await Permission.camera.request();
      final storageStatus = await Permission.storage.request();
      final photosStatus = await Permission.photos.request();
      
      return cameraStatus.isGranted && 
             (storageStatus.isGranted || photosStatus.isGranted);
    } else if (Platform.isIOS) {
      final photosStatus = await Permission.photos.request();
      final cameraStatus = await Permission.camera.request();
      return photosStatus.isGranted && cameraStatus.isGranted;
    }
    return true;
  }

  Future<File?> pickImageFromGallery() async {
    try {
      final hasPermission = await _requestPermissions();
      if (!hasPermission) {
        throw Exception('Permissions not granted');
      }

      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image != null) {
        return File(image.path);
      }
      return null;
    } catch (e) {
      print('Error picking image from gallery: $e');
      rethrow;
    }
  }

  Future<File?> pickImageFromCamera() async {
    try {
      final hasPermission = await _requestPermissions();
      if (!hasPermission) {
        throw Exception('Permissions not granted');
      }

      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image != null) {
        return File(image.path);
      }
      return null;
    } catch (e) {
      print('Error picking image from camera: $e');
      rethrow;
    }
  }

  Future<List<File>> pickMultipleImages() async {
    try {
      final hasPermission = await _requestPermissions();
      if (!hasPermission) {
        throw Exception('Permissions not granted');
      }

      final List<XFile> images = await _picker.pickMultiImage(
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      return images.map((image) => File(image.path)).toList();
    } catch (e) {
      print('Error picking multiple images: $e');
      rethrow;
    }
  }

  Future<String> uploadImage(File imageFile, String path) async {
    try {
      final ref = _storage.ref().child(path);
      final uploadTask = ref.putFile(
        imageFile,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      return downloadUrl;
    } catch (e) {
      print('Error uploading image: $e');
      rethrow;
    }
  }

  Future<String> uploadBusinessImage(File imageFile, String businessId) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final path = 'businesses/$businessId/images/$timestamp.jpg';
    return uploadImage(imageFile, path);
  }

  Future<String> uploadProductImage(File imageFile, String businessId, String productId) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final path = 'businesses/$businessId/products/$productId/$timestamp.jpg';
    return uploadImage(imageFile, path);
  }

  Future<void> deleteImage(String imageUrl) async {
    try {
      final ref = _storage.refFromURL(imageUrl);
      await ref.delete();
    } catch (e) {
      print('Error deleting image: $e');
    }
  }

  Future<List<String>> uploadMultipleImages(List<File> imageFiles, String path) async {
    final List<String> downloadUrls = [];
    
    for (int i = 0; i < imageFiles.length; i++) {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '$path/${timestamp}_$i.jpg';
      final url = await uploadImage(imageFiles[i], filePath);
      downloadUrls.add(url);
    }
    
    return downloadUrls;
  }
}
