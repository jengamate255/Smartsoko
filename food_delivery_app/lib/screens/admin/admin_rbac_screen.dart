import 'package:flutter/material.dart';

class AdminRBACScreen extends StatefulWidget {
  const AdminRBACScreen({super.key});

  @override
  State<AdminRBACScreen> createState() => _AdminRBACScreenState();
}

class _AdminRBACScreenState extends State<AdminRBACScreen> {
  int _selectedTab = 0;

  final List<Map<String, dynamic>> _roles = [
    {'name': 'Super Admin', 'users': 3, 'permissions': ['all'], 'color': Colors.red},
    {'name': 'Admin', 'users': 12, 'permissions': ['users.read', 'users.write', 'orders.read', 'orders.write', 'settings.read', 'settings.write'], 'color': Colors.orange},
    {'name': 'Moderator', 'users': 9, 'permissions': ['users.read', 'orders.read', 'orders.write', 'reports.read'], 'color': Colors.blue},
    {'name': 'Finance Ops', 'users': 5, 'permissions': ['payouts.read', 'payouts.write', 'refunds.read', 'refunds.write'], 'color': Colors.green},
    {'name': 'Analyst', 'users': 7, 'permissions': ['analytics.read', 'reports.read', 'drivers.read'], 'color': Colors.purple},
    {'name': 'Support', 'users': 14, 'permissions': ['tickets.read', 'tickets.write', 'users.read'], 'color': Colors.teal},
  ];

  final List<Map<String, dynamic>> _assignments = [
    {'user': 'Abasi M.', 'email': 'abasi@smartsoko.co.tz', 'role': 'Super Admin', 'status': 'active', 'last': '2 mins ago'},
    {'user': 'Neema J.', 'email': 'neema@smartsoko.co.tz', 'role': 'Admin', 'status': 'active', 'last': '15 mins ago'},
    {'user': 'Juma K.', 'email': 'juma@smartsoko.co.tz', 'role': 'Finance Ops', 'status': 'active', 'last': '1 hour ago'},
    {'user': 'Amina S.', 'email': 'amina@smartsoko.co.tz', 'role': 'Moderator', 'status': 'active', 'last': '3 hours ago'},
    {'user': 'Baraka H.', 'email': 'baraka@smartsoko.co.tz', 'role': 'Support', 'status': 'inactive', 'last': '2 days ago'},
    {'user': 'Zawadi M.', 'email': 'zawadi@smartsoko.co.tz', 'role': 'Analyst', 'status': 'active', 'last': '30 mins ago'},
    {'user': 'Salim O.', 'email': 'salim@smartsoko.co.tz', 'role': 'Admin', 'status': 'suspended', 'last': '5 days ago'},
    {'user': 'Grace L.', 'email': 'grace@smartsoko.co.tz', 'role': 'Finance Ops', 'status': 'active', 'last': '45 mins ago'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: const Color(0xFF012D1D),
        title: const Text('RBAC — Roles & Permissions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          TextButton.icon(
            onPressed: () => setState(() => _selectedTab = 0),
            icon: Icon(Icons.shield, color: _selectedTab == 0 ? Colors.white : Colors.white54),
            label: Text('Roles', style: TextStyle(color: _selectedTab == 0 ? Colors.white : Colors.white54)),
          ),
          TextButton.icon(
            onPressed: () => setState(() => _selectedTab = 1),
            icon: Icon(Icons.people, color: _selectedTab == 1 ? Colors.white : Colors.white54),
            label: Text('Assignments', style: TextStyle(color: _selectedTab == 1 ? Colors.white : Colors.white54)),
          ),
        ],
      ),
      body: _selectedTab == 0 ? _buildRolesTab() : _buildAssignmentsTab(),
    );
  }

  Widget _buildRolesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Role Definitions', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Create Role'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ..._roles.map((role) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                leading: Container(width: 40, height: 40, decoration: BoxDecoration(color: (role['color'] as Color).withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Icon(Icons.shield, color: role['color'], size: 20)),
                title: Row(children: [
                  Text(role['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                  const SizedBox(width: 12),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12)), child: Text('${role['users']} users', style: TextStyle(fontSize: 11, color: Colors.grey[600]))),
                ]),
                subtitle: Text('${(role['permissions'] as List).length} permissions', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Permissions', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF012D1D))),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8, runSpacing: 8,
                        children: (role['permissions'] as List).map((p) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: const Color(0xFFC1ECD4).withOpacity(0.5), borderRadius: BorderRadius.circular(20)),
                          child: Text(p, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF002114))),
                        )).toList(),
                      ),
                      const SizedBox(height: 16),
                      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                        TextButton(onPressed: () {}, child: const Text('Edit Permissions', style: TextStyle(color: Color(0xFF012D1D)))),
                        const SizedBox(width: 8),
                        TextButton(onPressed: () {}, child: Text('Delete', style: TextStyle(color: Colors.red[600]))),
                      ]),
                    ]),
                  ),
                ],
              ),
            ),
          )).toList(),
        ],
      ),
    );
  }

  Widget _buildAssignmentsTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('User-Role Assignments', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              Row(children: [
                SizedBox(
                  width: 180,
                  child: DropdownButtonFormField<String>(
                    value: 'all',
                    decoration: InputDecoration(labelText: 'Filter Role', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white, contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), isDense: true),
                    items: ['all', 'Super Admin', 'Admin', 'Moderator', 'Finance Ops', 'Analyst', 'Support'].map((r) => DropdownMenuItem(value: r, child: Text(r == 'all' ? 'All Roles' : r))).toList(),
                    onChanged: (_) {},
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.person_add, size: 18),
                  label: const Text('Assign Role'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
                ),
              ]),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _assignments.map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        CircleAvatar(radius: 20, backgroundColor: const Color(0xFF012D1D), child: Text((a['user'] as String)[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(a['user'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Text(a['email'] as String, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Expanded(child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (a['role'] == 'Super Admin' ? Colors.red : a['role'] == 'Admin' ? Colors.orange : Colors.blue).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                          child: Text(a['role'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: a['role'] == 'Super Admin' ? Colors.red : a['role'] == 'Admin' ? Colors.orange : Colors.blue)))),
                        Expanded(child: _buildStatusBadge(a['status'] as String)),
                        Text('Last: ${a['last']}', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                        const SizedBox(width: 16),
                        PopupMenuButton<String>(
                          onSelected: (v) {},
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'edit', child: Text('Edit Role')),
                            const PopupMenuItem(value: 'suspend', child: Text('Suspend')),
                            const PopupMenuItem(value: 'remove', child: Text('Remove')),
                          ],
                          child: const Icon(Icons.more_vert, size: 18, color: Color(0xFF414844)),
                        ),
                      ],
                    ),
                  ),
                )).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String s) {
    final map = {'active': Colors.green, 'inactive': Colors.grey, 'suspended': Colors.red};
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (map[s] ?? Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
      child: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: map[s] ?? Colors.grey)));
  }
}
