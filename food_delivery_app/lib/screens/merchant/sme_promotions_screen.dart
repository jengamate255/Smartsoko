import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMEPromotionsScreen extends StatefulWidget {
  final Shop shop;

  const SMEPromotionsScreen({super.key, required this.shop});

  @override
  State<SMEPromotionsScreen> createState() => _SMEPromotionsScreenState();
}

class _SMEPromotionsScreenState extends State<SMEPromotionsScreen> {
  final SMEService _smeService = SMEService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Promotions & Discounts')),
      body: StreamBuilder<List<Promotion>>(
        stream: _smeService.getShopPromotions(widget.shop.id),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final promotions = snapshot.data!;
          if (promotions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_offer_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No promotions yet'),
                  const SizedBox(height: 8),
                  Text('Create promotions to boost sales', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: promotions.length,
            itemBuilder: (context, index) {
              final promo = promotions[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: promo.isCurrentlyActive ? Colors.green[100] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getPromotionIcon(promo.type),
                      color: promo.isCurrentlyActive ? Colors.green : Colors.grey,
                    ),
                  ),
                  title: Text(promo.name),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_getPromotionDescription(promo)),
                      Text(
                        '${_formatDate(promo.startDate)} - ${_formatDate(promo.endDate)}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (promo.usageLimit != null)
                        Text(
                          '${promo.usageCount}/${promo.usageLimit}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      const SizedBox(width: 8),
                      Switch(
                        value: promo.isActive,
                        onChanged: (v) => _smeService.togglePromotion(promo.id, v),
                      ),
                    ],
                  ),
                  onTap: () => _showEditPromotionDialog(promo),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddPromotionDialog,
        backgroundColor: Colors.orange,
        child: const Icon(Icons.add),
      ),
    );
  }

  IconData _getPromotionIcon(PromotionType type) {
    switch (type) {
      case PromotionType.percentage:
        return Icons.percent;
      case PromotionType.fixed:
        return Icons.attach_money;
      case PromotionType.buyOneGetOne:
        return Icons.autorenew;
      case PromotionType.bundle:
        return Icons.inventory_2;
      case PromotionType.flash:
        return Icons.flash_on;
    }
  }

  String _getPromotionDescription(Promotion promo) {
    switch (promo.type) {
      case PromotionType.percentage:
        return '${promo.discountValue.toInt()}% off';
      case PromotionType.fixed:
        return 'TSh ${promo.discountValue.toInt()} off';
      case PromotionType.buyOneGetOne:
        return 'Buy 1 Get 1 Free';
      case PromotionType.bundle:
        return 'Bundle Deal';
      case PromotionType.flash:
        return 'Flash Sale - ${promo.discountValue.toInt()}% off';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _showAddPromotionDialog() {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    final discountController = TextEditingController();
    final codeController = TextEditingController();
    PromotionType selectedType = PromotionType.percentage;
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now().add(const Duration(days: 7));

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Promotion'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Promotion Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  decoration: const InputDecoration(labelText: 'Description'),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<PromotionType>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: PromotionType.values.map((type) {
                    return DropdownMenuItem(value: type, child: Text(type.name));
                  }).toList(),
                  onChanged: (v) {
                    if (v != null) setDialogState(() => selectedType = v);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: discountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: selectedType == PromotionType.percentage ? 'Discount %' : 'Discount Amount',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: codeController,
                  decoration: const InputDecoration(labelText: 'Promo Code (optional)'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text('Start: ${_formatDate(startDate)}', style: const TextStyle(fontSize: 12)),
                    ),
                    TextButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: startDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setDialogState(() => startDate = picked);
                      },
                      child: const Text('Pick'),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: Text('End: ${_formatDate(endDate)}', style: const TextStyle(fontSize: 12)),
                    ),
                    TextButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: endDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setDialogState(() => endDate = picked);
                      },
                      child: const Text('Pick'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.isEmpty || discountController.text.isEmpty) return;
                await _smeService.addPromotion(Promotion(
                  id: '',
                  shopId: widget.shop.id,
                  name: nameController.text.trim(),
                  description: descController.text.trim(),
                  type: selectedType,
                  discountValue: double.parse(discountController.text),
                  startDate: startDate,
                  endDate: endDate,
                  code: codeController.text.trim().isNotEmpty ? codeController.text.trim() : null,
                  createdAt: DateTime.now(),
                ));
                Navigator.pop(context);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditPromotionDialog(Promotion promo) {
    // Similar to add but with pre-filled values
    _showAddPromotionDialog();
  }
}
