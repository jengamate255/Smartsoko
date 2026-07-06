import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class NavigationMapView extends StatefulWidget {
  final double pickupLat;
  final double pickupLng;
  final double deliveryLat;
  final double deliveryLng;
  final String pickupAddress;
  final String deliveryAddress;
  final bool showPickup;

  const NavigationMapView({
    super.key,
    required this.pickupLat,
    required this.pickupLng,
    required this.deliveryLat,
    required this.deliveryLng,
    required this.pickupAddress,
    required this.deliveryAddress,
    this.showPickup = true,
  });

  @override
  State<NavigationMapView> createState() => _NavigationMapViewState();
}

class _NavigationMapViewState extends State<NavigationMapView> {
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    _updateMarkers();
  }

  void _updateMarkers() {
    final markers = <Marker>{};

    // Pickup location marker
    if (widget.showPickup) {
      markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(widget.pickupLat, widget.pickupLng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: InfoWindow(
            title: 'Pickup Location',
            snippet: widget.pickupAddress,
          ),
        ),
      );
    }

    // Delivery location marker
    markers.add(
      Marker(
        markerId: const MarkerId('delivery'),
        position: LatLng(widget.deliveryLat, widget.deliveryLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(
          title: 'Delivery Location',
          snippet: widget.deliveryAddress,
        ),
      ),
    );

    // Draw route line
    if (widget.showPickup) {
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('route'),
          points: [
            LatLng(widget.pickupLat, widget.pickupLng),
            LatLng(widget.deliveryLat, widget.deliveryLng),
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

    if (widget.showPickup) {
      // Calculate bounds to show both pickup and delivery
      final bounds = LatLngBounds(
        southwest: LatLng(
          widget.pickupLat < widget.deliveryLat ? widget.pickupLat : widget.deliveryLat,
          widget.pickupLng < widget.deliveryLng ? widget.pickupLng : widget.deliveryLng,
        ),
        northeast: LatLng(
          widget.pickupLat > widget.deliveryLat ? widget.pickupLat : widget.deliveryLat,
          widget.pickupLng > widget.deliveryLng ? widget.pickupLng : widget.deliveryLng,
        ),
      );

      _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, 100),
      );
    } else {
      // Just show delivery location
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(widget.deliveryLat, widget.deliveryLng),
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
            target: widget.showPickup
                ? LatLng(widget.pickupLat, widget.pickupLng)
                : LatLng(widget.deliveryLat, widget.deliveryLng),
            zoom: 13,
          ),
          markers: _markers,
          polylines: _polylines,
          myLocationEnabled: true,
          myLocationButtonEnabled: true,
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
