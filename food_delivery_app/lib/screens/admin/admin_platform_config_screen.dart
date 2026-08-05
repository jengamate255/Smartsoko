import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AdminPlatformConfigScreen extends StatefulWidget {
  const AdminPlatformConfigScreen({super.key});

  @override
  State<AdminPlatformConfigScreen> createState() => _AdminPlatformConfigScreenState();
}

class _AdminPlatformConfigScreenState extends State<AdminPlatformConfigScreen> {
  int _selectedTab = 0;

  final List<Map<String, dynamic>> _webhooks = [
    {'id': 'WH-001', 'name': 'Order Events', 'url': 'https://hooks.smartsoko.co.tz/orders', 'events': 'order.created, order.updated', 'status': 'active', 'last': '2 mins ago', 'secret': 'sk_wh_****8a3f'},
    {'id': 'WH-002', 'name': 'Payment Gateway', 'url': 'https://hooks.smartsoko.co.tz/payments', 'events': 'payment.completed, payment.failed', 'status': 'active', 'last': '15 mins ago', 'secret': 'sk_wh_****b1e2'},
    {'id': 'WH-003', 'name': 'SmartMove Trips', 'url': 'https://hooks.smartsoko.co.tz/trips', 'events': 'trip.started, trip.ended, trip.cancelled', 'status': 'inactive', 'last': '2 days ago', 'secret': 'sk_wh_****f4c7'},
    {'id': 'WH-004', 'name': 'SOS Alerts', 'url': 'https://hooks.smartsoko.co.tz/sos', 'events': 'sos.triggered', 'status': 'active', 'last': '1 hour ago', 'secret': 'sk_wh_****9d0b'},
  ];

  final List<Map<String, dynamic>> _apiKeys = [
    {'id': 'KEY-001', 'name': 'Mobile App Prod', 'key': 'smartsoko_prod_****8a3f', 'permissions': 'orders.read, orders.write, products.read', 'status': 'active', 'created': '2026-01-15', 'last': '2 mins ago', 'created_by': 'Abasi M.'},
    {'id': 'KEY-002', 'name': 'Web Admin', 'key': 'smartsoko_web_****b1e2', 'permissions': 'all', 'status': 'active', 'created': '2026-01-10', 'last': '5 mins ago', 'created_by': 'Neema J.'},
    {'id': 'KEY-003', 'name': 'Partner Integration', 'key': 'smartsoko_partner_****f4c7', 'permissions': 'drivers.read, trips.read', 'status': 'revoked', 'created': '2026-03-01', 'last': '2026-07-20', 'created_by': 'Juma K.'},
    {'id': 'KEY-004', 'name': 'Dev Sandbox', 'key': 'smartsoko_dev_****9d0b', 'permissions': '* (full access)', 'status': 'active', 'created': '2026-04-20', 'last': '1 hour ago', 'created_by': 'Grace L.'},
    {'id': 'KEY-005', 'name': 'Analytics Pipeline', 'key': 'smartsoko_analytics_****e3f1', 'permissions': 'analytics.read', 'status': 'active', 'created': '2026-05-10', 'last': '30 mins ago', 'created_by': 'Abasi M.'},
  ];

