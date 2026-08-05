import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:temp_build_project/domain/entities/location_data.dart';
import 'package:temp_build_project/domain/entities/service_type.dart';
import 'package:temp_build_project/presentation/providers/trip_provider.dart';
import 'package:temp_build_project/presentation/providers/location_provider.dart';
import 'package:temp_build_project/presentation/widgets/service_type_card.dart';
import 'package:temp_build_project/presentation/widgets/location_input.dart';

class BookingPage extends ConsumerStatefulWidget {
  const BookingPage({super.key});

  @override
  ConsumerState<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends ConsumerState<BookingPage> {
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  String _selectedServiceId = 'eco_1';
  bool _showServices = false;

  final List<ServiceType> _serviceTypes = const [
    ServiceType(
      id: 'eco_1',
      name: 'Economy',
      description: 'Affordable rides',
      iconUrl: '',
      basePrice: 5.0,
      pricePerKm: 1.5,
      pricePerMin: 0.25,
      minEstimateMinutes: 3,
      maxEstimateMinutes: 8,
      capacity: 4,
    ),
    ServiceType(
      id: 'comfort_1',
      name: 'Comfort',
      description: 'Newer cars with extra legroom',
      iconUrl: '',
      basePrice: 8.0,
      pricePerKm: 2.0,
      pricePerMin: 0.30,
      minEstimateMinutes: 3,
      maxEstimateMinutes: 10,
      capacity: 4,
    ),
    ServiceType(
      id: 'xl_1',
      name: 'XL',
      description: 'Extra space for groups',
      iconUrl: '',
      basePrice: 12.0,
      pricePerKm: 2.8,
      pricePerMin: 0.45,
      minEstimateMinutes: 5,
      maxEstimateMinutes: 12,
      capacity: 6,
    ),
    ServiceType(
      id: 'prem_1',
      name: 'Premium',
      description: 'Luxury vehicles',
      iconUrl: '',
      basePrice: 15.0,
      pricePerKm: 3.5,
      pricePerMin: 0.50,
      minEstimateMinutes: 5,
      maxEstimateMinutes: 12,
      capacity: 4,
    ),
  ];

  ServiceType get _selectedService =>
      _serviceTypes.firstWhere((s) => s.id == _selectedServiceId);

  double _estimatedPrice(double distance) {
    return _selectedService.estimatePrice(distance, 15);
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }

  void _onRequestRide() {
    if (_pickupController.text.isEmpty || _dropoffController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter pickup and dropoff locations')),
      );
      return;
    }
    final pickup = LocationData(
      id: 'pickup_${DateTime.now().millisecondsSinceEpoch}',
      address: _pickupController.text,
      latitude: 40.7128,
      longitude: -74.0060,
    );
    final dropoff = LocationData(
      id: 'dropoff_${DateTime.now().millisecondsSinceEpoch}',
      address: _dropoffController.text,
      latitude: 40.7580,
      longitude: -73.9855,
    );
    ref.read(tripProvider.notifier).createTrip(
          pickup,
          dropoff,
          _selectedServiceId,
          'wallet',
        );
    context.go('/ride/tracking/current');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tripState = ref.watch(tripProvider);
    final locationState = ref.watch(locationProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => context.pop(),
        ),
        title: const Text('Book a Ride'),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.map, size: 48, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          Text(
                            'Map showing route',
                            style: TextStyle(color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Container(
                            width: 2,
                            height: 30,
                            color: Colors.grey.shade300,
                          ),
                          const Icon(Icons.location_on, size: 16, color: Colors.red),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          children: [
                            LocationInput(
                              controller: _pickupController,
                              hintText: 'Current location',
                              leadingIcon: Icons.circle,
                              leadingIconColor: Colors.green,
                              trailing: IconButton(
                                icon: const Icon(Icons.my_location, size: 20),
                                onPressed: () {
                                  _pickupController.text = 'Current Location';
                                },
                              ),
                            ),
                            const SizedBox(height: 2),
                            LocationInput(
                              controller: _dropoffController,
                              hintText: 'Where to?',
                              leadingIcon: Icons.location_on,
                              leadingIconColor: Colors.red,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (locationState.savedLocations.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Saved Places',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...locationState.savedLocations.map(
                      (loc) => ListTile(
                        dense: true,
                        leading: Icon(
                          loc.label == 'Home' ? Icons.home : Icons.work,
                          color: Colors.grey.shade600,
                        ),
                        title: Text(loc.label ?? 'Saved'),
                        subtitle: Text(loc.address, maxLines: 1, overflow: TextOverflow.ellipsis),
                        onTap: () => _dropoffController.text = loc.address,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Select service',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _showServices = !_showServices),
                        child: Text(_showServices ? 'Hide' : 'Show all'),
                      ),
                    ],
                  ),
                  ...(_showServices
                      ? _serviceTypes
                      : _serviceTypes.take(2))
                      .map(
                        (service) => ServiceTypeCard(
                          serviceType: service,
                          isSelected: _selectedServiceId == service.id,
                          estimatedPrice: _estimatedPrice(10),
                          onTap: () => setState(() => _selectedServiceId = service.id),
                        ),
                      ),
                  ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          _PriceRow(label: 'Base fare', amount: _selectedService.basePrice),
                          const SizedBox(height: 8),
                          _PriceRow(label: 'Distance (10 km)', amount: _selectedService.pricePerKm * 10),
                          const SizedBox(height: 8),
                          _PriceRow(label: 'Time (15 min)', amount: _selectedService.pricePerMin * 15),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Divider(),
                          ),
                          _PriceRow(
                            label: 'Total estimate',
                            amount: _estimatedPrice(10),
                            isTotal: true,
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: tripState.isLoading ? null : _onRequestRide,
                  child: tripState.isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          'Request ${_selectedService.name} - \$${_estimatedPrice(10).toStringAsFixed(2)}',
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  final String label;
  final double amount;
  final bool isTotal;

  const _PriceRow({
    required this.label,
    required this.amount,
    this.isTotal = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 16 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: isTotal ? Colors.black : Colors.grey.shade600,
          ),
        ),
        Text(
          '\$${amount.toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: isTotal ? 16 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
            color: isTotal ? Colors.black : Colors.grey.shade700,
          ),
        ),
      ],
    );
  }
}
