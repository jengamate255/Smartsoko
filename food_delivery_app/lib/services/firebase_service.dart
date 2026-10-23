import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:smartsoko/config/app_config.dart';

/// Android gets its Firebase options from google-services.json.
/// Supplying the web app ID again can raise core/duplicate-app at startup.
Future<void> initializeFirebase() async {
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    await Firebase.initializeApp();
    return;
  }
  await Firebase.initializeApp(options: FirebaseOptions(
    apiKey: AppConfig.firebaseConfig['apiKey'],
    authDomain: AppConfig.firebaseConfig['authDomain'],
    projectId: AppConfig.firebaseConfig['projectId'],
    storageBucket: AppConfig.firebaseConfig['storageBucket'],
    messagingSenderId: AppConfig.firebaseConfig['messagingSenderId'],
    appId: AppConfig.firebaseConfig['appId'],
    databaseURL: AppConfig.firebaseConfig['databaseURL'],
  ));
}
