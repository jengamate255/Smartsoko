import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMEBranchesScreen extends StatefulWidget {
  final Shop shop;

  const SMEBranchesScreen({super.key, required this.shop});

  @override
  State<SMEBranchesScreen> createState() => _SMEBranchesScreenState();
}

class _SMEBranchesScreenState extends State<SMEBranchesScreen> {
  final SMEService _smeService = SMEService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Branch Management')),
      body: StreamBuilder<List<Branch>>(
        stream: _smeService.getShopBranches(widget.shop.id),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final branches = snapshot.data!;
          if (branches.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.account_balance, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No branches yet'),
                  const SizedBox(height: 8),
                  Text('Add branches to expand your business', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: branches.length,
            itemBuilder: (context, index) {
              final branch = branches[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: branch.isActive ? Colors.teal[200] : Colors.grey[200],
                    child: Icon(
                      branch.isActive ? Icons.store : Icons.store_outlined,
                      color: branch.isActive ? Colors.teal[700] : Colors.grey,
                    ),
                  ),
                  title: Text(branch.name),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(branch.address),
                      if (branch.managerName != null)
                        Text('Manager: ${branch.managerName}'),
                      if (branch.phone != null)
                        Text('Phone: ${branch.phone}'),
                    ],
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: branch.isActive ? Colors.green[100] : Colors.red[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          branch.isActive ? 'Open' : 'Closed',
                          style: TextStyle(
                            color: branch.isActive ? Colors.green[800] : Colors.red[800],
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (action) => _handleBranchAction(branch, action),
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: 'edit', child: Text('Edit')),
                          const PopupMenuItem(value: 'toggle', child: Text('Toggle Status')),
                          const PopupMenuItem(value: 'delete', child: Text('Delete')),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddBranchDialog,
        backgroundColor: Colors.orange,
        child: const Icon(Icons.add_business),
      ),
    );
  }

  void _handleBranchAction(Branch branch, String action) {
    switch (action) {
      case 'edit':
        _showEditBranchDialog(branch);
        break;
      case 'toggle':
        _smeService.toggleBranchActive(branch.id, !branch.isActive);
        break;
      case 'delete':
        _confirmDelete(branch);
        break;
    }
  }

  void _showAddBranchDialog() {
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    final managerController = TextEditingController();
    final phoneController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Branch'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Branch Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Address'),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: managerController,
                decoration: const InputDecoration(labelText: 'Manager Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
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
              if (nameController.text.isEmpty || addressController.text.isEmpty) return;
              await _smeService.addBranch(Branch(
                id: '',
                shopId: widget.shop.id,
                name: nameController.text.trim(),
                address: addressController.text.trim(),
                lat: widget.shop.lat,
                lng: widget.shop.lng,
                managerName: managerController.text.trim().isNotEmpty ? managerController.text.trim() : null,
                phone: phoneController.text.trim().isNotEmpty ? phoneController.text.trim() : null,
                createdAt: DateTime.now(),
              ));
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditBranchDialog(Branch branch) {
    final nameController = TextEditingController(text: branch.name);
    final addressController = TextEditingController(text: branch.address);
    final managerController = TextEditingController(text: branch.managerName);
    final phoneController = TextEditingController(text: branch.phone);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Branch'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Branch Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Address'),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: managerController,
                decoration: const InputDecoration(labelText: 'Manager Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
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
              await _smeService.updateBranch(branch.id, branch.copyWith(
                name: nameController.text.trim(),
                address: addressController.text.trim(),
                managerName: managerController.text.trim().isNotEmpty ? managerController.text.trim() : null,
                phone: phoneController.text.trim().isNotEmpty ? phoneController.text.trim() : null,
              ));
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(Branch branch) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Branch'),
        content: Text('Are you sure you want to delete ${branch.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _smeService.deleteBranch(branch.id);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
