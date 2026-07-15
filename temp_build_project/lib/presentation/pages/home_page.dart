import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:temp_build_project/domain/entities/service_type.dart';
import 'package:temp_build_project/presentation/providers/location_provider.dart';
import 'package:temp_build_project/presentation/providers/notification_provider.dart';
import 'package:temp_build_project/presentation/widgets/service_type_card.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  String _selectedServiceId = 'eco_1';

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

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(locationProvider.notifier).getCurrentLocation();
      ref.read(notificationProvider.notifier).fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final locationState = ref.watch(locationProvider);
    final notifState = ref.watch(notificationProvider);

    return Scaffold(
      body: Stack(
        children: [
          Container(
            color: Colors.grey.shade200,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 8),
                  Text(
                    'Map View',
                    style: TextStyle(color: Colors.grey.shade500),
                  ),
                  Text(
                    locationState.currentLocation != null
                        ? '${locationState.currentLocation!.latitude}, ${locationState.currentLocation!.longitude}'
                        : 'Fetching location...',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: GestureDetector(
              onTap: () => context.go('/profile'),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(Icons.person_outline, size: 22),
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 16,
            child: GestureDetector(
              onTap: () => context.go('/notifications'),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    const Center(child: Icon(Icons.notifications_outlined, size: 22)),
                    if (notifState.unreadCount > 0)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          width: 18,
                          height: 18,
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${notifState.unreadCount}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 80,
            child: GestureDetector(
              onTap: () => context.go('/ride/booking'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(Icons.search, color: Colors.grey.shade400),
                    const SizedBox(width: 12),
                    Text(
                      'Where to?',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Now',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: MediaQuery.of(context).padding.bottom + 80 + 70,
            child: SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _serviceTypes.length,
                itemBuilder: (context, index) {
                  final service = _serviceTypes[index];
                  return Container(
                    width: 80,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _selectedServiceId == service.id
                            ? Colors.black
                            : Colors.transparent,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedServiceId = service.id),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.directions_car, color: Colors.grey.shade700),
                          const SizedBox(height: 4),
                          Text(
                            service.name,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '\$${service.basePrice.toStringAsFixed(0)}+',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
