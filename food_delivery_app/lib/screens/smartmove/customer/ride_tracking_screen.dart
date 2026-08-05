import 'package:flutter/material.dart';

class RideTrackingScreen extends StatefulWidget {
  final String rideRequestId;

  const RideTrackingScreen({super.key, required this.rideRequestId});

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen> {
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Ride Tracking'),
      ),
    );
  }
}
