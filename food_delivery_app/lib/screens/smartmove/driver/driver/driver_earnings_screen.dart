import 'package:flutter/material.dart';
import '../../../models/smartmove/driver_earnings.dart';
import '../../../services/smartmove/driver_service.dart';

class DriverEarningsScreen extends StatefulWidget {
  final String userId;

  const DriverEarningsScreen({super.key, required this.userId});

  @override
  State<DriverEarningsScreen> createState() => _DriverEarningsScreenState();
}

class _DriverEarningsScreenState extends State<DriverEarningsScreen> with SingleTickerProviderStateMixin {
  final _driverService = SmartMoveDriverService();
  late final TabController _tabController;

  DriverEarningsSummary? _summary;
  DriverEarningsPeriod? _dailyEarnings;
  DriverEarningsPeriod? _weeklyEarnings;
  List<DriverBonus> _bonuses = [];
  bool _isLoading = true;
  bool _isWithdrawing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadEarnings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadEarnings() async {
    setState(() => _isLoading = true);
    try {
      final summary = await _driverService.getEarningsSummary(widget.userId);
      final daily = await _driverService.getDailyEarnings(widget.userId, DateTime.now());
      final weekly = await _driverService.getWeeklyEarnings(widget.userId, DateTime.now());

      if (mounted) {
        setState(() {
          _summary = summary;
          _dailyEarnings = daily;
          _weeklyEarnings = weekly;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _withdrawEarnings() async {
    if (_summary == null || _summary!.balance <= 0) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF131b2e),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _buildWithdrawalSheet(),
    );
  }

  Widget _buildWithdrawalSheet() {
    final amountController = TextEditingController(text: _summary!.balance.toString());

    return StatefulBuilder(
      builder: (context, setDialogState) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: const Color(0xFF2d3449), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Withdraw Earnings', style: TextStyle(color: Color(0xFFdae2fd), fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Available balance: ${_summary!.formattedBalance}', style: const TextStyle(color: Color(0xFF8c909f))),
            const SizedBox(height: 24),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Color(0xFFdae2fd)),
              decoration: InputDecoration(
                labelText: 'Amount (TZS)',
                labelStyle: const TextStyle(color: Color(0xFF8c909f)),
                prefixText: 'TZS ',
                prefixStyle: const TextStyle(color: Color(0xFFdae2fd)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF2d3449))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFadc6ff))),
                fillColor: const Color(0xFF171f33),
                filled: true,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isWithdrawing ? null : () async {
                  final amount = int.tryParse(amountController.text);
                  if (amount == null || amount <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
                    return;
                  }
                  if (amount > _summary!.balance) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Insufficient balance')));
                    return;
                  }
                  setDialogState(() => _isWithdrawing = true);
                  final result = await _driverService.requestWithdrawal(widget.userId, amount);
                  Navigator.pop(context);
                  if (result.success) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Withdrawal initiated: ${result.reference}')));
                    _loadEarnings();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.error ?? 'Withdrawal failed')));
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFadc6ff),
                  foregroundColor: const Color(0xFF002e6a),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isWithdrawing
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Color(0xFF002e6a), strokeWidth: 2))
                    : const Text('Withdraw', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF0b1326),
        appBar: AppBar(title: const Text('Earnings', style: TextStyle(color: Color(0xFFdae2fd))), backgroundColor: const Color(0xFF131b2e), iconTheme: const IconThemeData(color: Color(0xFFdae2fd))),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFFadc6ff))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0b1326),
      appBar: AppBar(
        title: const Text('Earnings', style: TextStyle(color: Color(0xFFdae2fd))),
        backgroundColor: const Color(0xFF131b2e),
        iconTheme: const IconThemeData(color: Color(0xFFdae2fd)),
        actions: [
          IconButton(icon: const Icon(Icons.history, color: Color(0xFFdae2fd)), onPressed: _showTransactionHistory),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildBalanceCard(),
            const SizedBox(height: 20),
            _buildPeriodCard('Today', _dailyEarnings),
            const SizedBox(height: 12),
            _buildPeriodCard('This Week', _weeklyEarnings),
            const SizedBox(height: 20),
            if (_bonuses.isNotEmpty) ...[
              Row(
                children: [
                  const Text('Bonuses', style: TextStyle(color: Color(0xFFdae2fd), fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(color: Color(0xFFadc6ff)))),
                ],
              ),
              const SizedBox(height: 12),
              ..._bonuses.map(_buildBonusCard),
            ],
            if (_summary != null && _summary!.balance > 0) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: _withdrawEarnings,
                  icon: const Icon(Icons.account_balance_wallet),
                  label: const Text('Withdraw Earnings', style: TextStyle(fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFadc6ff),
                    foregroundColor: const Color(0xFF002e6a),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFFadc6ff).withValues(alpha: 0.15), const Color(0xFF5de6ff).withValues(alpha: 0.05)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFadc6ff).withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Available Balance', style: TextStyle(color: Color(0xFF8c909f), fontSize: 14)),
          const SizedBox(height: 8),
          Text(
            _summary?.formattedBalance ?? 'TZS 0',
            style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 40, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _buildStatItem('Total Earned', _summary?.formattedTotalEarned ?? 'TZS 0'),
              const SizedBox(width: 16),
              _buildStatItem('Withdrawn', _summary?.formattedTotalWithdrawn ?? 'TZS 0'),
              const SizedBox(width: 16),
              _buildStatItem('Pending', _summary?.formattedPending ?? 'TZS 0'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(color: Color(0xFFdae2fd), fontWeight: FontWeight.bold, fontSize: 16)),
          Text(label, style: const TextStyle(color: Color(0xFF8c909f), fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildPeriodCard(String title, DriverEarningsPeriod? period) {
    if (period == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 16, fontWeight: FontWeight.bold)),
              const Spacer(),
              Text(period.formattedGrossEarnings, style: const TextStyle(color: Color(0xFF5de6ff), fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMiniStat('${period.totalRides} rides'),
              Container(width: 1, height: 20, color: const Color(0xFF2d3449), margin: const EdgeInsets.symmetric(horizontal: 12)),
              _buildMiniStat('${period.totalDistanceKm.toStringAsFixed(0)} km'),
              Container(width: 1, height: 20, color: const Color(0xFF2d3449), margin: const EdgeInsets.symmetric(horizontal: 12)),
              _buildMiniStat('Platform: ${period.platformFees.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}'),
            ],
          ),
          if (period.tipsReceived > 0 || period.bonuses > 0) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (period.tipsReceived > 0)
                  _buildMiniStat('Tips: ${period.tipsReceived.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}', color: const Color(0xFF5de6ff)),
                if (period.tipsReceived > 0 && period.bonuses > 0) const SizedBox(width: 12),
                if (period.bonuses > 0)
                  _buildMiniStat('Bonuses: ${period.bonuses.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}', color: const Color(0xFFadc6ff)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMiniStat(String text, {Color? color}) {
    return Text(text, style: TextStyle(fontSize: 12, color: color ?? const Color(0xFF8c909f)));
  }

  Widget _buildBonusCard(DriverBonus bonus) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF5de6ff).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.emoji_events, color: Color(0xFF5de6ff)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(bonus.title, style: const TextStyle(color: Color(0xFFdae2fd), fontWeight: FontWeight.w500)),
                if (bonus.description != null) Text(bonus.description!, style: const TextStyle(color: Color(0xFF8c909f), fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(bonus.formattedAmount, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5de6ff))),
              Text(bonus.isPaid ? 'Paid' : bonus.status, style: TextStyle(fontSize: 12, color: bonus.isPaid ? const Color(0xFF5de6ff) : Colors.orange)),
            ],
          ),
        ],
      ),
    );
  }

  void _showTransactionHistory() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DriverTransactionHistoryScreen(userId: widget.userId)),
    );
  }
}

class DriverTransactionHistoryScreen extends StatelessWidget {
  final String userId;

  const DriverTransactionHistoryScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0b1326),
      appBar: AppBar(
        title: const Text('Transaction History', style: TextStyle(color: Color(0xFFdae2fd))),
        backgroundColor: const Color(0xFF131b2e),
        iconTheme: const IconThemeData(color: Color(0xFFdae2fd)),
      ),
      body: const Center(child: Text('Transaction history will be displayed here', style: TextStyle(color: Color(0xFF8c909f)))),
    );
  }
}

class DriverRideHistoryScreen extends StatelessWidget {
  final String userId;

  const DriverRideHistoryScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0b1326),
      appBar: AppBar(
        title: const Text('Ride History', style: TextStyle(color: Color(0xFFdae2fd))),
        backgroundColor: const Color(0xFF131b2e),
        iconTheme: const IconThemeData(color: Color(0xFFdae2fd)),
      ),
      body: const Center(child: Text('Ride history will be displayed here', style: TextStyle(color: Color(0xFF8c909f)))),
    );
  }
}
