import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../models/smartmove/vehicle_type.dart';
import '../../../models/smartmove/fare_breakdown.dart';
import '../../../models/smartmove/ride_request.dart';
import '../../../models/smartmove/promo_code.dart';
import '../../../models/smartmove/ride_stop.dart';
import '../../../services/smartmove/ride_service.dart';
import '../../../services/smartmove/pricing_service.dart';
import '../../../services/smartmove/matching_service.dart';
import '../../../services/supabase_service.dart';
import '../../../config/app_config.dart';
import '../../../utils/app_theme.dart';
import 'ride_tracking_screen.dart';
import 'package:uuid/uuid.dart';

class RideBookingScreen extends StatefulWidget {
  final RideRequest? existingRequest;

  const RideBookingScreen({super.key, this.existingRequest});

  @override
  State<RideBookingScreen> createState() => _RideBookingScreenState();
}

class _RideBookingScreenState extends State<RideBookingScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  final _promoController = TextEditingController();
  final _uuid = Uuid();

  // Location data
  LatLng? _pickupLocation;
  LatLng? _dropoffLocation;
  String _pickupAddress = '';
  String _dropoffAddress = '';

  // State
  VehicleType? _selectedVehicleType;
  List<VehicleType> _vehicleTypes = [];
  FareEstimateResponse? _fareEstimate;
  bool _isLoadingFare = false;
  bool _isBooking = false;
  bool _isScheduled = false;
  DateTime? _scheduledFor;
  PaymentMethod _paymentMethod = PaymentMethod.wallet;
  String? _promoCode;
  PromoValidationResult? _promoValidation;
  List<RideStop> _stops = [];

  // Bottom sheet state
  double _sheetHeight = 280;
  bool _sheetExpanded = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _loadVehicleTypes();
    if (widget.existingRequest != null) {
      _prefillFromExistingRequest();
    }
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 2.5).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    _promoController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadVehicleTypes() async {
    try {
      final pricingService = SmartMovePricingService();
      final types = await pricingService.getVehicleTypes();
      if (mounted) {
        setState(() {
          _vehicleTypes = types;
          _selectedVehicleType = types.firstWhere(
            (t) => t.name == 'sedan',
            orElse: () => types.first,
          );
        });
        _estimateFare();
      }
    } catch (e) {
      _showError('Failed to load vehicle types');
    }
  }

  void _prefillFromExistingRequest() {
    final req = widget.existingRequest!;
    _pickupController.text = req.pickupAddress;
    _dropoffController.text = req.dropoffAddress;
    _pickupAddress = req.pickupAddress;
    _dropoffAddress = req.dropoffAddress;
    _pickupLocation = LatLng(req.pickupLatitude, req.pickupLongitude);
    _dropoffLocation = LatLng(req.dropoffLatitude, req.dropoffLongitude);
    _selectedVehicleType = _vehicleTypes.firstWhere(
      (t) => t.id == req.vehicleTypeId,
      orElse: () => _vehicleTypes.first,
    );
    _paymentMethod = req.paymentMethod;
    if (req.promoCodeId != null) {
      _promoCode = req.promoCodeId;
    }
    if (req.isScheduled && req.scheduledFor != null) {
      _isScheduled = true;
      _scheduledFor = req.scheduledFor;
    }
  }

  Future<void> _estimateFare() async {
    if (_pickupLocation == null ||
        _dropoffLocation == null ||
        _selectedVehicleType == null) return;

    setState(() => _isLoadingFare = true);
    try {
      final pricingService = SmartMovePricingService();
      final estimate = await pricingService.getFareEstimate(
        vehicleTypeId: _selectedVehicleType!.id,
        pickupLatitude: _pickupLocation!.latitude,
        pickupLongitude: _pickupLocation!.longitude,
        dropoffLatitude: _dropoffLocation!.latitude,
        dropoffLongitude: _dropoffLocation!.longitude,
        promoCode: _promoCode,
        customerId: SupabaseService().client.auth.currentUser?.id,
      );
      if (mounted) {
        setState(() {
          _fareEstimate = estimate;
          _isLoadingFare = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingFare = false);
      }
    }
  }

  Future<void> _onPickupSelected(LatLng location, String address) async {
    setState(() {
      _pickupLocation = location;
      _pickupAddress = address;
      _pickupController.text = address;
    });
    _estimateFare();
  }

  Future<void> _onDropoffSelected(LatLng location, String address) async {
    setState(() {
      _dropoffLocation = location;
      _dropoffAddress = address;
      _dropoffController.text = address;
    });
    _estimateFare();
  }

  Future<void> _validatePromoCode() async {
    if (_promoController.text.isEmpty || _fareEstimate == null) return;
    try {
      final pricingService = SmartMovePricingService();
      final result = await pricingService.validatePromoCode(
        code: _promoController.text,
        customerId: SupabaseService().client.auth.currentUser!.id,
        estimatedFare: _fareEstimate!.fareBreakdown.totalFare,
      );
      if (mounted) {
        setState(() {
          _promoValidation = result;
          if (result.valid) {
            _promoCode = _promoController.text.toUpperCase();
            _estimateFare();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _promoValidation = PromoValidationResult(
            valid: false,
            error: 'Invalid promo code',
            discountAmount: 0,
          );
        });
      }
    }
  }

  Future<void> _bookRide() async {
    if (!_formKey.currentState!.validate()) return;
    if (_pickupLocation == null || _dropoffLocation == null) {
      _showError('Please select pickup and drop-off locations');
      return;
    }
    if (_selectedVehicleType == null) {
      _showError('Please select a vehicle type');
      return;
    }
    if (_fareEstimate == null) {
      _showError('Please wait for fare estimate');
      return;
    }
    setState(() => _isBooking = true);
    try {
      final rideService = SmartMoveRideService();
      final userId = SupabaseService().client.auth.currentUser!.id;
      final rideRequest = await rideService.createRideRequest(
        customerId: userId,
        vehicleTypeId: _selectedVehicleType!.id,
        pickupLatitude: _pickupLocation!.latitude,
        pickupLongitude: _pickupLocation!.longitude,
        pickupAddress: _pickupAddress,
        dropoffLatitude: _dropoffLocation!.latitude,
        dropoffLongitude: _dropoffLocation!.longitude,
        dropoffAddress: _dropoffAddress,
        scheduledFor: _scheduledFor,
        promoCodeId: _promoCode,
        paymentMethod: _paymentMethod,
        stops: _stops,
      );
      if (mounted) {
        if (_isScheduled) {
          _showSuccess('Ride scheduled successfully!');
          Navigator.pop(context, rideRequest);
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => RideTrackingScreen(rideRequestId: rideRequest.id),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) _showError('Failed to book ride: $e');
    } finally {
      if (mounted) setState(() => _isBooking = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.luxeError,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.luxeSecondary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // ─── LuxeRide UI ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          _buildMapBackground(),
          _buildAtmosphericGlow(),
          Positioned(top: 0, left: 0, right: 0, child: _buildTopBar()),
          Positioned(
            top: MediaQuery.of(context).padding.top + 80,
            left: 20,
            right: 20,
            child: _buildSearchCard(),
          ),
          _buildBottomSheet(),
        ],
      ),
    );
  }

  Widget _buildMapBackground() {
    final hasLocations = _pickupLocation != null || _dropoffLocation != null;
    final bounds = hasLocations ? _calculateBounds() : null;

    return FlutterMap(
      options: MapOptions(
        initialCenter: bounds?.center ?? const LatLng(-6.7924, 39.2083),
        initialZoom: bounds?.zoom ?? 13.0,
        interactionOptions: const InteractionOptions(
          flags: ~InteractiveFlag.pinchZoom | ~InteractiveFlag.doubleTapZoom,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate:
              'https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${AppConfig.mapboxToken}',
          userAgentPackageName: 'com.smartsoko.smartmove',
          fallbackUrl:
              'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',
        ),
        if (_pickupLocation != null)
          MarkerLayer(
            markers: [
              Marker(
                point: _pickupLocation!,
                width: 80,
                height: 80,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    AnimatedBuilder(
                      animation: _pulseAnimation,
                      builder: (context, child) {
                        return Container(
                          width: 20 * _pulseAnimation.value,
                          height: 20 * _pulseAnimation.value,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.luxeSecondary.withOpacity(0.3),
                          ),
                        );
                      },
                    ),
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppTheme.luxeSecondary,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.luxeSecondary.withOpacity(0.5),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.circle, color: Colors.white, size: 6),
                    ),
                  ],
                ),
              ),
            ],
          ),
        if (_dropoffLocation != null)
          MarkerLayer(
            markers: [
              Marker(
                point: _dropoffLocation!,
                width: 40,
                height: 40,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.luxePrimary,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.luxePrimary.withOpacity(0.5),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.location_on, color: Colors.white, size: 22),
                ),
              ),
            ],
          ),
        if (_pickupLocation != null && _dropoffLocation != null)
          PolylineLayer(
            polylines: [
              Polyline(
                points: [_pickupLocation!, _dropoffLocation!],
                color: AppTheme.luxeSecondary.withOpacity(0.6),
                strokeWidth: 3,
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildAtmosphericGlow() {
    return Positioned.fill(
      child: IgnorePointer(
        child: Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 0.8,
              colors: [
                AppTheme.luxePrimary.withOpacity(0.08),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 20,
        right: 20,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.luxeBackground.withOpacity(0.9),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.luxeSurfaceContainerHighest,
              border: Border.all(
                color: AppTheme.luxeOutlineVariant.withOpacity(0.3),
              ),
            ),
            child: const Icon(
              Icons.person,
              color: AppTheme.luxePrimary,
              size: 22,
            ),
          ),
          const Spacer(),
          const Text(
            'SmartMove',
            style: TextStyle(
              color: AppTheme.luxePrimary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          Icon(
            Icons.notifications_outlined,
            color: AppTheme.luxePrimary.withOpacity(0.8),
            size: 26,
          ),
        ],
      ),
    );
  }

  Widget _buildSearchCard() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: () => _showLocationPicker(context, isPickup: true),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppTheme.luxeGlassBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.luxeOutlineVariant.withOpacity(0.2),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(
                  Icons.location_on,
                  color: AppTheme.luxeSecondary,
                  size: 22,
                ),
                const SizedBox(width: 12),
                Text(
                  _pickupAddress.isNotEmpty ? _pickupAddress : 'Current location',
                  style: TextStyle(
                    color: _pickupAddress.isNotEmpty
                        ? AppTheme.luxeOnSurface
                        : AppTheme.luxeOnSurfaceVariant,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _showLocationPicker(context, isPickup: false),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppTheme.luxeGlassBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.luxeOutlineVariant.withOpacity(0.2),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.pin_drop_outlined,
                  color: AppTheme.luxePrimary,
                  size: 22,
                ),
                const SizedBox(width: 12),
                Text(
                  _dropoffAddress.isNotEmpty ? _dropoffAddress : 'Where to?',
                  style: TextStyle(
                    color: _dropoffAddress.isNotEmpty
                        ? AppTheme.luxeOnSurface
                        : AppTheme.luxeOnSurfaceVariant,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _quickChip(Icons.home, 'Home'),
            const SizedBox(width: 8),
            _quickChip(Icons.work, 'Work'),
            const SizedBox(width: 8),
            _quickChip(Icons.add, 'New'),
          ],
        ),
      ],
    );
  }

  Widget _quickChip(IconData icon, String label) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.luxeSurfaceContainerHigh.withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppTheme.luxeOutlineVariant.withOpacity(0.1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: AppTheme.luxePrimary),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.luxeOnSurface,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLocationPicker(BuildContext context, {required bool isPickup}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.luxeSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Container(
          height: 300,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.luxeOutlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                isPickup ? 'Set Pickup Location' : 'Set Drop-off Location',
                style: const TextStyle(
                  color: AppTheme.luxeOnSurface,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                decoration: InputDecoration(
                  hintText: isPickup ? 'Search pickup location...' : 'Search destination...',
                  hintStyle: TextStyle(color: AppTheme.luxeOnSurfaceVariant.withOpacity(0.5)),
                  filled: true,
                  fillColor: AppTheme.luxeSurfaceContainerLow,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: Icon(
                    isPickup ? Icons.location_on : Icons.pin_drop_outlined,
                    color: isPickup ? AppTheme.luxeSecondary : AppTheme.luxePrimary,
                  ),
                ),
                style: const TextStyle(color: AppTheme.luxeOnSurface),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.luxePrimary,
                    foregroundColor: AppTheme.luxeBackground,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Use Current Location', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomSheet() {
    final maxSheetHeight = MediaQuery.of(context).size.height * 0.75;

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
        height: _sheetExpanded ? maxSheetHeight : _sheetHeight.clamp(260, maxSheetHeight),
        decoration: BoxDecoration(
          color: AppTheme.luxeGlassBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          border: Border(
            top: BorderSide(
              color: AppTheme.luxeOutlineVariant.withOpacity(0.2),
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 40,
              offset: const Offset(0, -10),
            ),
          ],
        ),
        child: GestureDetector(
          onVerticalDragUpdate: (details) {
            setState(() {
              final newHeight = _sheetHeight - details.delta.dy;
              _sheetHeight = newHeight.clamp(180, maxSheetHeight);
              _sheetExpanded = _sheetHeight > maxSheetHeight * 0.5;
            });
          },
          onVerticalDragEnd: (details) {
            if (_sheetHeight > maxSheetHeight * 0.5) {
              setState(() {
                _sheetExpanded = true;
                _sheetHeight = maxSheetHeight * 0.8;
              });
            } else {
              setState(() {
                _sheetExpanded = false;
                _sheetHeight = _vehicleTypes.isNotEmpty ? 280 : 180;
              });
            }
          },
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: SizedBox(
                  width: 48,
                  height: 4,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppTheme.luxeOutlineVariant,
                      borderRadius: BorderRadius.all(Radius.circular(2)),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recommended Rides',
                      style: TextStyle(
                        color: AppTheme.luxeOnSurface,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Nearby: 3 min',
                      style: TextStyle(
                        color: AppTheme.luxeSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _vehicleTypes.isEmpty
                    ? Center(
                        child: CircularProgressIndicator(
                          color: AppTheme.luxePrimary.withOpacity(0.5),
                          strokeWidth: 2,
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _vehicleTypes.length,
                        itemBuilder: (context, index) {
                          final type = _vehicleTypes[index];
                          final isSelected = _selectedVehicleType?.id == type.id;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _buildRideCard(type, isSelected, index),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: _buildConfirmButton(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRideCard(VehicleType type, bool isSelected, int index) {
    final vehicleMeta = _vehicleMeta(index);

    return GestureDetector(
      onTap: () {
        setState(() => _selectedVehicleType = type);
        _estimateFare();
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? AppTheme.luxePrimary.withOpacity(0.5)
                : AppTheme.luxeOutlineVariant.withOpacity(0.15),
            width: isSelected ? 1.5 : 1,
          ),
          color: isSelected
              ? AppTheme.luxePrimary.withOpacity(0.08)
              : AppTheme.luxeSurfaceContainerHigh.withOpacity(0.4),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 64,
                height: 48,
                decoration: BoxDecoration(
                  color: vehicleMeta.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: vehicleMeta.color.withOpacity(0.2),
                  ),
                ),
                child: Icon(vehicleMeta.icon, color: vehicleMeta.color, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          vehicleMeta.name,
                          style: TextStyle(
                            color: AppTheme.luxeOnSurface,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (index == 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.luxePrimary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Fastest',
                              style: TextStyle(
                                color: AppTheme.luxePrimary,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      vehicleMeta.description,
                      style: TextStyle(
                        color: AppTheme.luxeOnSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${(type.baseFare / 100).toStringAsFixed(1)}',
                    style: const TextStyle(
                      color: AppTheme.luxePrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (index == 0)
                    Text(
                      '\$${(type.baseFare * 1.38 / 100).toStringAsFixed(1)}',
                      style: TextStyle(
                        color: AppTheme.luxeOnSurfaceVariant.withOpacity(0.5),
                        fontSize: 12,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  ({String name, String description, IconData icon, Color color}) _vehicleMeta(int index) {
    const metas = [
      (name: 'Luxe', description: 'Top-tier comfort \u2022 2 min', icon: Icons.directions_car, color: AppTheme.luxePrimary),
      (name: 'Executive', description: 'Quiet & spacious \u2022 5 min', icon: Icons.directions_car_filled, color: Color(0xFFC0C0C0)),
      (name: 'SUV', description: 'Up to 6 people \u2022 8 min', icon: Icons.directions_bus, color: Color(0xFF00304E)),
    ];
    return metas[index < metas.length ? index : metas.length - 1];
  }

  Widget _buildConfirmButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _isBooking || _fareEstimate == null ? null : _bookRide,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.luxePrimary,
          foregroundColor: AppTheme.luxeBackground,
          disabledBackgroundColor: AppTheme.luxePrimary.withOpacity(0.3),
          disabledForegroundColor: AppTheme.luxeBackground.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
          shadowColor: AppTheme.luxePrimary.withOpacity(0.4),
        ),
        child: _isBooking
            ? SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: AppTheme.luxeBackground,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _isScheduled ? 'Schedule SmartMove' : 'Confirm SmartMove',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward, size: 20),
                ],
              ),
      ),
    );
  }

  ({LatLng center, double zoom}) _calculateBounds() {
    if (_pickupLocation == null && _dropoffLocation == null) {
      return (center: const LatLng(-6.7924, 39.2083), zoom: 13.0);
    }
    final points = <LatLng>[];
    if (_pickupLocation != null) points.add(_pickupLocation!);
    if (_dropoffLocation != null) points.add(_dropoffLocation!);
    final minLat = points.map((p) => p.latitude).reduce((a, b) => a < b ? a : b);
    final maxLat = points.map((p) => p.latitude).reduce((a, b) => a > b ? a : b);
    final minLon = points.map((p) => p.longitude).reduce((a, b) => a < b ? a : b);
    final maxLon = points.map((p) => p.longitude).reduce((a, b) => a > b ? a : b);
    final center = LatLng((minLat + maxLat) / 2, (minLon + maxLon) / 2);
    final latDiff = maxLat - minLat;
    final lonDiff = maxLon - minLon;
    final maxDiff = latDiff > lonDiff ? latDiff : lonDiff;
    double zoom = 14.0;
    if (maxDiff > 0.1) zoom = 12.0;
    else if (maxDiff > 0.05) zoom = 13.0;
    return (center: center, zoom: zoom);
  }
}