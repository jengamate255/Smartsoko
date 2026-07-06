import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/restaurant.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/image_upload_service.dart';
import '../../widgets/merchant/image_picker_widget.dart';
import '../../utils/validators.dart';

class MenuItemFormScreen extends StatefulWidget {
  final MenuItem? menuItem;
  final String restaurantId;

  const MenuItemFormScreen({
    super.key,
    this.menuItem,
    required this.restaurantId,
  });

  @override
  State<MenuItemFormScreen> createState() => _MenuItemFormScreenState();
}

class _MenuItemFormScreenState extends State<MenuItemFormScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _categoryController = TextEditingController();
  
  final AuthService _authService = AuthService();
  final RestaurantService _restaurantService = RestaurantService();
  final ImageUploadService _imageUploadService = ImageUploadService();

  String? _selectedImagePath;
  String? _existingImageUrl;
  bool _isLoading = false;
  bool _isSubmitting = false;

  final List<String> _defaultCategories = [
    'Main Course',
    'Appetizer',
    'Dessert',
    'Beverage',
    'Side Dish',
    'Special',
  ];

  bool get isEditing => widget.menuItem != null;

  @override
  void initState() {
    super.initState();
    _logScreenView();
    if (isEditing) {
      _nameController.text = widget.menuItem!.name;
      _descriptionController.text = widget.menuItem!.description;
      _priceController.text = widget.menuItem!.price.toStringAsFixed(2);
      _categoryController.text = widget.menuItem!.category;
      _existingImageUrl = widget.menuItem!.imageUrl;
    }
  }

  Future<void> _logScreenView() async {
    final screenName = isEditing ? 'MenuItemEdit' : 'MenuItemAdd';
    await _analyticsService.logScreenView(
      screenName: screenName,
      screenClass: 'MenuItemFormScreen',
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedImagePath == null && _existingImageUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an image for the menu item')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      String imageUrl = _existingImageUrl ?? '';

      // Upload new image if selected
      if (_selectedImagePath != null) {
        final user = _authService.currentUser;
        if (user == null) {
          throw Exception('User not authenticated');
        }

        imageUrl = await _imageUploadService.uploadProductImage(
          File(_selectedImagePath!),
          widget.restaurantId,
          isEditing ? widget.menuItem!.id : DateTime.now().millisecondsSinceEpoch.toString(),
        );
      }

      final menuItemData = {
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim(),
        'price': double.parse(_priceController.text),
        'category': _categoryController.text.trim(),
        'imageUrl': imageUrl,
        'isAvailable': true,
      };

      if (isEditing) {
        await _restaurantService.updateMenuItem(widget.menuItem!.id, menuItemData);
      } else {
        final newItem = MenuItem(
          id: '',
          restaurantId: widget.restaurantId,
          name: menuItemData['name'] as String,
          description: menuItemData['description'] as String,
          price: menuItemData['price'] as double,
          imageUrl: menuItemData['imageUrl'] as String,
          category: menuItemData['category'] as String,
          isAvailable: menuItemData['isAvailable'] as bool,
        );
        await _restaurantService.createMenuItem(newItem);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing ? 'Menu item updated successfully' : 'Menu item created successfully'),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Menu Item' : 'Add Menu Item'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Image Picker
                    ImagePickerWidget(
                      imageUrl: _selectedImagePath ?? _existingImageUrl,
                      onImageSelected: (path) {
                        setState(() {
                          if (path == null) {
                            _selectedImagePath = null;
                            _existingImageUrl = null;
                          } else if (path.startsWith('/')) {
                            _selectedImagePath = path;
                          } else {
                            _existingImageUrl = path;
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 24),

                    // Name Field
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Item Name *',
                        hintText: 'Enter item name',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.restaurant_menu),
                      ),
                      textCapitalization: TextCapitalization.words,
                      validator: (value) => Validators.validateRequired(value, 'Name'),
                    ),
                    const SizedBox(height: 16),

                    // Description Field
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description *',
                        hintText: 'Enter item description',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.description),
                      ),
                      maxLines: 3,
                      textCapitalization: TextCapitalization.sentences,
                      validator: (value) => Validators.validateRequired(value, 'Description'),
                    ),
                    const SizedBox(height: 16),

                    // Price Field
                    TextFormField(
                      controller: _priceController,
                      decoration: const InputDecoration(
                        labelText: 'Price *',
                        hintText: 'Enter price',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.attach_money),
                        prefixText: '\$ ',
                      ),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                      ],
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Price is required';
                        }
                        final price = double.tryParse(value);
                        if (price == null || price <= 0) {
                          return 'Please enter a valid price';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Category Field
                    Autocomplete<String>(
                      optionsBuilder: (TextEditingValue textEditingValue) {
                        if (textEditingValue.text.isEmpty) {
                          return _defaultCategories;
                        }
                        return _defaultCategories.where((category) =>
                            category.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                      },
                      onSelected: (String selection) {
                        _categoryController.text = selection;
                      },
                      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                        // Sync with our controller
                        if (controller.text.isEmpty && _categoryController.text.isNotEmpty) {
                          controller.text = _categoryController.text;
                        }
                        return TextFormField(
                          controller: controller,
                          focusNode: focusNode,
                          decoration: const InputDecoration(
                            labelText: 'Category *',
                            hintText: 'Select or enter category',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.category),
                          ),
                          textCapitalization: TextCapitalization.words,
                          onChanged: (value) {
                            _categoryController.text = value;
                          },
                          validator: (value) => Validators.validateRequired(value, 'Category'),
                        );
                      },
                    ),
                    const SizedBox(height: 32),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitForm,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              isEditing ? 'Update Menu Item' : 'Add Menu Item',
                              style: const TextStyle(fontSize: 16),
                            ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}