import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerLoading extends StatelessWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;
  
  const ShimmerLoading({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
  });
  
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: borderRadius ?? BorderRadius.circular(8),
        ),
      ),
    );
  }
}

class RestaurantCardShimmer extends StatelessWidget {
  const RestaurantCardShimmer({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerLoading(
            width: double.infinity,
            height: 150,
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerLoading(width: 150, height: 20),
                const SizedBox(height: 8),
                const ShimmerLoading(width: 100, height: 16),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const ShimmerLoading(width: 60, height: 16),
                    const SizedBox(width: 16),
                    const ShimmerLoading(width: 80, height: 16),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class OrderCardShimmer extends StatelessWidget {
  const OrderCardShimmer({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const ShimmerLoading(width: 100, height: 20),
                const ShimmerLoading(width: 80, height: 24),
              ],
            ),
            const SizedBox(height: 12),
            const ShimmerLoading(width: double.infinity, height: 16),
            const SizedBox(height: 8),
            const ShimmerLoading(width: 150, height: 16),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const ShimmerLoading(width: 100, height: 16),
                const ShimmerLoading(width: 60, height: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
