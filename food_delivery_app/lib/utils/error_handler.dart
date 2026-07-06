import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'logger.dart';

class AppError {
  final String message;
  final String? code;
  final dynamic originalError;
  
  AppError(this.message, {this.code, this.originalError});
}

class ErrorHandler {
  static AppError handleError(dynamic error) {
    AppLogger.error('Error occurred', error);
    
    if (error is FirebaseAuthException) {
      return _handleAuthError(error);
    } else if (error is FirebaseException) {
      return _handleFirebaseError(error);
    } else if (error is NetworkException) {
      return AppError('No internet connection. Please check your network.');
    } else {
      return AppError('An unexpected error occurred. Please try again.');
    }
  }
  
  static AppError _handleAuthError(FirebaseAuthException error) {
    switch (error.code) {
      case 'user-not-found':
        return AppError('No user found with this phone number.');
      case 'wrong-password':
        return AppError('Incorrect password.');
      case 'user-disabled':
        return AppError('This account has been disabled.');
      case 'too-many-requests':
        return AppError('Too many attempts. Please try again later.');
      case 'operation-not-allowed':
        return AppError('This operation is not allowed.');
      default:
        return AppError('Authentication failed. Please try again.');
    }
  }
  
  static AppError _handleFirebaseError(FirebaseException error) {
    switch (error.code) {
      case 'permission-denied':
        return AppError('You don\'t have permission to perform this action.');
      case 'unavailable':
        return AppError('Service temporarily unavailable. Please try again.');
      case 'not-found':
        return AppError('Requested data not found.');
      case 'already-exists':
        return AppError('This item already exists.');
      default:
        return AppError('An error occurred. Please try again.');
    }
  }
  
  static void showErrorSnackBar(BuildContext context, dynamic error) {
    final appError = handleError(error);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(appError.message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }
  
  static void showSuccessSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class NetworkException implements Exception {
  final String message;
  NetworkException([this.message = 'Network error occurred']);
}
