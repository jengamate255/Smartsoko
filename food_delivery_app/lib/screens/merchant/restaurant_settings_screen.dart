import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:io';
import '../../models/restaurant.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/image_upload_service.dart';
import '../../utils/validators.dart';
import '../../widgets/merchant/image_picker_widget.dart';

class RestaurantSettingsScreen extends StatefulWidget {
  const RestaurantSettingsScreen({super.key});

  @override
  State<RestaurantSettingsScreen> createState() => _RestaurantSettingsScreenState();
}

class _RestaurantSettingsScreenState extends State<RestaurantSettingsScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _deliveryTimeController = TextEditingController();
  final _deliveryFeeController = TextEditingController();
  final _categoryController = TextEditingController();
  
  // Operating hours controllers
  final _openTimeController = TextEditingController();
  final _closeTimeController = TextEditingController();

  final AuthService _authService = AuthService();
  final RestaurantService _restaurantService = RestaurantService();
  final ImageUploadService _imageUploadService = ImageUploadService();

  Restaurant? _restaurant;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isOpen = true;
  String? _selectedImagePath;
  String? _existingImageUrl;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _logScreenView();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _descriptionController.dispose();
    _deliveryTimeController.dispose();
    _deliveryFeeController.dispose();
    _categoryController.dispose();
    _openTimeController.dispose();
    _closeTimeController.dispose();
    super.dispose();
  }

  Future<void> _logScreenView() async {
    await _analyticsService.logScreenView(
      screenName: 'RestaurantSettings',
      screenClass: 'RestaurantSettingsScreen',
    );
  }

  Future<void> _loadRestaurant() async {
    try {
      final user = _authService.currentUser;
      if (user == null) {
        _showError('User not authenticated');
        return;
      }

      final restaurant = await _restaurantService.getRestaurantByOwnerId(user.uid);
      if (restaurant != null) {
        setState(() {
          _restaurant = restaurant;
          _nameController.text = restaurant.name;
          _addressController.text = restaurant.address;
          _descriptionController.text = restaurant.description;
          _deliveryTimeController.text = restaurant.deliveryTimeMinutes.toString();
          _deliveryFeeController.text = restaurant.deliveryFee.toStringAsFixed(2);
          _categoryController.text = restaurant.category;
           _isOpen = restaurant.isOpen;
          _existingImageUrl = restaurant.imageUrl;
          _openTimeController.text = restaurant.openingTime ?? '';
          _closeTimeController.text = restaurant.closingTime ?? '';
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showError('Error loading restaurant: ${e.toString()}');
    }
  }

  Future<void> _toggleOpenStatus(bool value) async {
    if (_restaurant == null) return;

    setState(() {
      _isOpen = value;
    });

    try {
      await _restaurantService.toggleRestaurantOpen(_restaurant!.id, value);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(value ? 'Restaurant is now open' : 'Restaurant is now closed'),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isOpen = !value;
      });
      _showError('Error updating status: ${e.toString()}');
    }
  }

  Future<void> _saveRestaurant() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final user = _authService.currentUser;
      if (user == null) throw Exception('User not authenticated');

      final updates = {
        'ownerId': user.uid,
        'name': _nameController.text.trim(),
        'address': _addressController.text.trim(),
        'description': _descriptionController.text.trim(),
        'deliveryTimeMinutes': int.tryParse(_deliveryTimeController.text) ?? 30,
        'deliveryFee': double.tryParse(_deliveryFeeController.text) ?? 0.0,
        'category': _categoryController.text.trim(),
        'isOpen': _isOpen,
        'openingTime': _openTimeController.text,
        'closingTime': _closeTimeController.text,
      };

      String? restaurantId = _restaurant?.id;

      // Create or update restaurant
      if (restaurantId == null) {
        final newRestaurant = Restaurant(
          id: '',
          ownerId: user.uid,
          name: updates['name'] as String,
          address: updates['address'] as String,
          description: updates['description'] as String,
          deliveryTimeMinutes: updates['deliveryTimeMinutes'] as int,
          deliveryFee: updates['deliveryFee'] as double,
          category: updates['category'] as String,
          isOpen: _isOpen,
          imageUrl: '',
        );
        final created = await _restaurantService.createRestaurant(newRestaurant);
        restaurantId = created.id;
      } else {
        await _restaurantService.updateRestaurant(restaurantId, updates);
      }

      // Handle image upload if a new image is selected
      if (_selectedImagePath != null) {
        final imageUrl = await _imageUploadService.uploadBusinessImage(
          File(_selectedImagePath!),
          restaurantId,
        );
        await _restaurantService.updateRestaurant(restaurantId, {'imageUrl': imageUrl});
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Restaurant details saved successfully')),
        );
        _loadRestaurant(); // Reload
      }
    } catch (e) {
      _showError('Error saving restaurant: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildSettingsForm(),
    );
  }

  Widget _buildSettingsForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Restaurant Image',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ImagePickerWidget(
              imageUrl: _selectedImagePath ?? _existingImageUrl,
              onImageSelected: (path) {
                setState(() {
                  _selectedImagePath = path;
                });
              },
            ),
            const SizedBox(height: 24),
            if (_restaurant != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        _isOpen ? Icons.check_circle : Icons.cancel,
                        color: _isOpen ? Colors.green : Colors.red,
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isOpen ? 'Restaurant Open' : 'Restaurant Closed',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              _isOpen ? 'Accepting new orders' : 'Not accepting orders',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isOpen,
                        onChanged: _toggleOpenStatus,
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              'Restaurant Information',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Restaurant Name *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.store),
              ),
              validator: (value) => Validators.validateRequired(value, 'Name'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              maxLines: 3,
              validator: (value) => Validators.validateRequired(value, 'Description'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'Address *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_on),
              ),
              validator: (value) => Validators.validateRequired(value, 'Address'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _categoryController,
              decoration: const InputDecoration(
                labelText: 'Category *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.category),
              ),
              validator: (value) => Validators.validateRequired(value, 'Category'),
            ),
            const SizedBox(height: 24),
            const Text(
              'Delivery Settings',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _deliveryTimeController,
                    decoration: const InputDecoration(
                      labelText: 'Delivery Time (min) *',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) => Validators.validateRequired(value, 'Time'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _deliveryFeeController,
                    decoration: const InputDecoration(
                      labelText: 'Delivery Fee *',
                      border: OutlineInputBorder(),
                      prefixText: 'KSh ',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) => Validators.validateRequired(value, 'Fee'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Operating Hours',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _openTimeController,
                    readOnly: true,
                    onTap: () => _selectTime(context, true),
                    decoration: const InputDecoration(
                      labelText: 'Opening Time',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.access_time),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _closeTimeController,
                    readOnly: true,
                    onTap: () => _selectTime(context, false),
                    decoration: const InputDecoration(
                      labelText: 'Closing Time',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.access_time_filled),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSaving ? null : _saveRestaurant,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
              ),
              child: _isSaving
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(_restaurant == null ? 'Create Restaurant' : 'Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectTime(BuildContext context, bool isOpenTime) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );

    if (picked != null) {
      setState(() {
        final timeString = picked.format(context);
        if (isOpenTime) {
          _openTimeController.text = timeString;
        } else {
          _closeTimeController.text = timeString;
        }
      });
    }
  }
}
