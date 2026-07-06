import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/shop.dart';
import '../../services/shop_service.dart';
import '../../services/image_upload_service.dart';
import '../../utils/validators.dart';

class ProductFormScreen extends StatefulWidget {
  final Product? product;
  final Shop shop;

  const ProductFormScreen({
    super.key,
    this.product,
    required this.shop,
  });

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _categoryController = TextEditingController();
  final _stockController = TextEditingController();
  final _unitController = TextEditingController();

  final ShopService _shopService = ShopService();
  final ImageUploadService _imageUploadService = ImageUploadService();

  File? _selectedImage;
  String? _existingImageUrl;
  bool _isSubmitting = false;

  final List<String> _defaultCategories = [
    'Fresh Produce',
    'Dairy & Eggs',
    'Meat & Fish',
    'Beverages',
    'Snacks',
    'Cooking Essentials',
    'Household',
    'Personal Care',
  ];

  final List<String> _defaultUnits = [
    'piece',
    'kg',
    'g',
    'litre',
    'ml',
    'packet',
    'bunch',
    'dozen',
  ];

  final List<String> _weekDays = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
  ];
  final Map<String, String> _dayLabels = {
    'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu',
    'fri': 'Fri', 'sat': 'Sat', 'sun': 'Sun',
  };

  bool _hasSchedule = false;
  Set<String> _selectedDays = {};
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);

  bool get isEditing => widget.product != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      final p = widget.product!;
      _nameController.text = p.name;
      _descriptionController.text = p.description;
      _priceController.text = p.price.toStringAsFixed(0);
      _categoryController.text = p.category;
      _stockController.text = p.stockQuantity.toString();
      _unitController.text = p.unit ?? '';
      _existingImageUrl = p.imageUrl;
      _hasSchedule = p.hasSchedule;
      if (p.scheduleDays != null) {
        _selectedDays = p.scheduleDays!.split(',').toSet();
      }
      if (p.scheduleStart != null) {
        final parts = p.scheduleStart!.split(':');
        _startTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      }
      if (p.scheduleEnd != null) {
        final parts = p.scheduleEnd!.split(':');
        _endTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _categoryController.dispose();
    _stockController.dispose();
    _unitController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final image = await _imageUploadService.pickImageFromGallery();
      if (image != null) {
        setState(() => _selectedImage = image);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking image: $e')),
        );
      }
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      String? imageUrl = _existingImageUrl;

      if (_selectedImage != null) {
        imageUrl = await _imageUploadService.uploadBusinessImage(
          _selectedImage!,
          '${widget.shop.id}_${DateTime.now().millisecondsSinceEpoch}',
        );
      }

      final product = Product(
        id: widget.product?.id ?? '',
        shopId: widget.shop.id,
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim(),
        price: double.parse(_priceController.text),
        category: _categoryController.text.trim(),
        stockQuantity: int.tryParse(_stockController.text) ?? 0,
        isAvailable: widget.product?.isAvailable ?? true,
        unit: _unitController.text.trim().isNotEmpty ? _unitController.text.trim() : null,
        imageUrl: imageUrl,
        attributes: null,
        hasSchedule: _hasSchedule,
        scheduleDays: _hasSchedule && _selectedDays.isNotEmpty ? _selectedDays.join(',') : null,
        scheduleStart: _hasSchedule ? '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}' : null,
        scheduleEnd: _hasSchedule ? '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}' : null,
        createdAt: widget.product?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );

      if (isEditing) {
        await _shopService.updateProduct(widget.product!.id, product);
      } else {
        await _shopService.addProduct(product);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing ? 'Product updated successfully' : 'Product created successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Product' : 'Add Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: _selectedImage != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(_selectedImage!, fit: BoxFit.cover),
                        )
                      : _existingImageUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(_existingImageUrl!, fit: BoxFit.cover),
                            )
                          : Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_photo_alternate, size: 50, color: Colors.grey[400]),
                                  const SizedBox(height: 8),
                                  Text('Tap to add product image', style: TextStyle(color: Colors.grey[500])),
                                ],
                              ),
                            ),
                ),
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name *',
                  hintText: 'Enter product name',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.inventory_2),
                ),
                textCapitalization: TextCapitalization.words,
                validator: (v) => Validators.validateRequired(v, 'Name'),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  hintText: 'Enter product description',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.description),
                ),
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                validator: (v) => Validators.validateRequired(v, 'Description'),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _priceController,
                      decoration: const InputDecoration(
                        labelText: 'Price (TSh) *',
                        hintText: '0',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.monetization_on),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Price is required';
                        final price = int.tryParse(v);
                        if (price == null || price <= 0) return 'Enter a valid price';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _stockController,
                      decoration: const InputDecoration(
                        labelText: 'Stock',
                        hintText: '0',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.inventory),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              Autocomplete<String>(
                optionsBuilder: (textEditingValue) {
                  if (textEditingValue.text.isEmpty) return _defaultCategories;
                  return _defaultCategories.where((c) =>
                      c.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                },
                onSelected: (selection) => _categoryController.text = selection,
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
                    onChanged: (v) => _categoryController.text = v,
                    validator: (v) => Validators.validateRequired(v, 'Category'),
                  );
                },
              ),
              const SizedBox(height: 16),

              Autocomplete<String>(
                optionsBuilder: (textEditingValue) {
                  if (textEditingValue.text.isEmpty) return _defaultUnits;
                  return _defaultUnits.where((u) =>
                      u.toLowerCase().contains(textEditingValue.text.toLowerCase()));
                },
                onSelected: (selection) => _unitController.text = selection,
                fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                  if (controller.text.isEmpty && _unitController.text.isNotEmpty) {
                    controller.text = _unitController.text;
                  }
                  return TextFormField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: const InputDecoration(
                      labelText: 'Unit (optional)',
                      hintText: 'piece, kg, litre...',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.scale),
                    ),
                    onChanged: (v) => _unitController.text = v,
                  );
                },
              ),
              const SizedBox(height: 24),

              // Availability Schedule
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Schedule Availability', style: TextStyle(fontWeight: FontWeight.w600)),
                        Switch(
                          value: _hasSchedule,
                          onChanged: (v) => setState(() => _hasSchedule = v),
                          activeColor: Colors.orange,
                        ),
                      ],
                    ),
                    if (_hasSchedule) ...[
                      const SizedBox(height: 12),
                      const Text('Available Days', style: TextStyle(fontSize: 13, color: Colors.grey)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: _weekDays.map((day) {
                          final selected = _selectedDays.contains(day);
                          return FilterChip(
                            label: Text(_dayLabels[day]!),
                            selected: selected,
                            selectedColor: Colors.orange[100],
                            checkmarkColor: Colors.orange[800],
                            onSelected: (v) {
                              setState(() {
                                if (v) { _selectedDays.add(day); }
                                else { _selectedDays.remove(day); }
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final time = await showTimePicker(context: context, initialTime: _startTime);
                                if (time != null) setState(() => _startTime = time);
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Start Time',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.access_time),
                                ),
                                child: Text(_startTime.format(context)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final time = await showTimePicker(context: context, initialTime: _endTime);
                                if (time != null) setState(() => _endTime = time);
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'End Time',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.access_time),
                                ),
                                child: Text(_endTime.format(context)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(isEditing ? 'Update Product' : 'Add Product', style: const TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
