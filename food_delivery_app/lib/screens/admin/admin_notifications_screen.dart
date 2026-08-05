import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AdminNotificationsScreen extends StatefulWidget {
  const AdminNotificationsScreen({super.key});

  @override
  State<AdminNotificationsScreen> createState() => _AdminNotificationsScreenState();
}

class _AdminNotificationsScreenState extends State<AdminNotificationsScreen> {
  int _selectedTab = 0;
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  String _selectedAudience = 'all';
  String _selectedPriority = 'normal';
  String _selectedChannel = 'push';

  final List<Map<String, dynamic>> _history = [
    {'id': 'N001', 'title': 'Promo: 20% Off Fresh Produce', 'audience': 'all', 'priority': 'high', 'channel': 'push', 'status': 'sent', 'sent': '2026-07-28 09:15', 'delivered': 18420, 'opened': 8231},
    {'id': 'N002', 'title': 'Order #8841 Delivered', 'audience': 'user_4421', 'priority': 'normal', 'channel': 'sms', 'status': 'sent', 'sent': '2026-07-28 08:45', 'delivered': 1, 'opened': 1},
    {'id': 'N003', 'title': 'SmartMove Driver Payout Update', 'audience': 'drivers', 'priority': 'normal', 'channel': 'push', 'status': 'pending', 'sent': '—', 'delivered': 0, 'opened': 0},
    {'id': 'N004', 'title': 'System Maintenance Tonight', 'audience': 'all', 'priority': 'low', 'channel': 'email', 'status': 'scheduled', 'sent': '2026-07-29 02:00', 'delivered': 0, 'opened': 0},
    {'id': 'N005', 'title': 'New Seller Onboarding Guide', 'audience': 'sellers', 'priority': 'normal', 'channel': 'push', 'status': 'failed', 'sent': '2026-07-27 14:30', 'delivered': 142, 'opened': 98},
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: const Color(0xFF012D1D),
        title: const Text('Notifications Broadcast', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          TextButton.icon(
            onPressed: () => setState(() => _selectedTab = 0),
            icon: Icon(Icons.send, color: _selectedTab == 0 ? Colors.white : Colors.white54),
            label: Text('Compose', style: TextStyle(color: _selectedTab == 0 ? Colors.white : Colors.white54)),
          ),
          TextButton.icon(
            onPressed: () => setState(() => _selectedTab = 1),
            icon: Icon(Icons.history, color: _selectedTab == 1 ? Colors.white : Colors.white54),
            label: Text('History', style: TextStyle(color: _selectedTab == 1 ? Colors.white : Colors.white54)),
          ),
        ],
      ),
      body: _selectedTab == 0 ? _buildComposer() : _buildHistory(),
    );
  }

  Widget _buildComposer() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: StatsCard(label: 'Total Sent Today', value: '12,450', icon: Icons.send, color: const Color(0xFF012D1D), subtitle: '+18% vs yesterday'),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: StatsCard(label: 'Delivery Rate', value: '97.2%', icon: Icons.check_circle, color: Colors.green, subtitle: '12,093 delivered'),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: StatsCard(label: 'Open Rate', value: '44.6%', icon: Icons.visibility, color: Colors.orange, subtitle: '5,395 recipients'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text('Compose Notification', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedAudience,
                  decoration: InputDecoration(labelText: 'Audience', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All Users (12,450)')),
                    DropdownMenuItem(value: 'drivers', child: Text('Drivers (842)')),
                    DropdownMenuItem(value: 'sellers', child: Text('Sellers (1,204)')),
                    DropdownMenuItem(value: 'customers', child: Text('Customers (10,404)')),
                    DropdownMenuItem(value: 'admins', child: Text('Admins (24)')),
                  ],
                  onChanged: (v) => setState(() => _selectedAudience = v!),
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedPriority,
                  decoration: InputDecoration(labelText: 'Priority', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                    DropdownMenuItem(value: 'normal', child: Text('Normal')),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                  ],
                  onChanged: (v) => setState(() => _selectedPriority = v!),
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedChannel,
                  decoration: InputDecoration(labelText: 'Channel', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
                  items: const [
                    DropdownMenuItem(value: 'push', child: Text('Push Notification')),
                    DropdownMenuItem(value: 'sms', child: Text('SMS')),
                    DropdownMenuItem(value: 'email', child: Text('Email')),
                    DropdownMenuItem(value: 'all', child: Text('All Channels')),
                  ],
                  onChanged: (v) => setState(() => _selectedChannel = v!),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _titleController,
            decoration: InputDecoration(labelText: 'Title', hintText: 'Enter notification title', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _bodyController,
            maxLines: 5,
            decoration: InputDecoration(labelText: 'Body', hintText: 'Enter notification message', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white, alignLabelWithHint: true),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.schedule),
                label: const Text('Schedule'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF012D1D), padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16), side: BorderSide(color: Colors.grey[300]!), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
              const SizedBox(width: 16),
              ElevatedButton.icon(
                onPressed: () {
                  showDialog(context: context, builder: (c) => AlertDialog(title: const Text('Confirm Broadcast'), content: Text('Send "${_titleController.text}" to ${_selectedAudience.replaceAll('_', ' ')} via ${_selectedChannel}?'), actions: [
                    TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')),
                    ElevatedButton(onPressed: () { Navigator.pop(c); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notification queued for broadcast'))); }, style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white), child: const Text('Send Now')),
                  ]));
                },
                icon: const Icon(Icons.send),
                label: const Text('Send Now'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistory() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatsCard(label: 'Total Broadcasts', value: '847', icon: Icons.campaign, color: const Color(0xFF012D1D), subtitle: 'This month')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Avg Delivery Rate', value: '94.8%', icon: Icons.check_circle, color: Colors.green, subtitle: '+2.1% vs last month')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Failed', value: '13', icon: Icons.error, color: Colors.red, subtitle: 'Requires attention')),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Text('Broadcast History', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              const Spacer(),
              SizedBox(
                width: 200,
                child: TextFormField(
                  decoration: InputDecoration(hintText: 'Search...', prefixIcon: const Icon(Icons.search), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white, contentPadding: const EdgeInsets.symmetric(vertical: 12)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _history.map((n) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        Icon(_channelIcon(n['channel'] as String), size: 20, color: const Color(0xFF012D1D)),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(n['title'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Text('To: ${n['audience']}  |  ${n['sent']}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Expanded(child: _buildPriorityChip(n['priority'] as String)),
                        Expanded(child: _buildStatusChip(n['status'] as String)),
                        Text('${n['delivered']}/${n['opened']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                        const SizedBox(width: 16),
                        PopupMenuButton<String>(
                          onSelected: (v) {},
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'resend', child: Text('Resend')),
                            const PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                            const PopupMenuItem(value: 'stats', child: Text('View Stats')),
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

  IconData _channelIcon(String c) {
    switch (c) {
      case 'sms': return Icons.sms;
      case 'email': return Icons.email;
      case 'push': default: return Icons.notifications;
    }
  }

  Widget _buildPriorityChip(String p) {
    final map = {'low': Colors.grey, 'normal': Colors.blue, 'high': Colors.orange, 'urgent': Colors.red};
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (map[p] ?? Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
      child: Text(p, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: map[p] ?? Colors.grey)));
  }

  Widget _buildStatusChip(String s) {
    final map = {'sent': Colors.green, 'pending': Colors.orange, 'scheduled': Colors.blue, 'failed': Colors.red, 'cancelled': Colors.grey};
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (map[s] ?? Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
      child: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: map[s] ?? Colors.grey)));
  }
}

class StatsCard extends StatelessWidget {
  final String label, value, subtitle;
  final IconData icon;
  final Color color;
  const StatsCard({super.key, required this.label, required this.value, required this.icon, required this.color, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
      child: Row(children: [
        Container(width: 48, height: 48, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 24)),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF012D1D))),
          Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
        ])),
      ]),
    );
  }
}
