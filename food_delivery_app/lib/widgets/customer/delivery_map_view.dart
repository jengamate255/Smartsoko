import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../models/order.dart';

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

    // Customer location marker
    markers.add(
      Marker(
        markerId: const MarkerId('customer'),
        position: LatLng(widget.order.deliveryLat, widget.order.deliveryLng),
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
            LatLng(widget.order.deliveryLat, widget.order.deliveryLng),
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

    if (widget.driverLat != null && widget.driverLng != null) {
      // Calculate bounds to show both driver and customer
      final bounds = LatLngBounds(
        southwest: LatLng(
          widget.driverLat! < widget.order.deliveryLat ? widget.driverLat! : widget.order.deliveryLat,
          widget.driverLng! < widget.order.deliveryLng ? widget.driverLng! : widget.order.deliveryLng,
        ),
        northeast: LatLng(
          widget.driverLat! > widget.order.deliveryLat ? widget.driverLat! : widget.order.deliveryLat,
          widget.driverLng! > widget.order.deliveryLng ? widget.driverLng! : widget.order.deliveryLng,
        ),
      );

      _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, 100),
      );
    } else {
      // Just show customer location
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(widget.order.deliveryLat, widget.order.deliveryLng),
          15,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
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
            target: LatLng(widget.order.deliveryLat, widget.order.deliveryLng),
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
