import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveDocumentsScreen extends StatefulWidget {
  const SmartMoveDocumentsScreen({super.key});

  @override
  State<SmartMoveDocumentsScreen> createState() => _SmartMoveDocumentsScreenState();
}

class _SmartMoveDocumentsScreenState extends State<SmartMoveDocumentsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _documents = [];
  String _searchQuery = '';
  String _selectedType = 'all';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('driver_documents')
          .select('*, driver:driver_profiles!driver_documents_driver_id_fkey(full_name, phone)')
          .order('created_at', ascending: false);

      if (_selectedType != 'all') {
        query = query.eq('document_type', _selectedType);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('driver.full_name.ilike.%$_searchQuery%,driver.phone.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _documents = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading documents: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _approveDocument(String docId, String driverId) async {
    try {
      final client = _supabaseService.client;
      await client.from('driver_documents').update({
        'status': 'approved',
        'reviewed_at': DateTime.now().toIso8601String(),
        'reviewed_by': (await client.auth.getUser()).user?.id,
      }).eq('id', docId);
      
      // Check if all documents for this driver are approved
      final docsRes = await client
          .from('driver_documents')
          .select('status')
          .eq('driver_id', driverId);
      
      final allApproved = (docsRes.data as List<dynamic>?)
          ?.every((d) => d['status'] == 'approved') ?? false;
      
      if (allApproved) {
        await client.from('driver_profiles').update({
          'status': 'approved',
        }).eq('id', driverId);
      }
      
      _loadDocuments();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document approved'), backgroundColor: Colors.green),
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

  Future<void> _rejectDocument(String docId) async {
    final reason = await _showReasonDialog('Reject Document');
    if (reason == null || reason.isEmpty) return;

    try {
      final client = _supabaseService.client;
      await client.from('driver_documents').update({
        'status': 'rejected',
        'rejection_reason': reason,
        'reviewed_at': DateTime.now().toIso8601String(),
      }).eq('id', docId);
      
      _loadDocuments();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document rejected'), backgroundColor: Colors.orange),
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

  Future<String?> _showReasonDialog(String title) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter rejection reason...'),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _showDocumentDetail(Map<String, dynamic> doc) {
    final driver = doc['driver'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(doc['document_type']?.toString().toUpperCase() ?? 'Document'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Driver', driver?['full_name'] ?? 'N/A'),
              _buildInfoRow('Phone', driver?['phone'] ?? 'N/A'),
              _buildInfoRow('Type', doc['document_type'] ?? 'N/A'),
              _buildInfoRow('Status', _getStatusChip(doc['status'])),
              _buildInfoRow('Uploaded', _formatDate(doc['created_at'])),
              _buildInfoRow('Reviewed', _formatDate(doc['reviewed_at'])),
              if (doc['rejection_reason'] != null) _buildInfoRow('Rejection Reason', doc['rejection_reason']),
              const Divider(),
              if (doc['file_url'] != null) ...[
                const Text('Document Preview:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    doc['file_url'],
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 200,
                      color: Colors.grey[200],
                      child: const Center(child: Text('Unable to load image')),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (doc['status'] == 'pending') ...[
            TextButton(onPressed: () { Navigator.pop(context); _approveDocument(doc['id'], doc['driver_id']); }, child: const Text('Approve')),
            TextButton(onPressed: () { Navigator.pop(context); _rejectDocument(doc['id']); }, child: const Text('Reject')),
          ],
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _getStatusChip(String? status) {
    Color color;
    String label;
    switch (status) {
      case 'approved':
        color = Colors.green;
        label = 'APPROVED';
        break;
      case 'rejected':
        color = Colors.red;
        label = 'REJECTED';
        break;
      default:
        color = Colors.amber;
        label = 'PENDING';
    }
    return Chip(
      label: Text(label),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold),
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
        title: const Text('Document Verification'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadDocuments)],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[50],
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search documents...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadDocuments();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedType,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: ['all', 'license', 'vehicle_registration', 'insurance', 'background_check', 'profile_photo']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.replaceAll('_', ' ').toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedType = value!;
                          _currentPage = 1;
                          _loadDocuments();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _documents.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.description, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No documents found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _documents.length,
                        itemBuilder: (context, index) {
                          final doc = _documents[index];
                          final driver = doc['driver'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(doc['status']).withOpacity(0.1),
                                child: Icon(Icons.description, color: _getStatusColor(doc['status'])),
                              ),
                              title: Text('${doc['document_type']?.toString().toUpperCase() ?? 'DOCUMENT'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(driver?['full_name'] ?? 'Unknown'),
                                  Text('${driver?['phone'] ?? ''} • ${_formatDate(doc['created_at'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(doc['status']),
                              onTap: () => _showDocumentDetail(doc),
                            ),
                          );
                        },
                      ),
          ),
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadDocuments(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _documents.length == _itemsPerPage ? () { _currentPage++; _loadDocuments(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'approved': return Colors.green;
      case 'rejected': return Colors.red;
      default: return Colors.amber;
    }
  }
}