  final List<Map<String, dynamic>> _auditLogs = [
    {'user': 'Abasi M.', 'action': 'admin.user.role_changed', 'target': 'salim@smartsoko.co.tz', 'details': 'Role changed: Admin → Support', 'timestamp': '2026-07-28 10:23:45', 'ip': '192.168.1.42'},
    {'user': 'Neema J.', 'action': 'admin.payout.processed', 'target': 'PO-002', 'details': 'Batch payout approved: TSh 1,240,000', 'timestamp': '2026-07-28 09:15:12', 'ip': '192.168.1.55'},
    {'user': 'System', 'action': 'admin.settings.updated', 'target': 'Platform Config', 'details': 'Commission rate changed: 15% → 12%', 'timestamp': '2026-07-28 08:00:00', 'ip': '127.0.0.1'},
    {'user': 'Juma K.', 'action': 'admin.webhook.created', 'target': 'WH-004', 'details': 'Webhook created: SOS Alerts', 'timestamp': '2026-07-27 16:45:30', 'ip': '192.168.1.100'},
    {'user': 'Grace L.', 'action': 'admin.apikey.created', 'target': 'KEY-005', 'details': 'API key created: Analytics Pipeline', 'timestamp': '2026-07-27 14:30:00', 'ip': '192.168.1.88'},
    {'user': 'Abasi M.', 'action': 'admin.user.created', 'target': 'amina.new@smartsoko.co.tz', 'details': 'New admin user created with role Moderator', 'timestamp': '2026-07-26 11:12:22', 'ip': '192.168.1.42'},
    {'user': 'Neema J.', 'action': 'admin.apikey.revoked', 'target': 'KEY-003', 'details': 'API key revoked: Partner Integration', 'timestamp': '2026-07-26 09:00:00', 'ip': '192.168.1.55'},
    {'user': 'System', 'action': 'admin.payout.failed', 'target': 'PO-004', 'details': 'Bank transfer rejected: Invalid account', 'timestamp': '2026-07-25 18:22:10', 'ip': '127.0.0.1'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: const Color(0xFF012D1D),
        title: const Text('Platform Config', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [
            Tab(icon: Icon(Icons.webhook), text: 'Webhooks'),
            Tab(icon: Icon(Icons.vpn_key), text: 'API Keys'),
            Tab(icon: Icon(Icons.article), text: 'Audit Log'),
          ],
        ),
      ),
      body: TabBarView(
        children: [
          _buildWebhooksTab(),
          _buildApiKeysTab(),
          _buildAuditTab(),
        ],
      ),
    );
  }

  Widget _buildWebhooksTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Webhook Endpoints', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add Webhook'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _webhooks.map((w) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        Icon(Icons.webhook, size: 20, color: const Color(0xFF012D1D)),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(w['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Text(w['url'] as String, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Expanded(child: Text(w['events'] as String, style: TextStyle(fontSize: 11, color: Colors.grey[500]))),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (w['status'] == 'active' ? Colors.green : Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                          child: Text(w['status'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: w['status'] == 'active' ? Colors.green : Colors.grey))),
                        const SizedBox(width: 16),
                        Text('Last: ${w['last']}', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                        const SizedBox(width: 16),
                        IconButton(
                          icon: const Icon(Icons.content_copy, size: 16),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: w['secret'] as String));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Secret copied')));
                          },
                          tooltip: 'Copy secret',
                        ),
                        PopupMenuButton<String>(
                          onSelected: (v) {
                            if (v == 'delete') {
                              showDialog(context: context, builder: (c) => AlertDialog(title: const Text('Delete Webhook'), content: Text('Delete "${w['name']}"?'), actions: [
                                TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')),
                                ElevatedButton(onPressed: () { Navigator.pop(c); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${w['name']} deleted'))); }, style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white), child: const Text('Delete')),
                              ]));
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(value: 'toggle', child: Text(w['status'] == 'active' ? 'Disable' : 'Enable')),
                            const PopupMenuItem(value: 'edit', child: Text('Edit')),
                            const PopupMenuItem(value: 'test', child: Text('Test Ping')),
                            PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red[600]))),
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

  Widget _buildApiKeysTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('API Keys', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              Row(children: [
                Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text('${_apiKeys.where((k) => k['status'] == 'active').length} active', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.green))),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Generate Key'),
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
                children: _apiKeys.map((k) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        Container(width: 40, height: 40, decoration: BoxDecoration(color: const Color(0xFF012D1D).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.vpn_key, size: 20, color: Color(0xFF012D1D))),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(k['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Row(children: [
                            Text(k['key'] as String, style: TextStyle(fontSize: 12, color: Colors.grey[600], fontFamily: 'monospace')),
                            const SizedBox(width: 8),
                            InkWell(onTap: () { Clipboard.setData(ClipboardData(text: k['key'] as String)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied!'))); }, child: Icon(Icons.content_copy, size: 14, color: Colors.grey[400])),
                          ]),
                        ])),
                        Expanded(child: Text(k['permissions'] as String, style: TextStyle(fontSize: 10, color: Colors.grey[500]))),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (k['status'] == 'active' ? Colors.green : Colors.red).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                          child: Text(k['status'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: k['status'] == 'active' ? Colors.green : Colors.red))),
                        const SizedBox(width: 16),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text('by ${k['created_by']}', style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                          Text(k['created'] as String, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                        ]),
                        const SizedBox(width: 16),
                        PopupMenuButton<String>(
                          onSelected: (v) {
                            if (v == 'revoke') {
                              showDialog(context: context, builder: (c) => AlertDialog(title: Text('${k['status'] == 'active' ? 'Revoke' : 'Restore'} Key'), content: Text('${k['status'] == 'active' ? 'Revoke' : 'Restore'} "${k['name']}"?'), actions: [
                                TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')),
                                ElevatedButton(onPressed: () { Navigator.pop(c); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${k['name']} ${k['status'] == 'active' ? 'revoked' : 'restored'}'))); }, style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white), child: Text(k['status'] == 'active' ? 'Revoke' : 'Restore')),
                              ]));
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(value: 'edit', child: const Text('Edit')),
                            PopupMenuItem(value: 'revoke', child: Text(k['status'] == 'active' ? 'Revoke' : 'Restore')),
                            PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red[600]))),
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

  Widget _buildAuditTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Audit Log', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              const Spacer(),
              SizedBox(
                width: 200,
                child: TextFormField(
                  decoration: InputDecoration(hintText: 'Search logs...', prefixIcon: const Icon(Icons.search), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white, contentPadding: const EdgeInsets.symmetric(vertical: 12)),
                ),
              ),
              const SizedBox(width: 16),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Export'),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14), side: BorderSide(color: Colors.grey[300]!), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _auditLogs.map((log) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        CircleAvatar(radius: 16, backgroundColor: (log['user'] == 'System' ? Colors.grey : const Color(0xFF012D1D)).withOpacity(0.15),
                          child: Icon(Icons.person, size: 16, color: log['user'] == 'System' ? Colors.grey : const Color(0xFF012D1D))),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Text(log['user'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF012D1D))),
                            const SizedBox(width: 8),
                            Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: const Color(0xFF012D1D).withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                              child: Text(log['action'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: const Color(0xFF012D1D).withOpacity(0.7), fontFamily: 'monospace')),
                          ]),
                          Text('${log['details']}  •  ${log['target']}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Text(log['timestamp'] as String, style: TextStyle(fontSize: 10, color: Colors.grey[500], fontFamily: 'monospace')),
                        const SizedBox(width: 16),
                        Icon(Icons.open_in_new, size: 14, color: Colors.grey[400]),
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
}
