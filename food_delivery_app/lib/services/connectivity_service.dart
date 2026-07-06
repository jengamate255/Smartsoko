import 'package:connectivity_plus/connectivity_plus.dart';
import '../utils/logger.dart';

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  
  Stream<bool> get connectivityStream => _connectivity.onConnectivityChanged.map(
    (result) => result.contains(ConnectivityResult.mobile) || 
                result.contains(ConnectivityResult.wifi),
  );
  
  Future<bool> checkConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final isConnected = result.contains(ConnectivityResult.mobile) || 
                         result.contains(ConnectivityResult.wifi);
      
      if (!isConnected) {
        AppLogger.warning('No internet connection');
      }
      
      return isConnected;
    } catch (e) {
      AppLogger.error('Error checking connectivity', e);
      return false;
    }
  }
}
