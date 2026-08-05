import 'package:flutter/material.dart';
import '../../utils/app_theme.dart';

class FareEstimateCard extends StatelessWidget {
  final dynamic fareEstimate;

  const FareEstimateCard({super.key, required this.fareEstimate});

  @override
  Widget build(BuildContext context) {
    final breakdown = fareEstimate.fareBreakdown;
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.receipt, color: AppTheme.primaryColor, size: 20),
                SizedBox(width: 8),
                Text(
                  'Fare Estimate',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildFareRow('Base Fare', breakdown.formattedBaseFare),
            _buildFareRow('Distance (${breakdown.formattedDistance})', breakdown.formattedDistanceFare),
            _buildFareRow('Time (${breakdown.formattedDuration})', breakdown.formattedTimeFare),
            if (breakdown.airportFee > 0) _buildFareRow('Airport Fee', breakdown.formattedAirportFee),
            if (breakdown.nightSurcharge > 0) _buildFareRow('Night Surcharge', breakdown.formattedNightSurcharge),
            if (breakdown.peakSurcharge > 0) _buildFareRow('Peak Surcharge', breakdown.formattedPeakSurcharge),
            if (breakdown.promoDiscount > 0) _buildFareRow('Promo Discount', '-${_formatAmount(breakdown.promoDiscount)}', Colors.green),
            const Divider(),
            if (breakdown.surgeMultiplier > 1.0)
              _buildFareRow('Surge (${breakdown.formattedSurgeMultiplier})', breakdown.formattedTotalFare),
            _buildFareRow('Platform Fee', '-${_formatAmount(breakdown.platformFee)}', Colors.grey[600]),
            const Divider(thickness: 2),
            _buildFareRow('Total', breakdown.formattedTotalFare, AppTheme.primaryColor, true),
            if (breakdown.promoDiscount > 0) ...[
              const SizedBox(height: 4),
              Text(
                'You save ${_formatAmount(breakdown.promoDiscount)} with promo!',
                style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.w500),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFareRow(String label, String amount, [Color? color, bool isBold = false]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: color ?? Colors.grey[700],
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            ),
          ),
          Text(
            amount,
            style: TextStyle(
              fontSize: 14,
              color: color ?? Colors.black87,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatAmount(int amount) {
    return 'TZS ${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}