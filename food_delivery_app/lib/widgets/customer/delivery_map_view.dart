import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:smartsoko/models/order.dart';

class DeliveryMapView extends StatefulWidget {
  final Order order;
  final double? driverLat;
  final double? driverLng;

  const DeliveryMapView({
    super.key,
    required this.order,
    this.driverLat,
    this.driverLng,
  });

  @override
  State<DeliveryMapView> createState() => _DeliveryMapViewState();
}

class _DeliveryMapViewState extends State<DeliveryMapView> {
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    _updateMarkers();
  }

  @override
  void didUpdateWidget(DeliveryMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.driverLat != widget.driverLat ||
        oldWidget.driverLng != widget.driverLng) {
      _updateMarkers();
      _updateCamera();
    }
  }

  void _updateMarkers() {
    final markers = <Marker>{};
    final latitude = widget.order.deliveryLat;
    final longitude = widget.order.deliveryLng;
    _polylines = {};
    if (latitude == null || longitude == null) {
      setState(() => _markers = markers);
      return;
    }

    // Customer location marker
    markers.add(
      Marker(
        markerId: const MarkerId('customer'),
        position: LatLng(latitude, longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        infoWindow: const InfoWindow(
          title: 'Delivery Location',
          snippet: 'Your order will be delivered here',
        ),
      ),
    );

    // Driver location marker (if available)
    if (widget.driverLat != null && widget.driverLng != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: LatLng(widget.driverLat!, widget.driverLng!),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          infoWindow: const InfoWindow(
            title: 'Driver',
            snippet: 'Your delivery driver',
          ),
        ),
      );

      // Draw route line between driver and customer
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('route'),
          points: [
            LatLng(widget.driverLat!, widget.driverLng!),
            LatLng(latitude, longitude),
          ],
          color: Colors.blue,
          width: 4,
        ),
      );
    }

    setState(() {
      _markers = markers;
    });
  }

  void _updateCamera() {
    if (_mapController == null) return;
    final latitude = widget.order.deliveryLat;
    final longitude = widget.order.deliveryLng;
    if (latitude == null || longitude == null) return;

    if (widget.driverLat != null && widget.driverLng != null) {
      // Calculate bounds to show both driver and customer
      final bounds = LatLngBounds(
        southwest: LatLng(
          widget.driverLat! < latitude ? widget.driverLat! : latitude,
          widget.driverLng! < longitude ? widget.driverLng! : longitude,
        ),
        northeast: LatLng(
          widget.driverLat! > latitude ? widget.driverLat! : latitude,
          widget.driverLng! > longitude ? widget.driverLng! : longitude,
        ),
      );

      _mapController!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 100));
    } else {
      // Just show customer location
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(latitude, longitude), 15),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final latitude = widget.order.deliveryLat;
    final longitude = widget.order.deliveryLng;
    if (latitude == null || longitude == null) {
      return const SizedBox(
        height: 300,
        child: Center(child: Text('Delivery location is not available yet')),
      );
    }
    return Container(
      height: 300,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: GoogleMap(
          initialCameraPosition: CameraPosition(
            target: LatLng(latitude, longitude),
            zoom: 15,
          ),
          markers: _markers,
          polylines: _polylines,
          myLocationEnabled: false,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: true,
          mapToolbarEnabled: false,
          onMapCreated: (controller) {
            _mapController = controller;
            _updateCamera();
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
