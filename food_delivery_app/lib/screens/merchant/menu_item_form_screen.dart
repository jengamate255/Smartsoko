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
  bool _variantsEnabled = false;
  final List<MenuItemVariant> _variants = [];
  final List<String> _variantTypeOptions = ['size', 'color'];

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
      if (widget.menuItem!.variants.isNotEmpty) {
        _variantsEnabled = true;
        _variants.addAll(widget.menuItem!.variants);
      }
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

  void _addVariant() {
    setState(() {
      _variants.add(
        MenuItemVariant(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: '',
          type: 'size',
          priceModifier: 0,
          stock: 0,
          sku: null,
          isAvailable: true,
        ),
      );
    });
  }

  void _removeVariant(int index) {
    setState(() {
      _variants.removeAt(index);
    });
  }

  void _updateVariant(int index, {String? name, String? type, double? priceModifier, int? stock, String? sku, bool? isAvailable}) {
    final variant = _variants[index];
    _variants[index] = MenuItemVariant(
      id: variant.id,
      name: name ?? variant.name,
      type: type ?? variant.type,
      priceModifier: priceModifier ?? variant.priceModifier,
      stock: stock ?? variant.stock,
      sku: sku ?? variant.sku,
      isAvailable: isAvailable ?? variant.isAvailable,
    );
    setState(() {});
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

      if (_variantsEnabled && _variants.isNotEmpty) {
        menuItemData['variants'] = _variants.map((v) => v.toMap()).toList();
      } else {
        menuItemData['variants'] = [];
      }

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
          variants: _variantsEnabled ? _variants : [],
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

                    TextFormField(
                      controller: _priceController,
                      decoration: InputDecoration(
                        labelText: _variantsEnabled ? 'Base Price *' : 'Price *',
                        hintText: 'Enter price',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.attach_money),
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
                    const SizedBox(height: 24),

                    SwitchListTile(
                      title: const Text('Enable Variants'),
                      subtitle: Text(
                        _variantsEnabled
                            ? 'Add size, color, or other options'
                            : 'Sell as a single option only',
                      ),
                      value: _variantsEnabled,
                      onChanged: (value) {
                        setState(() {
                          _variantsEnabled = value;
                          if (!value) {
                            _variants.clear();
                          }
                        });
                      },
                      contentPadding: EdgeInsets.zero,
                    ),

                    if (_variantsEnabled) ...[
                      const SizedBox(height: 8),
                      ...List.generate(_variants.length, (index) => _buildVariantRow(index)),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: _addVariant,
                        icon: const Icon(Icons.add),
                        label: const Text('Add Variant'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF064E3B),
                          side: const BorderSide(color: Color(0xFF064E3B)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),

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

  Widget _buildVariantRow(int index) {
    final variant = _variants[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Variant ${index + 1}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  onPressed: () => _removeVariant(index),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    value: variant.type,
                    decoration: const InputDecoration(
                      labelText: 'Type',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: _variantTypeOptions.map((type) {
                      return DropdownMenuItem(
                        value: type,
                        child: Text(type[0].toUpperCase() + type.substring(1)),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        _updateVariant(index, type: value);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    initialValue: variant.name,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                      hintText: 'e.g., Small, Large',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    onChanged: (value) => _updateVariant(index, name: value),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: variant.priceModifier == 0
                        ? '0'
                        : variant.priceModifier.toStringAsFixed(2),
                    decoration: const InputDecoration(
                      labelText: 'Price +/-',
                      hintText: '+2.00 or -1.00',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      prefixText: '\$ ',
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'^[-+]?\d+\.?\d{0,2}')),
                    ],
                    onChanged: (value) {
                      final mod = double.tryParse(value) ?? 0;
                      _updateVariant(index, priceModifier: mod);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    initialValue: variant.stock.toString(),
                    decoration: const InputDecoration(
                      labelText: 'Stock',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: (value) {
                      final stock = int.tryParse(value) ?? 0;
                      _updateVariant(index, stock: stock);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: variant.sku ?? '',
                    decoration: const InputDecoration(
                      labelText: 'SKU (optional)',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    onChanged: (value) {
                      _updateVariant(index, sku: value.isEmpty ? null : value);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Switch(
                  value: variant.isAvailable,
                  onChanged: (value) {
                    _updateVariant(index, isAvailable: value);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
