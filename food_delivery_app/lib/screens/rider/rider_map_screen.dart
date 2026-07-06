import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../../services/location_service.dart';
import '../../services/order_service.dart';
import '../../models/order.dart';
import '../../config/app_config.dart';

class RiderMapScreen extends StatefulWidget {
  const RiderMapScreen({super.key});

  @override
  State<RiderMapScreen> createState() => _RiderMapScreenState();
}

class _RiderMapScreenState extends State<RiderMapScreen> {
  GoogleMapController? _mapController;
  LatLng _currentLocation = const LatLng(-6.7924, 39.2083);
  final Set<Marker> _markers = {};
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _startLocationBroadcast();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    final locationService = context.read<LocationService>();
    final position = await locationService.getCurrentPosition();
    if (position != null && mounted) {
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
      });
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(_currentLocation),
      );
    }
  }

  void _startLocationBroadcast() {
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      final locationService = context.read<LocationService>();
      final position = await locationService.getCurrentPosition();
      if (position != null && mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
          _markers.add(Marker(
            markerId: const MarkerId('rider'),
            position: _currentLocation,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          ));
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Tracking'),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: _currentLocation,
                zoom: 14,
              ),
              markers: _markers,
              onMapCreated: (controller) {
                _mapController = controller;
              },
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
            ),
          ),
          Expanded(
            flex: 1,
            child: StreamBuilder<List<Order>>(
              stream: orderService.getPendingOrders(),
              builder: (context, snapshot) {
                final orders = snapshot.data ?? [];
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    return ListTile(
                      leading: const Icon(Icons.location_on),
                      title: Text('Order #${order.id.substring(0, 8)}'),
                      subtitle: Text(order.deliveryAddress),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () {
                        if (order.deliveryLat != null && order.deliveryLng != null) {
                          _mapController?.animateCamera(
                            CameraUpdate.newLatLng(
                              LatLng(order.deliveryLat!, order.deliveryLng!),
                            ),
                          );
                          _markers.add(Marker(
                            markerId: MarkerId('destination_${order.id}'),
                            position: LatLng(order.deliveryLat!, order.deliveryLng!),
                            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
                          ));
                        }
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _getCurrentLocation,
        child: const Icon(Icons.my_location),
      ),
    );
  }
}
