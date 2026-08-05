import 'package:flutter/material.dart';

class AdminFinanceScreen extends StatefulWidget {
  const AdminFinanceScreen({super.key});

  @override
  State<AdminFinanceScreen> createState() => _AdminFinanceScreenState();
}

class _AdminFinanceScreenState extends State<AdminFinanceScreen> {
  int _selectedTab = 0;

  final List<Map<String, dynamic>> _payouts = [
    {'id': 'PO-001', 'driver': 'Juma Khamis', 'amount': 'TSh 845,000', 'status': 'completed', 'method': 'Mobile Money', 'date': '2026-07-28', 'ref': 'TX-88421'},
    {'id': 'PO-002', 'driver': 'Amina Said', 'amount': 'TSh 1,240,000', 'status': 'processing', 'method': 'Bank Transfer', 'date': '2026-07-28', 'ref': 'TX-88422'},
    {'id': 'PO-003', 'driver': 'Baraka Hassan', 'amount': 'TSh 520,000', 'status': 'pending', 'method': 'Mobile Money', 'date': '2026-07-27', 'ref': '—'},
    {'id': 'PO-004', 'driver': 'Zawadi Mwangi', 'amount': 'TSh 2,100,000', 'status': 'failed', 'method': 'Bank Transfer', 'date': '2026-07-27', 'ref': 'TX-88420'},
    {'id': 'PO-005', 'driver': 'Salim Omar', 'amount': 'TSh 980,000', 'status': 'completed', 'method': 'Mobile Money', 'date': '2026-07-26', 'ref': 'TX-88419'},
  ];

  final List<Map<String, dynamic>> _refunds = [
    {'id': 'RF-001', 'order': 'ORD-8841', 'customer': 'Neema J.', 'amount': 'TSh 45,000', 'reason': 'Damaged goods', 'status': 'approved', 'date': '2026-07-28'},
    {'id': 'RF-002', 'order': 'ORD-8840', 'customer': 'Abasi M.', 'amount': 'TSh 128,000', 'reason': 'Wrong item', 'status': 'pending', 'date': '2026-07-28'},
    {'id': 'RF-003', 'order': 'ORD-8837', 'customer': 'Grace L.', 'amount': 'TSh 22,500', 'reason': 'Late delivery', 'status': 'rejected', 'date': '2026-07-27'},
    {'id': 'RF-004', 'order': 'ORD-8835', 'customer': 'Hussein O.', 'amount': 'TSh 67,000', 'reason': 'Order cancelled', 'status': 'processing', 'date': '2026-07-27'},
  ];

