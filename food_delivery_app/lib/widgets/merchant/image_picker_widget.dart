import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ImagePickerWidget extends StatelessWidget {
  final String? imageUrl;
  final Function(String?) onImageSelected;
  final String? errorText;

  const ImagePickerWidget({
    super.key,
    this.imageUrl,
    required this.onImageSelected,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Item Image',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _showImageSourceDialog(context),
          child: Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: errorText != null ? Colors.red : Colors.grey[300]!,
                width: errorText != null ? 2 : 1,
              ),
            ),
            child: _buildContent(),
          ),
        ),
        if (errorText != null) ...[
          const SizedBox(height: 4),
          Text(
            errorText!,
            style: const TextStyle(
              color: Colors.red,
              fontSize: 12,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildContent() {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(11),
            child: imageUrl!.startsWith('http')
                ? Image.network(
                    imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildPlaceholder();
                    },
                  )
                : Image.file(
                    File(imageUrl!),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildPlaceholder();
                    },
                  ),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: IconButton(
                icon: const Icon(Icons.edit, color: Colors.white),
                onPressed: _showImageSourceDialog,
                tooltip: 'Change image',
              ),
            ),
          ),
        ],
      );
    }
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.add_a_photo,
          size: 48,
          color: Colors.grey[400],
        ),
        const SizedBox(height: 8),
        Text(
          'Tap to add image',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  void _showImageSourceDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            if (imageUrl != null && imageUrl!.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text('Remove Image', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  onImageSelected(null);
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      
      if (pickedFile != null) {
        onImageSelected(pickedFile.path);
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }
}