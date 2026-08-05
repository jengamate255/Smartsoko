import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class MerchantReviewsScreen extends StatefulWidget {
  final String shopId;

  const MerchantReviewsScreen({super.key, required this.shopId});

  @override
  State<MerchantReviewsScreen> createState() => _MerchantReviewsScreenState();
}

class _MerchantReviewsScreenState extends State<MerchantReviewsScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  int? _selectedRating;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        title: const Text('Reviews'),
        backgroundColor: const Color(0xFF064E3B),
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: _firestore
            .collection('reviews')
            .where('shopId', isEqualTo: widget.shopId)
            .orderBy('createdAt', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.reviews_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No reviews yet'),
                  const SizedBox(height: 8),
                  Text('Customer reviews will appear here',
                      style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            );
          }

          final allDocs = snapshot.data!.docs;
          final filteredDocs = _selectedRating != null
              ? allDocs.where((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  return (data['rating'] ?? 0).toInt() == _selectedRating;
                }).toList()
              : allDocs;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildRatingSummary(allDocs),
              const SizedBox(height: 16),
              _buildFilterChips(),
              const SizedBox(height: 16),
              if (filteredDocs.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      'No $_selectedRating star reviews',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                )
              else
                ...filteredDocs.map((doc) => _buildReviewCard(doc)),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _buildRatingSummary(List<QueryDocumentSnapshot> docs) {
    double totalRating = 0;
    int total = docs.length;
    Map<int, int> breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};

    for (var doc in docs) {
      final data = doc.data() as Map<String, dynamic>;
      final rating = (data['rating'] ?? 0).toInt().clamp(1, 5);
      totalRating += rating;
      breakdown[rating] = (breakdown[rating] ?? 0) + 1;
    }

    final avg = total > 0 ? totalRating / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Text(
                    avg.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF064E3B),
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (i) {
                      return Icon(
                        i < avg.round() ? Icons.star : Icons.star_border,
                        color: Colors.amber,
                        size: 20,
                      );
                    }),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$total reviews',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  ),
                ],
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  children: List.generate(5, (i) {
                    final star = 5 - i;
                    final count = breakdown[star] ?? 0;
                    final pct = total > 0 ? count / total : 0.0;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 20,
                            child: Text(
                              '$star',
                              style: const TextStyle(fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.star, color: Colors.amber, size: 14),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                backgroundColor: Colors.grey[200],
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                    Color(0xFF064E3B)),
                                minHeight: 8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 28,
                            child: Text(
                              '$count',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey[600]),
                              textAlign: TextAlign.right,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: const Text('All'),
              selected: _selectedRating == null,
              onSelected: (_) => setState(() => _selectedRating = null),
              selectedColor: const Color(0xFF064E3B),
              labelStyle: TextStyle(
                color: _selectedRating == null ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w500,
              ),
              checkmarkColor: Colors.white,
              side: BorderSide(
                color: _selectedRating == null
                    ? const Color(0xFF064E3B)
                    : Colors.grey[300]!,
              ),
            ),
          ),
          ...List.generate(5, (i) {
            final star = 5 - i;
            final isSelected = _selectedRating == star;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text('$star\u2605'),
                selected: isSelected,
                onSelected: (_) =>
                    setState(() => _selectedRating = isSelected ? null : star),
                selectedColor: const Color(0xFF064E3B),
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
                checkmarkColor: Colors.white,
                side: BorderSide(
                  color:
                      isSelected ? const Color(0xFF064E3B) : Colors.grey[300]!,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildReviewCard(QueryDocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final name = data['userName'] ?? data['customerName'] ?? 'Anonymous';
    final rating = (data['rating'] ?? 0).toInt();
    final text = data['comment'] ?? data['review'] ?? data['text'] ?? '';
    final createdAt = data['createdAt'];
    final reply = data['reply'];
    final foodRating = data['foodRating'];
    final deliveryRating = data['deliveryRating'];
    final serviceRating = data['serviceRating'];

    DateTime? date;
    if (createdAt is Timestamp) {
      date = createdAt.toDate();
    } else if (createdAt is DateTime) {
      date = createdAt;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFF064E3B).withOpacity(0.1),
                child: Text(
                  name.toString().isNotEmpty
                      ? name.toString()[0].toUpperCase()
                      : 'A',
                  style: const TextStyle(
                    color: Color(0xFF064E3B),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name.toString(),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    if (date != null)
                      Text(
                        DateFormat('MMM d, yyyy \u2022 h:mm a').format(date),
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getRatingColor(rating).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$rating',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _getRatingColor(rating),
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(Icons.star, color: _getRatingColor(rating), size: 14),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(5, (i) {
              return Icon(
                i < rating ? Icons.star : Icons.star_border,
                color: Colors.amber,
                size: 18,
              );
            }),
          ),
          if (text.toString().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(text.toString(), style: const TextStyle(fontSize: 14, height: 1.4)),
          ],
          if (foodRating != null || deliveryRating != null || serviceRating != null) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              children: [
                if (foodRating != null)
                  _buildSubRating('Food', (foodRating as num).toDouble()),
                if (deliveryRating != null)
                  _buildSubRating('Delivery', (deliveryRating as num).toDouble()),
                if (serviceRating != null)
                  _buildSubRating('Service', (serviceRating as num).toDouble()),
              ],
            ),
          ],
          const SizedBox(height: 12),
          if (reply != null && reply.toString().isNotEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF064E3B).withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
                border: const Border(
                  left: BorderSide(color: Color(0xFF064E3B), width: 3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.reply, size: 14, color: Color(0xFF064E3B)),
                      const SizedBox(width: 4),
                      Text(
                        'Merchant Reply',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF064E3B).withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    reply.toString(),
                    style: const TextStyle(fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _showReplyDialog(doc.id),
                icon: const Icon(Icons.reply, size: 16),
                label: const Text('Reply'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF064E3B),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSubRating(String label, double value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(width: 6),
          ...List.generate(5, (i) {
            return Icon(
              i < value.round() ? Icons.star : Icons.star_border,
              color: Colors.amber,
              size: 12,
            );
          }),
        ],
      ),
    );
  }

  Color _getRatingColor(int rating) {
    if (rating >= 4) return const Color(0xFF064E3B);
    if (rating == 3) return Colors.orange;
    return Colors.red;
  }

  void _showReplyDialog(String reviewId) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reply to Review'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Write your reply...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: Colors.grey[50],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              await _firestore.collection('reviews').doc(reviewId).update({
                'reply': text,
                'replyAt': FieldValue.serverTimestamp(),
              });
              if (mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Reply sent'),
                    backgroundColor: Color(0xFF064E3B),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF064E3B),
              foregroundColor: Colors.white,
            ),
            child: const Text('Send Reply'),
          ),
        ],
      ),
    );
  }
}