  final List<Map<String, dynamic>> _disputes = [
    {'id': 'DP-001', 'type': 'Payout', 'driver': 'Juma K.', 'amount': 'TSh 845,000', 'issue': 'Missing trip bonus', 'status': 'open', 'priority': 'high', 'date': '2026-07-28'},
    {'id': 'DP-002', 'type': 'Refund', 'customer': 'Amina S.', 'amount': 'TSh 45,000', 'issue': 'Customer claims refund not received', 'status': 'investigating', 'priority': 'medium', 'date': '2026-07-27'},
    {'id': 'DP-003', 'type': 'Payout', 'driver': 'Baraka H.', 'amount': 'TSh 520,000', 'issue': 'Incorrect payout amount', 'status': 'open', 'priority': 'high', 'date': '2026-07-27'},
    {'id': 'DP-004', 'type': 'Commission', 'seller': 'Organic Roots Ltd', 'amount': 'TSh 340,000', 'issue': 'Commission rate mismatch', 'status': 'resolved', 'priority': 'low', 'date': '2026-07-26'},
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFFFBF9F5),
        appBar: AppBar(
          backgroundColor: const Color(0xFF012D1D),
          title: const Text('Finance Operations', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          iconTheme: const IconThemeData(color: Colors.white),
          bottom: TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white54,
            tabs: const [
              Tab(icon: Icon(Icons.payments), text: 'Payouts'),
              Tab(icon: Icon(Icons.receipt), text: 'Refunds'),
              Tab(icon: Icon(Icons.gavel), text: 'Disputes'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildPayoutsTab(),
            _buildRefundsTab(),
            _buildDisputesTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildPayoutsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatsCard(label: 'Pending Payouts', value: 'TSh 4.2M', icon: Icons.hourglass_empty, color: Colors.orange, subtitle: '12 drivers awaiting')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Processed Today', value: 'TSh 8.1M', icon: Icons.check_circle, color: Colors.green, subtitle: '24 payouts completed')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Failed', value: 'TSh 2.1M', icon: Icons.error, color: Colors.red, subtitle: '1 payout requires action')),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Payout Batches', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Batch'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF012D1D), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50))),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
            child: ListView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: _payouts.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                  child: Row(
                    children: [
                      Icon(Icons.account_balance_wallet, size: 20, color: const Color(0xFF012D1D)),
                      const SizedBox(width: 16),
                      Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(p['id'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                        Text('${p['driver']}  •  ${p['date']}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                      ])),
                      Expanded(child: Text(p['amount'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF012D1D)))),
                      Expanded(child: _buildStatusBadge(p['status'] as String)),
                      Text(p['method'] as String, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                      const SizedBox(width: 16),
                      PopupMenuButton<String>(
                        onSelected: (v) {},
                        itemBuilder: (_) => [
                          const PopupMenuItem(value: 'process', child: Text('Process')),
                          const PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                          const PopupMenuItem(value: 'receipt', child: Text('View Receipt')),
                        ],
                        child: const Icon(Icons.more_vert, size: 18, color: Color(0xFF414844)),
                      ),
                    ],
                  ),
                ),
              )).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefundsTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatsCard(label: 'Pending', value: '3', icon: Icons.hourglass_empty, color: Colors.orange, subtitle: 'Awaiting approval')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Approved Today', value: 'TSh 67,500', icon: Icons.check_circle, color: Colors.green, subtitle: '2 refunds processed')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Rejected', value: 'TSh 22,500', icon: Icons.cancel, color: Colors.red, subtitle: '1 rejected this week')),
            ],
          ),
          const SizedBox(height: 32),
          Text('Refund Requests', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _refunds.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        Icon(Icons.receipt_long, size: 20, color: r['status'] == 'approved' ? Colors.green : r['status'] == 'rejected' ? Colors.red : Colors.orange),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${r['id']}  •  ${r['order']}', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Text(r['reason'] as String, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Expanded(child: Text('${r['customer']}', style: TextStyle(fontSize: 12, color: Colors.grey[600]))),
                        Expanded(child: Text(r['amount'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF012D1D)))),
                        _buildStatusBadge(r['status'] as String),
                        const SizedBox(width: 16),
                        PopupMenuButton<String>(
                          onSelected: (v) {},
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'approve', child: Text('Approve')),
                            const PopupMenuItem(value: 'reject', child: Text('Reject')),
                            const PopupMenuItem(value: 'details', child: Text('View Details')),
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

  Widget _buildDisputesTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatsCard(label: 'Open Disputes', value: '3', icon: Icons.gavel, color: Colors.red, subtitle: 'Requires resolution')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Investigating', value: '1', icon: Icons.search, color: Colors.blue, subtitle: 'Under review')),
              const SizedBox(width: 24),
              Expanded(child: StatsCard(label: 'Avg Resolution', value: '2.4 days', icon: Icons.timer, color: Colors.green, subtitle: 'Target: <48 hours')),
            ],
          ),
          const SizedBox(height: 32),
          Text('Active Disputes', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF012D1D))),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))]),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: _disputes.map((d) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFFBF9F5), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE4E2DE))),
                    child: Row(
                      children: [
                        Container(width: 40, height: 40, decoration: BoxDecoration(color: (d['priority'] == 'high' ? Colors.red : d['priority'] == 'medium' ? Colors.orange : Colors.grey).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                          child: Icon(Icons.warning_amber, size: 20, color: d['priority'] == 'high' ? Colors.red : d['priority'] == 'medium' ? Colors.orange : Colors.grey)),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(d['id'] as String, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF012D1D))),
                          Text('${d['type']}  •  ${d['issue']}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ])),
                        Expanded(child: Text('${d['driver'] ?? d['customer'] ?? d['seller']}', style: TextStyle(fontSize: 12, color: Colors.grey[600]))),
                        Expanded(child: Text(d['amount'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF012D1D)))),
                        _buildStatusBadge(d['status'] as String),
                        const SizedBox(width: 16),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: (d['priority'] == 'high' ? Colors.red : d['priority'] == 'medium' ? Colors.orange : Colors.grey).withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                          child: Text(d['priority'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: d['priority'] == 'high' ? Colors.red : d['priority'] == 'medium' ? Colors.orange : Colors.grey))),
                        const SizedBox(width: 16),
                        PopupMenuButton<String>(
                          onSelected: (v) {},
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'resolve', child: Text('Resolve')),
                            const PopupMenuItem(value: 'escalate', child: Text('Escalate')),
                            const PopupMenuItem(value: 'assign', child: Text('Assign to...')),
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
    final map = {'completed': Colors.green, 'approved': Colors.green, 'processing': Colors.blue, 'pending': Colors.orange, 'failed': Colors.red, 'rejected': Colors.red, 'open': Colors.red, 'investigating': Colors.blue, 'resolved': Colors.green};
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
