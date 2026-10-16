import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/logger.dart';

/// A queued offline write operation. Only order-status updates and
/// location pings — the operations drivers/merchants trigger in the field
/// where connectivity drops are routine.
class QueuedOperation {
  final String id;
  final String type; // 'order.status' | 'driver.location' | 'order.create'
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int attempts;

  QueuedOperation({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.attempts = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'payload': payload,
        'createdAt': createdAt.toIso8601String(),
        'attempts': attempts,
      };

  static QueuedOperation fromJson(Map<String, dynamic> j) => QueuedOperation(
        id: j['id'],
        type: j['type'],
        payload: (j['payload'] as Map).cast<String, dynamic>(),
        createdAt: DateTime.parse(j['createdAt']),
        attempts: (j['attempts'] as num?)?.toInt() ?? 0,
      );
}

/// Persists failed writes and replays them when connectivity returns.
/// Firestore already has offline persistence for reads/writes it manages
/// directly — this queue covers the REST/server-API writes that bypass it.
class OfflineQueueService extends ChangeNotifier {
  static const _prefsKey = 'smartsoko_offline_queue_v1';
  static const _maxAttempts = 5;
  static const _maxQueueSize = 200;

  final _queue = <QueuedOperation>[];
  final _executors = <String, Future<bool> Function(Map<String, dynamic>)>{};
  bool _isDraining = false;
  Timer? _drainTimer;

  List<QueuedOperation> get pending => List.unmodifiable(_queue);
  bool get hasPending => _queue.isNotEmpty;

  /// Register the executor for an operation type ('order.status' etc).
  /// The executor returns true when the write succeeded (op is dropped),
  /// false to keep it queued for retry.
  void registerExecutor(
      String type, Future<bool> Function(Map<String, dynamic>) executor) {
    _executors[type] = executor;
  }

  /// Queue a write immediately (e.g., the network request just failed).
  Future<void> enqueue(String type, Map<String, dynamic> payload) async {
    if (_queue.length >= _maxQueueSize) {
      _queue.removeAt(0); // drop oldest — queue is bounded
    }
    _queue.add(QueuedOperation(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      type: type,
      payload: payload,
      createdAt: DateTime.now(),
    ));
    await _persist();
    notifyListeners();
  }

  /// Try to execute directly; if it fails with a network error, enqueue it.
  Future<bool> executeOrQueue(
    String type,
    Map<String, dynamic> payload,
    Future<bool> Function(Map<String, dynamic>) tryExecute,
  ) async {
    try {
      if (await tryExecute(payload)) return true;
    } catch (e) {
      AppLogger.warning('Offline queue: direct write failed, queueing ($e)');
    }
    await enqueue(type, payload);
    return false;
  }

  /// Replay all queued operations. Called on connectivity regain and app
  /// start. Old operations (maxAttempts exceeded) are dropped.
  Future<void> drain() async {
    if (_isDraining || _queue.isEmpty) return;
    _isDraining = true;
    try {
      final done = <String>[];
      for (final op in List<QueuedOperation>.from(_queue)) {
        op.attempts++;
        final executor = _executors[op.type];
        if (executor == null) {
          done.add(op.id); // no handler registered — drop it
          continue;
        }
        if (op.attempts > _maxAttempts ||
            DateTime.now().difference(op.createdAt).inHours > 24) {
          done.add(op.id); // stale — give up
          continue;
        }
        try {
          if (await executor(op.payload)) done.add(op.id);
        } catch (_) {
          // keep queued, retry on next drain
        }
      }
      _queue.removeWhere((op) => done.contains(op.id));
      await _persist();
      notifyListeners();
    } finally {
      _isDraining = false;
    }
  }

  /// Auto-drain every [interval] (e.g., while a delivery is active).
  void startAutoDrain({Duration interval = const Duration(seconds: 30)}) {
    _drainTimer?.cancel();
    _drainTimer = Timer.periodic(interval, (_) => drain());
  }

  void stopAutoDrain() {
    _drainTimer?.cancel();
    _drainTimer = null;
  }

  Future<void> loadQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw == null || raw.isEmpty) return;
      final list = jsonDecode(raw) as List;
      _queue.clear();
      for (final item in list) {
        _queue.add(QueuedOperation.fromJson(item as Map<String, dynamic>));
      }
      notifyListeners();
    } catch (e) {
      debugPrint('OfflineQueue load error: $e');
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          _prefsKey, jsonEncode(_queue.map((op) => op.toJson()).toList()));
    } catch (e) {
      debugPrint('OfflineQueue save error: $e');
    }
  }

  @override
  void dispose() {
    _drainTimer?.cancel();
    super.dispose();
  }
}
