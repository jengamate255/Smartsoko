import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMovePricingRulesScreen extends StatefulWidget {
  const SmartMovePricingRulesScreen({super.key});

  @override
  State<SmartMovePricingRulesScreen> createState() => _SmartMovePricingRulesScreenState();
}

class _SmartMovePricingRulesScreenState extends State<SmartMovePricingRulesScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _rules = [];
  List<Map<String, dynamic>> _vehicleTypes = [];
  String _filterVehicleType = 'all';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      final vtypes = await client.from('vehicle_types').select('id, name, display_name').eq('is_active', true);
      _vehicleTypes = List<Map<String, dynamic>>.from(vtypes.data ?? []);

      var query = client.from('ride_pricing_rules').select('''
        *,
        vehicle_type:vehicle_types!ride_pricing_rules_vehicle_type_id_fkey(name, display_name)
      ''').order('priority', ascending: false);

      if (_filterVehicleType != 'all') {
        query = query.eq('vehicle_type_id', _filterVehicleType);
      }

      final response = await query;
      if (mounted) {
        setState(() {
          _rules = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleRuleActive(String ruleId, bool isActive) async {
    try {
      final client = _supabaseService.client;
      await client.from('ride_pricing_rules').update({'is_active': isActive}).eq('id', ruleId);
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showRuleDetail(Map<String, dynamic> rule) {
    final vtype = rule['vehicle_type'] as Map<String, dynamic>?;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(rule['name'] ?? 'Pricing Rule'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _infoRow('Vehicle Type', Text(vtype?['display_name'] ?? 'N/A')),
              _infoRow('Status', Chip(
                label: Text(rule['is_active'] == true ? 'ACTIVE' : 'INACTIVE'),
                backgroundColor: (rule['is_active'] == true ? Colors.green : Colors.grey).withOpacity(0.1),
                labelStyle: TextStyle(color: rule['is_active'] == true ? Colors.green : Colors.grey, fontWeight: FontWeight.bold),
              )),
              _infoRow('Priority', Text('${rule['priority'] ?? 0}')),
              const Divider(),
              _infoRow('Base Fare', Text('TZS ${rule['base_fare'] ?? 0}')),
              _infoRow('Per KM', Text('TZS ${rule['per_km_rate'] ?? 0}')),
              _infoRow('Per Minute', Text('TZS ${rule['per_minute_rate'] ?? 0}')),
              _infoRow('Min Fare', Text('TZS ${rule['min_fare'] ?? 0}')),
              _infoRow('Max Fare', Text(rule['max_fare'] != null ? 'TZS ${rule['max_fare']}' : 'Unlimited')),
              const Divider(),
              _infoRow('Surge Threshold', Text('${rule['surge_threshold'] ?? 1.00}x')),
              _infoRow('Max Surge', Text('${rule['max_surge_multiplier'] ?? 3.00}x')),
              _infoRow('Waiting Fee', Text('TZS ${rule['waiting_fee_per_minute'] ?? 0}/min')),
              _infoRow('Cancellation Fee', Text('TZS ${rule['cancellation_fee'] ?? 0}')),
              _infoRow('Airport Fee', Text('TZS ${rule['airport_fee'] ?? 0}')),
              if ((rule['night_surcharge_percentage'] ?? 0) > 0)
                _infoRow('Night Surcharge', Text('${rule['night_surcharge_percentage']}%')),
              if ((rule['peak_surcharge_percentage'] ?? 0) > 0)
                _infoRow('Peak Surcharge', Text('${rule['peak_surcharge_percentage']}%')),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _toggleRuleActive(rule['id'], !(rule['is_active'] == true));
            },
            child: Text(rule['is_active'] == true ? 'Deactivate' : 'Activate',
                style: TextStyle(color: rule['is_active'] == true ? Colors.red : Colors.green)),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _infoRow(String label, Widget value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: value),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pricing Rules'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData)],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.grey[50],
            child: DropdownButtonFormField<String>(
              value: _filterVehicleType,
              decoration: InputDecoration(
                labelText: 'Filter by Vehicle Type',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
              ),
              items: [
                const DropdownMenuItem(value: 'all', child: Text('All Vehicle Types')),
                ..._vehicleTypes.map((vt) => DropdownMenuItem(
                  value: vt['id'],
                  child: Text(vt['display_name'] ?? vt['name'] ?? 'Unknown'),
                )),
              ],
              onChanged: (v) { _filterVehicleType = v!; _loadData(); },
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _rules.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.attach_money, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No pricing rules', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _rules.length,
                        itemBuilder: (context, index) {
                          final rule = _rules[index];
                          final vtype = rule['vehicle_type'] as Map<String, dynamic>?;
                          final isActive = rule['is_active'] == true;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isActive ? Colors.green[100] : Colors.grey[200],
                                child: Icon(Icons.monetization_on, color: isActive ? Colors.green[700] : Colors.grey),
                              ),
                              title: Row(
                                children: [
                                  Expanded(child: Text(rule['name'] ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.bold))),
                                  Switch(
                                    value: isActive,
                                    onChanged: (v) => _toggleRuleActive(rule['id'], v),
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ],
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${vtype?['display_name'] ?? 'Any'} • Priority ${rule['priority'] ?? 0}'),
                                  Text('Base TZS ${rule['base_fare'] ?? 0} • TZS ${rule['per_km_rate'] ?? 0}/km',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                              isThreeLine: true,
                              onTap: () => _showRuleDetail(rule),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
