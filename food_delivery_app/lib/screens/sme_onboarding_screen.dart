import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/shop.dart';
import '../../services/shop_service.dart';
import '../../services/auth_service.dart';
import '../../services/image_upload_service.dart';
import 'location_picker_screen.dart';

class SMEOnboardingScreen extends StatefulWidget {
  const SMEOnboardingScreen({Key? key}) : super(key: key);

  @override
  _SMEOnboardingScreenState createState() => _SMEOnboardingScreenState();
}

class _SMEOnboardingScreenState extends State<SMEOnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  final int _totalSteps = 6;

  // Form keys
  final _businessInfoFormKey = GlobalKey<FormState>();
  final _locationFormKey = GlobalKey<FormState>();
  final _contactFormKey = GlobalKey<FormState>();
  final _productsFormKey = GlobalKey<FormState>();
  final _paymentFormKey = GlobalKey<FormState>();
  final _deliveryFormKey = GlobalKey<FormState>();
  final _termsFormKey = GlobalKey<FormState>();

  // Controllers
  final _businessNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _instagramController = TextEditingController();
  final _facebookController = TextEditingController();

  // State
  ShopType _selectedType = ShopType.grocery;
  String _selectedCategory = '';
  double _latitude = -6.7924; // Default Dar es Salaam
  double _longitude = 39.2083;
  String _selectedAddress = '';
  bool _acceptsDelivery = true;
  bool _acceptsPickup = true;
  bool _acceptsMpesa = true;
  bool _acceptsCash = true;
  bool _termsAccepted = false;
  bool _isLoading = false;

  // Image state
  File? _businessImage;
  final ImageUploadService _imageUploadService = ImageUploadService();

  // Categories based on shop type
  final Map<ShopType, List<String>> _categories = {
    ShopType.grocery: ['Supermarket', 'Duka la Vyakula', 'Duka la Mboga', 'Duka la Matunda'],
    ShopType.electronics: ['Simu', 'Kompyuta', 'Vifaa vya Nyumbani', 'Accessories'],
    ShopType.clothing: ['Nguo za Kiume', 'Nguo za Kike', 'Nguo za Watoto', 'Nguo za Jumla'],
    ShopType.pharmacy: ['Dawa', 'Vitamini', 'Bidhaa za Afya', 'Dawa za Kienyeji'],
    ShopType.hardware: ['Vifaa vya Ujenzi', 'Paint', 'Mabati', 'Vifaa vya Umeme'],
    ShopType.beauty: ['Vipodozi', 'Nywele', 'Bidhaa za Ngozi', 'Huduma za Urembo'],
    ShopType.restaurant: ['Chakula cha Haraka', 'Chakula cha Jioni', 'Vyakula vya Tanzania', 'Fast Food'],
    ShopType.fish: ['Samaki wa Bahari', 'Samaki wa Maziwa', 'Samaki Fresh', 'Samaki Waliopikwa'],
    ShopType.farming: ['Mboga', 'Mazao', 'Mbegu', 'Mbolea', 'Dawa za Shamba'],
    ShopType.dairy: ['Maziwa', 'Mtindi', 'Yogurt', 'Siagi', 'Jibini', 'Maziwa ya Mbuzi'],
    ShopType.other: ['Biashara Nyingine'],
  };

  @override
  void initState() {
    super.initState();
    _selectedCategory = _categories[_selectedType]?.first ?? '';
  }

  @override
  void dispose() {
    _pageController.dispose();
    _businessNameController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _whatsappController.dispose();
    _instagramController.dispose();
    _facebookController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < _totalSteps - 1) {
      setState(() {
        _currentStep++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      File? image;
      if (source == ImageSource.gallery) {
        image = await _imageUploadService.pickImageFromGallery();
      } else {
        image = await _imageUploadService.pickImageFromCamera();
      }

      if (image != null) {
        setState(() {
          _businessImage = image;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hitilafu kuchukua picha: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Chagua Picha ya Biashara',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Colors.blue),
                title: const Text('Picha kutoka Gallery'),
                subtitle: const Text('Chagua picha kutoka kwenye simu yako'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: Colors.green),
                title: const Text('Piga Picha'),
                subtitle: const Text('Chukua picha kwa kutumia kamera'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              if (_businessImage != null)
                ListTile(
                  leading: const Icon(Icons.delete, color: Colors.red),
                  title: const Text('Futa Picha'),
                  subtitle: const Text('Ondoa picha iliyochaguliwa'),
                  onTap: () {
                    Navigator.pop(context);
                    setState(() {
                      _businessImage = null;
                    });
                  },
                ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openLocationPicker() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LocationPickerScreen(
          initialLatitude: _latitude,
          initialLongitude: _longitude,
          initialAddress: _selectedAddress,
        ),
      ),
    );

    if (result != null && result is Map<String, dynamic>) {
      setState(() {
        _latitude = result['latitude'];
        _longitude = result['longitude'];
        _selectedAddress = result['address'] ?? '';
        _addressController.text = _selectedAddress;
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tafadhali kubali masharti na vigezo')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final shopService = ShopService();

      final shop = Shop(
        id: '',
        name: _businessNameController.text.trim(),
        description: _descriptionController.text.trim(),
        address: _addressController.text.trim(),
        lat: _latitude,
        lng: _longitude,
        ownerId: authService.currentUser?.uid ?? '',
        ownerName: authService.currentUser?.displayName ?? '',
        ownerPhone: _phoneController.text.trim(),
        type: _selectedType,
        category: _selectedCategory,
        whatsappNumber: _whatsappController.text.trim().isNotEmpty
            ? _whatsappController.text.trim()
            : null,
        instagramHandle: _instagramController.text.trim().isNotEmpty
            ? _instagramController.text.trim()
            : null,
        facebookPage: _facebookController.text.trim().isNotEmpty
            ? _facebookController.text.trim()
            : null,
        createdAt: DateTime.now(),
      );

      final shopId = await shopService.createShop(shop);

      // Upload business image if selected
      String? imageUrl;
      if (_businessImage != null) {
        try {
          imageUrl = await _imageUploadService.uploadBusinessImage(
            _businessImage!,
            shopId,
          );
          
          // Update shop with image URL
          final updatedShop = shop.copyWith(
            imageUrl: imageUrl,
            updatedAt: DateTime.now(),
          );
          await shopService.updateShop(shopId, updatedShop);
        } catch (e) {
          print('Error uploading image: $e');
          // Continue even if image upload fails
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Biashara yako imesajiliwa kikamilifu!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hitilafu: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sajili Biashara Yako'),
        backgroundColor: Colors.orange,
        elevation: 0,
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _previousStep,
              )
            : null,
      ),
      body: Column(
        children: [
          // Progress indicator
          _buildProgressIndicator(),

          // Step content
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildBusinessInfoStep(),
                _buildLocationStep(),
                _buildContactStep(),
                _buildPaymentStep(),
                _buildDeliveryStep(),
                _buildTermsStep(),
              ],
            ),
          ),

          // Navigation buttons
          _buildNavigationButtons(),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.orange[50],
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Hatua ${_currentStep + 1} ya $_totalSteps',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                _getStepTitle(_currentStep),
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: (_currentStep + 1) / _totalSteps,
            backgroundColor: Colors.grey[300],
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.orange),
          ),
        ],
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0:
        return 'Taarifa za Biashara';
      case 1:
        return 'Mahali';
      case 2:
        return 'Mawasiliano';
      case 3:
        return 'Malipo';
      case 4:
        return 'Usafirishaji';
      case 5:
        return 'Masharti';
      default:
        return '';
    }
  }

  Widget _buildBusinessInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _businessInfoFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Taarifa za Biashara',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Jaza taarifa za biashara yako',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // Business name
            TextFormField(
              controller: _businessNameController,
              decoration: InputDecoration(
                labelText: 'Jina la Biashara',
                hintText: 'mf. Duka la Mama Fatma',
                prefixIcon: const Icon(Icons.store),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Tafadhali jaza jina la biashara';
                }
                if (value.trim().length < 3) {
                  return 'Jina lazima liwe na herufi 3 au zaidi';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Business type
            DropdownButtonFormField<ShopType>(
              value: _selectedType,
              decoration: InputDecoration(
                labelText: 'Aina ya Biashara',
                prefixIcon: const Icon(Icons.category),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              items: ShopType.values.map((type) {
                return DropdownMenuItem(
                  value: type,
                  child: Text(type.displayName),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedType = value!;
                  _selectedCategory = _categories[_selectedType]?.first ?? '';
                });
              },
            ),
            const SizedBox(height: 16),

            // Category
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: InputDecoration(
                labelText: 'Kategoria',
                prefixIcon: const Icon(Icons.label),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              items: (_categories[_selectedType] ?? []).map((category) {
                return DropdownMenuItem(
                  value: category,
                  child: Text(category),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCategory = value!;
                });
              },
            ),
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Maelezo ya Biashara',
                hintText: 'Elezea biashara yako...',
                prefixIcon: const Padding(
                  padding: EdgeInsets.only(bottom: 60),
                  child: Icon(Icons.description),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Tafadhali elezea biashara yako';
                }
                if (value.trim().length < 20) {
                  return 'Maelezo yawe na herufi 20 au zaidi';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Business image picker
            GestureDetector(
              onTap: _showImagePickerOptions,
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _businessImage != null 
                        ? Colors.orange 
                        : Colors.grey[300]!,
                    width: _businessImage != null ? 2 : 1,
                  ),
                ),
                child: _businessImage != null
                    ? Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              _businessImage!,
                              width: double.infinity,
                              height: double.infinity,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _businessImage = null;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.3),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.edit, color: Colors.white, size: 16),
                                  SizedBox(width: 4),
                                  Text(
                                    'Badilisha',
                                    style: TextStyle(color: Colors.white, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      )
                    : Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_photo_alternate,
                              size: 50,
                              color: Colors.orange[300],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Pakia Picha ya Biashara',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '(Gusa kuchagua picha)',
                              style: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Picha nzuri ya biashara yako inasaidia wateja kukutafuta kwa urahisi',
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _locationFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Mahali pa Biashara',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Weka anwani ya biashara yako',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // Address
            TextFormField(
              controller: _addressController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Anwani Kamili',
                hintText: 'mf. Mtaa wa Msimbazi, Dar es Salaam',
                prefixIcon: const Padding(
                  padding: EdgeInsets.only(bottom: 40),
                  child: Icon(Icons.location_on),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Tafadhali jaza anwani';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // GPS coordinates display
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.gps_fixed, color: Colors.blue[700]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'GPS Coordinates',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue[700],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Lat: ${_latitude.toStringAsFixed(6)}, Lng: ${_longitude.toStringAsFixed(6)}',
                          style: TextStyle(
                            color: Colors.blue[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: _openLocationPicker,
                    child: const Text('Badilisha'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Map preview
            GestureDetector(
              onTap: _openLocationPicker,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange[300]!),
                ),
                child: Stack(
                  children: [
                    // Map background pattern
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Colors.green[100]!,
                            Colors.blue[100]!,
                            Colors.green[100]!,
                          ],
                        ),
                      ),
                    ),
                    // Grid pattern to simulate map
                    CustomPaint(
                      size: const Size(double.infinity, 200),
                      painter: MapGridPainter(),
                    ),
                    // Center marker
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.location_on,
                            size: 50,
                            color: Colors.orange,
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: Text(
                              _selectedAddress.isNotEmpty 
                                  ? _selectedAddress 
                                  : 'Gusa kuchagua mahali',
                              style: const TextStyle(fontSize: 12),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Open map button
                    Positioned(
                      bottom: 10,
                      right: 10,
                      child: FloatingActionButton.small(
                        onPressed: _openLocationPicker,
                        backgroundColor: Colors.orange,
                        child: const Icon(Icons.map),
                      ),
                    ),
                    // Edit overlay
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_location, color: Colors.white, size: 16),
                            SizedBox(width: 4),
                            Text(
                              'Gusa kubadilisha',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Location tips
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb, color: Colors.amber[700]),
                      const SizedBox(width: 8),
                      Text(
                        'Vidokezo',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.amber[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '• Toa anwani kamili ikiwa ni pamoja na mtaa na jengo\n'
                    '• Hakikisha mahali panapatikana kwa urahisi\n'
                    '• GPS itasaidia wateja kupata biashara yako',
                    style: TextStyle(
                      color: Colors.amber[800],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _contactFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Taarifa za Mawasiliano',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Weka namna wateja wanavyoweza kuwasiliana nawe',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // Phone number
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Namba ya Simu',
                hintText: '+255XXXXXXXXX',
                prefixIcon: const Icon(Icons.phone),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Tafadhali jaza namba ya simu';
                }
                if (!value.contains('255') && !value.contains('+255')) {
                  return 'Tumia muundo wa Tanzania: +255XXXXXXXXX';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // WhatsApp
            TextFormField(
              controller: _whatsappController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'WhatsApp (Hiari)',
                hintText: '+255XXXXXXXXX',
                prefixIcon: const Icon(Icons.message, color: Colors.green),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Instagram
            TextFormField(
              controller: _instagramController,
              decoration: InputDecoration(
                labelText: 'Instagram (Hiari)',
                hintText: '@username',
                prefixIcon: const Icon(Icons.camera_alt, color: Colors.purple),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Facebook
            TextFormField(
              controller: _facebookController,
              decoration: InputDecoration(
                labelText: 'Facebook Page (Hiari)',
                hintText: 'facebook.com/page',
                prefixIcon: const Icon(Icons.facebook, color: Colors.blue),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Social media benefits
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green[700]),
                      const SizedBox(width: 8),
                      Text(
                        'Faida za Mitandao ya Kijamii',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '• WhatsApp inaruhusu wateja kuagiza moja kwa moja\n'
                    '• Instagram inaonyesha bidhaa zako kwa picha\n'
                    '• Facebook inasaidia kufikia wateja wengi',
                    style: TextStyle(
                      color: Colors.green[800],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _paymentFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Njia za Malipo',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Chagua njia za malipo unazokubali',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // M-Pesa
            _buildPaymentOption(
              icon: Icons.phone_android,
              title: 'M-Pesa',
              subtitle: 'Lipa kwa M-Pesa (Vodacom)',
              value: _acceptsMpesa,
              onChanged: (value) {
                setState(() {
                  _acceptsMpesa = value!;
                });
              },
              color: Colors.green,
            ),
            const SizedBox(height: 12),

            // Cash
            _buildPaymentOption(
              icon: Icons.money,
              title: 'Pesa Taslimu',
              subtitle: 'Lipa kwa pesa taslimu',
              value: _acceptsCash,
              onChanged: (value) {
                setState(() {
                  _acceptsCash = value!;
                });
              },
              color: Colors.orange,
            ),
            const SizedBox(height: 24),

            // Payment info
            if (_acceptsMpesa) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info, color: Colors.green[700]),
                        const SizedBox(width: 8),
                        Text(
                          'Taarifa za M-Pesa',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '• M-Pesa itawezesha malipo ya moja kwa moja\n'
                      '• Pesa zitawekwa kwenye akaunti yako\n'
                      '• Ada ya M-Pesa itakuwa kwa mujibu wa taratibu',
                      style: TextStyle(
                        color: Colors.green[800],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool?> onChanged,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: value ? color.withOpacity(0.1) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value ? color : Colors.grey[300]!,
        ),
      ),
      child: CheckboxListTile(
        secondary: Icon(icon, color: value ? color : Colors.grey),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: value ? color : Colors.grey[700],
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: value ? color.withOpacity(0.8) : Colors.grey[600],
          ),
        ),
        value: value,
        onChanged: onChanged,
        activeColor: color,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Widget _buildDeliveryStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _deliveryFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Usafirishaji',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Chagua njia za kupokea bidhaa',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // Delivery
            _buildDeliveryOption(
              icon: Icons.delivery_dining,
              title: 'Usafirishaji (Delivery)',
              subtitle: 'Bidhaa zitasafirishwa kwa mteja',
              value: _acceptsDelivery,
              onChanged: (value) {
                setState(() {
                  _acceptsDelivery = value!;
                });
              },
              color: Colors.blue,
            ),
            const SizedBox(height: 12),

            // Pickup
            _buildDeliveryOption(
              icon: Icons.store,
              title: 'Kuchukua Mwenyewe (Pickup)',
              subtitle: 'Mteja atakuja kuchukua dukani',
              value: _acceptsPickup,
              onChanged: (value) {
                setState(() {
                  _acceptsPickup = value!;
                });
              },
              color: Colors.purple,
            ),
            const SizedBox(height: 24),

            // Delivery info
            if (_acceptsDelivery) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        Text(
                          'Taarifa za Usafirishaji',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '• Watafutaji wetu watakuja kuchukua bidhaa\n'
                      '• Ada ya usafirishaji itategemea umbali\n'
                      '• Mteja ataona ada kabla ya kuagiza',
                      style: TextStyle(
                        color: Colors.blue[800],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Operating hours
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.access_time, color: Colors.amber[700]),
                      const SizedBox(width: 8),
                      Text(
                        'Saa za Kufanya Kazi',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.amber[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Unaweza kubadilisha saa za kufanya kazi baada ya kusajili. Kwa sasa, biashara yako itaonyesha "Funguliwa" kwa wakati wote.',
                    style: TextStyle(
                      color: Colors.amber[800],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeliveryOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool?> onChanged,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: value ? color.withOpacity(0.1) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value ? color : Colors.grey[300]!,
        ),
      ),
      child: CheckboxListTile(
        secondary: Icon(icon, color: value ? color : Colors.grey),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: value ? color : Colors.grey[700],
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: value ? color.withOpacity(0.8) : Colors.grey[600],
          ),
        ),
        value: value,
        onChanged: onChanged,
        activeColor: color,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Widget _buildTermsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _termsFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masharti na Vigezo',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Soma na ukubali masharti yetu',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 24),

            // Terms container
            Container(
              height: 300,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTermsSection(
                      '1. Masharti ya Jumla',
                      'Kwa kusajili biashara yako, unakubali kufuata masharti yetu ya huduma. '
                      'Biashara yako itaonyeshwa kwa wateja kupitia programu hii.',
                    ),
                    _buildTermsSection(
                      '2. Taarifa za Biashara',
                      'Unakubali kutoa taarifa sahihi na za kweli kuhusu biashara yako. '
                      'Taarifa feki zinaweza kusababisha kufutwa kwa akaunti yako.',
                    ),
                    _buildTermsSection(
                      '3. Malipo',
                      'Malipo yatashughulikiwa kupitia M-Pesa au njia zingine zilizoorodheshwa. '
                      'Ada ya huduma itakatwa kwa mujibu wa makubaliano.',
                    ),
                    _buildTermsSection(
                      '4. Usafirishaji',
                      'Ikiwa umechagua usafirishaji, unakubali kutoa bidhaa kwa wakati na katika hali nzuri.',
                    ),
                    _buildTermsSection(
                      '5. Sera ya Faragha',
                      'Taarifa zako zitahifanyiwa kwa mujibu wa sera yetu ya faragha. '
                      'Hatutashiriki taarifa zako bila idhini yako.',
                    ),
                    _buildTermsSection(
                      '6. Mwisho wa Huduma',
                      'Unaweza kufuta akaunti yako wakati wowote. Sisi pia tunahifadhi haki ya kusimamisha huduma '
                      'ikiwa kuna ukiukwaji wa masharti.',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Terms checkbox
            Container(
              decoration: BoxDecoration(
                color: _termsAccepted ? Colors.orange[50] : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _termsAccepted ? Colors.orange : Colors.grey[300]!,
                ),
              ),
              child: CheckboxListTile(
                title: const Text(
                  'Nakubali Masharti na Vigezo',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text(
                  'Nimesoma na ninakubali masharti yote yaliyoorodheshwa hapo juu',
                ),
                value: _termsAccepted,
                onChanged: (value) {
                  setState(() {
                    _termsAccepted = value!;
                  });
                },
                activeColor: Colors.orange,
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ),
            const SizedBox(height: 16),

            // Summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green[700]),
                      const SizedBox(width: 8),
                      Text(
                        'Muhtasari wa Biashara',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildSummaryItem('Jina', _businessNameController.text),
                  _buildSummaryItem('Aina', _selectedType.displayName),
                  _buildSummaryItem('Kategoria', _selectedCategory),
                  _buildSummaryItem('Simu', _phoneController.text),
                  if (_whatsappController.text.isNotEmpty)
                    _buildSummaryItem('WhatsApp', _whatsappController.text),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTermsSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                color: Colors.green[700],
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value.isNotEmpty ? value : '-',
              style: const TextStyle(
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationButtons() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _previousStep,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Nyuma'),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton(
              onPressed: _isLoading
                  ? null
                  : _currentStep == _totalSteps - 1
                      ? _submitForm
                      : _nextStep,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      _currentStep == _totalSteps - 1
                          ? 'Sajili Biashara'
                          : 'Endelea',
                      style: const TextStyle(fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.1)
      ..strokeWidth = 1;

    // Draw vertical lines
    for (double x = 0; x < size.width; x += 30) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    // Draw horizontal lines
    for (double y = 0; y < size.height; y += 30) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Draw some random "road" lines
    final roadPaint = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..strokeWidth = 3;

    canvas.drawLine(
      Offset(0, size.height * 0.3),
      Offset(size.width, size.height * 0.3),
      roadPaint,
    );

    canvas.drawLine(
      Offset(size.width * 0.4, 0),
      Offset(size.width * 0.4, size.height),
      roadPaint,
    );

    canvas.drawLine(
      Offset(size.width * 0.7, 0),
      Offset(size.width * 0.7, size.height * 0.6),
      roadPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
