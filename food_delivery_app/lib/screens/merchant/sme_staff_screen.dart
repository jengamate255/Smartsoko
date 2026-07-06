import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMEStaffScreen extends StatefulWidget {
  final Shop shop;

  const SMEStaffScreen({super.key, required this.shop});

  @override
  State<SMEStaffScreen> createState() => _SMEStaffScreenState();
}

class _SMEStaffScreenState extends State<SMEStaffScreen> {
  final SMEService _smeService = SMEService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Staff Management')),
      body: StreamBuilder<List<Staff>>(
        stream: _smeService.getShopStaff(widget.shop.id),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final staff = snapshot.data!;
          if (staff.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No staff members yet'),
                  const SizedBox(height: 8),
                  Text('Add staff to manage your business', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: staff.length,
            itemBuilder: (context, index) {
              final s = staff[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: s.role.icon == Icons.admin_panel_settings
                        ? Colors.orange[200]
                        : Colors.blue[200],
                    child: Icon(s.role.icon, color: s.role.icon == Icons.admin_panel_settings
                        ? Colors.orange[700]
                        : Colors.blue[700]),
                  ),
                  title: Text(s.name),
                  subtitle: Text('${s.role.displayName} • ${s.phone}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: s.isActive ? Colors.green[100] : Colors.red[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          s.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(
                            color: s.isActive ? Colors.green[800] : Colors.red[800],
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (action) => _handleStaffAction(s, action),
                        itemBuilder: (context) => [
                          const PopupMenuItem(value: 'edit', child: Text('Edit')),
                          const PopupMenuItem(value: 'deactivate', child: Text('Deactivate')),
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
        onPressed: _showAddStaffDialog,
        backgroundColor: Colors.orange,
        child: const Icon(Icons.person_add),
      ),
    );
  }

  void _handleStaffAction(Staff staff, String action) {
    switch (action) {
      case 'edit':
        _showEditStaffDialog(staff);
        break;
      case 'deactivate':
        _smeService.deactivateStaff(staff.id);
        break;
      case 'delete':
        _confirmDelete(staff);
        break;
    }
  }

  void _showAddStaffDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    StaffRole selectedRole = StaffRole.staff;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add Staff Member'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Full Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone Number'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<StaffRole>(
                  value: selectedRole,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: StaffRole.values.map((role) {
                    return DropdownMenuItem(
                      value: role,
                      child: Text(role.displayName),
                    );
                  }).toList(),
                  onChanged: (role) {
                    if (role != null) {
                      setDialogState(() => selectedRole = role);
                    }
                  },
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
                if (nameController.text.isEmpty || phoneController.text.isEmpty) return;
                await _smeService.addStaff(Staff(
                  id: '',
                  shopId: widget.shop.id,
                  name: nameController.text.trim(),
                  phone: phoneController.text.trim(),
                  role: selectedRole,
                  joinedAt: DateTime.now(),
                ));
                Navigator.pop(context);
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditStaffDialog(Staff staff) {
    final nameController = TextEditingController(text: staff.name);
    final phoneController = TextEditingController(text: staff.phone);
    StaffRole selectedRole = staff.role;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit Staff'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Full Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone Number'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<StaffRole>(
                  value: selectedRole,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: StaffRole.values.map((role) {
                    return DropdownMenuItem(
                      value: role,
                      child: Text(role.displayName),
                    );
                  }).toList(),
                  onChanged: (role) {
                    if (role != null) setDialogState(() => selectedRole = role);
                  },
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
                await _smeService.updateStaff(staff.id, staff.copyWith(
                  name: nameController.text.trim(),
                  phone: phoneController.text.trim(),
                  role: selectedRole,
                ));
                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(Staff staff) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Staff'),
        content: Text('Are you sure you want to remove ${staff.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _smeService.deleteStaff(staff.id);
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
