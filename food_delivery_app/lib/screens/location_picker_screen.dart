import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationPickerScreen extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final String? initialAddress;

  const LocationPickerScreen({
    Key? key,
    this.initialLatitude,
    this.initialLongitude,
    this.initialAddress,
  }) : super(key: key);

  @override
  _LocationPickerScreenState createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  GoogleMapController? _mapController;
  LatLng? _selectedLocation;
  String _selectedAddress = '';
  bool _isLoading = true;
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  final Set<Marker> _markers = {};

  // Default to Dar es Salaam
  static const LatLng _defaultLocation = LatLng(-6.7924, 39.2083);

  @override
  void initState() {
    super.initState();
    _initializeLocation();
  }

  Future<void> _initializeLocation() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Use initial location if provided
      if (widget.initialLatitude != null && widget.initialLongitude != null) {
        setState(() {
          _selectedLocation = LatLng(widget.initialLatitude!, widget.initialLongitude!);
          _selectedAddress = widget.initialAddress ?? '';
        });
        _updateMarker(_selectedLocation!);
      } else {
        // Try to get current location
        await _getCurrentLocation();
      }
    } catch (e) {
      print('Error initializing location: $e');
      // Use default location
      setState(() {
        _selectedLocation = _defaultLocation;
        _selectedAddress = 'Dar es Salaam, Tanzania';
      });
      _updateMarker(_defaultLocation);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied');
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _selectedLocation = LatLng(position.latitude, position.longitude);
      });

      await _getAddressFromLatLng(_selectedLocation!);
      _updateMarker(_selectedLocation!);
    } catch (e) {
      print('Error getting current location: $e');
      // Use default location
      setState(() {
        _selectedLocation = _defaultLocation;
        _selectedAddress = 'Dar es Salaam, Tanzania';
      });
      _updateMarker(_defaultLocation);
    }
  }

  Future<void> _getAddressFromLatLng(LatLng latLng) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
        latLng.latitude,
        latLng.longitude,
      );

      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        setState(() {
          _selectedAddress = [
            place.street,
            place.subLocality,
            place.locality,
            place.administrativeArea,
            place.country,
          ].where((element) => element != null && element.isNotEmpty).join(', ');
        });
      }
    } catch (e) {
      print('Error getting address: $e');
      setState(() {
        _selectedAddress = 'Lat: ${latLng.latitude.toStringAsFixed(6)}, Lng: ${latLng.longitude.toStringAsFixed(6)}';
      });
    }
  }

  void _updateMarker(LatLng latLng) {
    setState(() {
      _markers.clear();
      _markers.add(
        Marker(
          markerId: const MarkerId('selected_location'),
          position: latLng,
          infoWindow: InfoWindow(
            title: 'Mahali pa Biashara',
            snippet: _selectedAddress,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        ),
      );
    });
  }

  Future<void> _searchLocation(String query) async {
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
    });

    try {
      List<Location> locations = await locationFromAddress(query);
      
      if (locations.isNotEmpty) {
        Location location = locations.first;
        LatLng latLng = LatLng(location.latitude, location.longitude);
        
        setState(() {
          _selectedLocation = latLng;
        });

        await _getAddressFromLatLng(latLng);
        _updateMarker(latLng);

        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(latLng, 15),
        );
      }
    } catch (e) {
      print('Error searching location: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Imeshindwa kupata mahali'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isSearching = false;
      });
    }
  }

  void _onMapTap(LatLng latLng) async {
    setState(() {
      _selectedLocation = latLng;
    });

    await _getAddressFromLatLng(latLng);
    _updateMarker(latLng);
  }

  void _confirmLocation() {
    if (_selectedLocation != null) {
      Navigator.pop(context, {
        'latitude': _selectedLocation!.latitude,
        'longitude': _selectedLocation!.longitude,
        'address': _selectedAddress,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chagua Mahali'),
        backgroundColor: Colors.orange,
        elevation: 0,
        actions: [
          if (_selectedLocation != null)
            TextButton(
              onPressed: _confirmLocation,
              child: const Text(
                'Chagua',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Search bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Tafuta mahali...',
                      prefixIcon: _isSearching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                    onSubmitted: _searchLocation,
                    textInputAction: TextInputAction.search,
                  ),
                ),

                // Selected address display
                if (_selectedAddress.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: Colors.orange[50],
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.orange, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _selectedAddress,
                            style: const TextStyle(fontSize: 14),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),

                // Map
                Expanded(
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: _selectedLocation ?? _defaultLocation,
                      zoom: 15,
                    ),
                    onMapCreated: (controller) {
                      _mapController = controller;
                    },
                    onTap: _onMapTap,
                    markers: _markers,
                    myLocationEnabled: true,
                    myLocationButtonEnabled: true,
                    zoomControlsEnabled: true,
                    mapToolbarEnabled: false,
                  ),
                ),

                // Instructions
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.grey[100],
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Gusa ramani au tafuta mahali kuchagua eneo la biashara yako',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _selectedLocation != null ? _confirmLocation : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(Icons.check),
                          label: const Text(
                            'Chagua Mahali Hapa',
                            style: TextStyle(fontSize: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    _searchController.dispose();
    super.dispose();
  }
}
