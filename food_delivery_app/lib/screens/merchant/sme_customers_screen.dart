import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMECustomersScreen extends StatefulWidget {
  final Shop shop;

  const SMECustomersScreen({super.key, required this.shop});

  @override
  State<SMECustomersScreen> createState() => _SMECustomersScreenState();
}

class _SMECustomersScreenState extends State<SMECustomersScreen> {
  final SMEService _smeService = SMEService();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer CRM')),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search customers...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
            ),
          ),

          // Customer list
          Expanded(
            child: StreamBuilder<List<CustomerProfile>>(
              stream: _smeService.getShopCustomers(widget.shop.id),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                var customers = snapshot.data!;
                if (_searchQuery.isNotEmpty) {
                  customers = customers.where((c) =>
                      (c.name ?? '').toLowerCase().contains(_searchQuery) ||
                      c.phone.contains(_searchQuery)).toList();
                }
                if (customers.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.group_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text('No customers yet'),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: customers.length,
                  itemBuilder: (context, index) {
                    return _buildCustomerCard(customers[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerCard(CustomerProfile customer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: _getCustomerTierColor(customer),
          child: Text(
            (customer.name ?? 'C')[0].toUpperCase(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(customer.name ?? 'Unknown Customer'),
        subtitle: Text(customer.phone),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'TSh ${customer.totalSpent.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              '${customer.totalOrders} orders',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Stats grid
                Row(
                  children: [
                    Expanded(child: _buildCustomerStat('Orders', customer.totalOrders.toString(), Icons.receipt_long)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildCustomerStat('Avg Order', 'TSh ${customer.averageOrderValue.toStringAsFixed(0)}', Icons.calculate)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildCustomerStat('Points', customer.loyaltyPoints.toString(), Icons.stars)),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                // Customer tier
                Row(
                  children: [
                    const Icon(Icons.workspace_premium, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Customer Tier: ${_getCustomerTier(customer)}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Last order
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 20),
                    const SizedBox(width: 8),
                    Text('Last order: ${_formatDate(customer.lastOrderAt)}'),
                  ],
                ),
                const SizedBox(height: 16),
                // Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _addLoyaltyPoints(customer),
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add Points'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _addNote(customer),
                        icon: const Icon(Icons.note_add, size: 18),
                        label: const Text('Add Note'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerStat(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: Colors.orange),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Color _getCustomerTierColor(CustomerProfile customer) {
    if (customer.totalSpent > 500000) return Colors.amber;
    if (customer.totalSpent > 200000) return Colors.blue;
    if (customer.totalSpent > 50000) return Colors.green;
    return Colors.grey;
  }

  String _getCustomerTier(CustomerProfile customer) {
    if (customer.totalSpent > 500000) return 'Gold';
    if (customer.totalSpent > 200000) return 'Silver';
    if (customer.totalSpent > 50000) return 'Bronze';
    return 'Regular';
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _addLoyaltyPoints(CustomerProfile customer) {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Add Loyalty Points'),
          content: TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Points'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final points = int.tryParse(controller.text);
                if (points != null && points > 0) {
                  await _smeService.addLoyaltyPoints(customer.id, points);
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Added $points points'), backgroundColor: Colors.green),
                  );
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  void _addNote(CustomerProfile customer) {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController(text: customer.notes);
        return AlertDialog(
          title: const Text('Customer Note'),
          content: TextField(
            controller: controller,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Note'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                await _smeService.addCustomerNote(customer.id, controller.text);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Note saved'), backgroundColor: Colors.green),
                );
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }
}
