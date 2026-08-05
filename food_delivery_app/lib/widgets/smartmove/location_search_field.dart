import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class LocationSearchField extends StatefulWidget {
  final String label;
  final TextEditingController controller;
  final String hintText;
  final LatLng? initialLocation;
  final String? initialAddress;
  final void Function(LatLng location, String address) onLocationSelected;
  final Color iconColor;

  const LocationSearchField({
    super.key,
    required this.label,
    required this.controller,
    required this.hintText,
    this.initialLocation,
    this.initialAddress,
    required this.onLocationSelected,
    this.iconColor = Colors.green,
  });

  @override
  State<LocationSearchField> createState() => _LocationSearchFieldState();
}

class _LocationSearchFieldState extends State<LocationSearchField> {
  List<Map<String, dynamic>> _suggestions = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onSearchChanged);
    super.dispose();
  }

  void _onSearchChanged() {
    if (widget.controller.text.length > 2) {
      _searchLocations(widget.controller.text);
    } else {
      setState(() => _suggestions = []);
    }
  }

  Future<void> _searchLocations(String query) async {
    setState(() => _isLoading = true);
    try {
      final client = SupabaseService().client;
      final response = await client.functions.invoke('smartmove-geocoding', body: {
        'action': 'autocomplete',
        'query': query,
        'limit': 5,
      });

      final data = response.data;
      if (data != null && data['features'] != null) {
        setState(() {
          _suggestions = (data['features'] as List)
              .map((s) {
                final feature = s as Map<String, dynamic>;
                final center = feature['center'] as List;
                return {
                  'name': feature['place_name'] ?? '',
                  'full_address': feature['place_name'] ?? '',
                  'latitude': center[1],
                  'longitude': center[0],
                  'address': feature['address'] ?? '',
                };
              })
              .toList();
        });
      }
    } catch (e) {
      // Silently fail - could use local fallback
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: widget.controller,
          decoration: InputDecoration(
            hintText: widget.hintText,
            prefixIcon: Container(
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: widget.iconColor,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.circle, color: Colors.white, size: 12),
            ),
            suffixIcon: _isLoading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : widget.controller.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          widget.controller.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
            filled: true,
            fillColor: Colors.grey[50],
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
        if (_suggestions.isNotEmpty) ...[
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
            ),
            constraints: const BoxConstraints(maxHeight: 200),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _suggestions.length,
              itemBuilder: (context, index) {
                final suggestion = _suggestions[index];
                return ListTile(
                  leading: Icon(
                    Icons.location_on,
                    color: widget.iconColor,
                    size: 20,
                  ),
                  title: Text(
                    suggestion['name'] ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    suggestion['full_address'] ?? suggestion['address'] ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                  dense: true,
                  onTap: () {
                    final lat = (suggestion['latitude'] as num).toDouble();
                    final lng = (suggestion['longitude'] as num).toDouble();
                    final address = suggestion['full_address'] as String? ?? suggestion['name'] as String;
                    
                    widget.onLocationSelected(LatLng(lat, lng), address);
                    widget.controller.text = address;
                    setState(() => _suggestions = []);
                  },
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}