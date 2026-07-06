import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMEInvoicesScreen extends StatefulWidget {
  final Shop shop;

  const SMEInvoicesScreen({super.key, required this.shop});

  @override
  State<SMEInvoicesScreen> createState() => _SMEInvoicesScreenState();
}

class _SMEInvoicesScreenState extends State<SMEInvoicesScreen> {
  final SMEService _smeService = SMEService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices & Receipts'),
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _buildFilterChip('All', 'all'),
                _buildFilterChip('Paid', 'paid'),
                _buildFilterChip('Pending', 'pending'),
                _buildFilterChip('Overdue', 'overdue'),
              ],
            ),
          ),

          // Invoice list
          Expanded(
            child: StreamBuilder<List<Invoice>>(
              stream: _smeService.getShopInvoices(widget.shop.id),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                var invoices = snapshot.data!;
                if (_filter != 'all') {
                  invoices = invoices.where((i) => i.paymentStatus == _filter).toList();
                }
                if (invoices.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text('No invoices yet'),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: invoices.length,
                  itemBuilder: (context, index) {
                    return _buildInvoiceCard(invoices[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => setState(() => _filter = value),
        selectedColor: Colors.orange[200],
      ),
    );
  }

  Widget _buildInvoiceCard(Invoice invoice) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: _getStatusColor(invoice.paymentStatus).withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.receipt, color: _getStatusColor(invoice.paymentStatus)),
        ),
        title: Text('INV-${invoice.id.substring(0, 8).toUpperCase()}'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(invoice.customerName),
            Text(
              _formatDate(invoice.createdAt),
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'TSh ${invoice.total.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _getStatusColor(invoice.paymentStatus).withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                invoice.paymentStatus.toUpperCase(),
                style: TextStyle(
                  color: _getStatusColor(invoice.paymentStatus),
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Invoice items
                ...invoice.items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(child: Text('${item.productName} x${item.quantity}')),
                      Text('TSh ${item.total.toStringAsFixed(0)}'),
                    ],
                  ),
                )),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal'),
                    Text('TSh ${invoice.subtotal.toStringAsFixed(0)}'),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Tax'),
                    Text('TSh ${invoice.taxAmount.toStringAsFixed(0)}'),
                  ],
                ),
                if (invoice.deliveryFee > 0)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Delivery'),
                      Text('TSh ${invoice.deliveryFee.toStringAsFixed(0)}'),
                    ],
                  ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(
                      'TSh ${invoice.total.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showInvoicePreview(invoice),
                        icon: const Icon(Icons.visibility, size: 18),
                        label: const Text('Preview'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (invoice.paymentStatus == 'pending')
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _markAsPaid(invoice),
                          icon: const Icon(Icons.check, size: 18),
                          label: const Text('Mark Paid'),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
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

  Color _getStatusColor(String status) {
    switch (status) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'overdue':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  void _showInvoicePreview(Invoice invoice) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Invoice Preview'),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Text(widget.shop.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(widget.shop.address, style: TextStyle(color: Colors.grey[600])),
                    Text(widget.shop.ownerPhone),
                  ],
                ),
              ),
              const Divider(),
              Text('Customer: ${invoice.customerName}'),
              Text('Phone: ${invoice.customerPhone}'),
              Text('Date: ${_formatDate(invoice.createdAt)}'),
              const Divider(),
              ...invoice.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${item.productName} x${item.quantity}'),
                    Text('TSh ${item.total.toStringAsFixed(0)}'),
                  ],
                ),
              )),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  Text(
                    'TSh ${invoice.total.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _markAsPaid(Invoice invoice) {
    _smeService.updateInvoiceStatus(invoice.id, 'paid');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invoice marked as paid'), backgroundColor: Colors.green),
    );
  }
}
