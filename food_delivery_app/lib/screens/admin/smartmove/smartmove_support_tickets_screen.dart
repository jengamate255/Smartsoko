import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveSupportTicketsScreen extends StatefulWidget {
  const SmartMoveSupportTicketsScreen({super.key});

  @override
  State<SmartMoveSupportTicketsScreen> createState() => _SmartMoveSupportTicketsScreenState();
}

class _SmartMoveSupportTicketsScreenState extends State<SmartMoveSupportTicketsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _tickets = [];
  String _statusFilter = 'all';
  String _searchQuery = '';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      var query = client.from('support_tickets').select('''
        *,
        assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(full_name)
      ''').order('created_at', ascending: false);

      if (_statusFilter != 'all') {
        query = query.eq('status', _statusFilter);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('subject.ilike.%$_searchQuery%,ticket_number.ilike.%$_searchQuery%,user_name.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _tickets = List<Map<String, dynamic>>.from(response.data ?? []);
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

  Future<void> _updateTicketStatus(String ticketId, String status) async {
    try {
      final client = _supabaseService.client;
      final updates = <String, dynamic>{'status': status};
      if (status == 'resolved') updates['resolved_at'] = DateTime.now().toIso8601String();
      if (status == 'closed') updates['closed_at'] = DateTime.now().toIso8601String();
      await client.from('support_tickets').update(updates).eq('id', ticketId);
      _loadTickets();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ticket $status'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _assignTicket(String ticketId) async {
    try {
      final client = _supabaseService.client;
      final user = client.auth.currentSession()?.user;
      await client.from('support_tickets').update({
        'assigned_admin_id': user?.id,
        'status': 'in_progress',
      }).eq('id', ticketId);
      _loadTickets();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket assigned to you'), backgroundColor: Colors.blue),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showTicketDetail(Map<String, dynamic> ticket) {
    final admin = ticket['assigned_admin'] as Map<String, dynamic>?;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${ticket['ticket_number'] ?? 'Ticket'}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _infoRow('Status', _statusChip(ticket['status'])),
              _infoRow('Priority', _priorityChip(ticket['priority'])),
              _infoRow('Category', Text(ticket['category'] ?? 'N/A')),
              _infoRow('From', Text('${ticket['user_name'] ?? 'N/A'} (${ticket['user_email'] ?? 'N/A'})')),
              _infoRow('Assigned To', Text(admin?['full_name'] ?? 'Unassigned')),
              _infoRow('Subject', Text(ticket['subject'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold))),
              const Divider(),
              Text(ticket['description'] ?? '', style: const TextStyle(fontSize: 14)),
              const Divider(),
              _infoRow('Created', Text(_formatDate(ticket['created_at']))),
              if (ticket['sla_due_at'] != null)
                _infoRow('SLA Due', Text(_formatDate(ticket['sla_due_at']))),
              if (ticket['resolved_at'] != null)
                _infoRow('Resolved', Text(_formatDate(ticket['resolved_at']))),
            ],
          ),
        ),
        actions: [
          if (ticket['assigned_admin_id'] == null)
            TextButton(
              onPressed: () { Navigator.pop(context); _assignTicket(ticket['id']); },
              child: const Text('Assign to Me', style: TextStyle(color: Colors.blue)),
            ),
          if (ticket['status'] == 'open')
            TextButton(
              onPressed: () { Navigator.pop(context); _updateTicketStatus(ticket['id'], 'in_progress'); },
              child: const Text('Start Progress', style: TextStyle(color: Colors.orange)),
            ),
          if (ticket['status'] == 'in_progress')
            TextButton(
              onPressed: () { Navigator.pop(context); _updateTicketStatus(ticket['id'], 'resolved'); },
              child: const Text('Resolve', style: TextStyle(color: Colors.green)),
            ),
          if (['resolved', 'closed'].contains(ticket['status']))
            TextButton(
              onPressed: () { Navigator.pop(context); _updateTicketStatus(ticket['id'], 'reopened'); },
              child: const Text('Reopen', style: TextStyle(color: Colors.orange)),
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
          SizedBox(width: 90, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: value),
        ],
      ),
    );
  }

  Widget _statusChip(String? status) {
    final colors = <String, Color>{
      'open': Colors.blue, 'in_progress': Colors.orange,
      'waiting_customer': Colors.purple, 'waiting_third_party': Colors.teal,
      'resolved': Colors.green, 'closed': Colors.grey, 'reopened': Colors.red,
    };
    final color = colors[status] ?? Colors.grey;
    return Chip(
      label: Text(status?.replaceAll('_', ' ').toUpperCase() ?? 'UNKNOWN', style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 10),
    );
  }

  Widget _priorityChip(String? priority) {
    final colors = <String, Color>{'low': Colors.grey, 'medium': Colors.blue, 'high': Colors.orange, 'urgent': Colors.red};
    final color = colors[priority] ?? Colors.grey;
    return Chip(
      label: Text(priority?.toUpperCase() ?? 'N/A', style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 10),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      return DateTime.parse(dateStr).toLocal().toString().substring(0, 19);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Support Tickets'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadTickets)],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.grey[50],
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search tickets...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: (v) { _searchQuery = v; _currentPage = 1; _loadTickets(); },
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map((s) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(s.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontSize: 10)),
                          selected: _statusFilter == s,
                          onSelected: (_) { _statusFilter = s; _currentPage = 1; _loadTickets(); },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _tickets.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.support_agent, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No tickets found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _tickets.length,
                        itemBuilder: (context, index) {
                          final ticket = _tickets[index];
                          final admin = ticket['assigned_admin'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: ticket['priority'] == 'urgent' ? Colors.red[100] : Colors.grey[200],
                                child: Icon(
                                  ticket['priority'] == 'urgent' ? Icons.priority_high : Icons.support_agent,
                                  color: ticket['priority'] == 'urgent' ? Colors.red : Colors.grey[600],
                                ),
                              ),
                              title: Text(ticket['subject'] ?? 'No subject', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${ticket['user_name'] ?? 'Unknown'} • ${ticket['ticket_number'] ?? ''}'),
                                  Text('${ticket['category'] ?? ''} • Assigned: ${admin?['full_name'] ?? 'Unassigned'}',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  _priorityChip(ticket['priority']),
                                  const SizedBox(height: 4),
                                  _statusChip(ticket['status']),
                                ],
                              ),
                              onTap: () => _showTicketDetail(ticket),
                            ),
                          );
                        },
                      ),
          ),
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadTickets(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _tickets.length == _itemsPerPage ? () { _currentPage++; _loadTickets(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
