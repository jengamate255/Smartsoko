import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/restaurant_service.dart';
import '../../models/restaurant.dart';
import '../../widgets/shimmer_loading.dart';
import '../customer/restaurant_card.dart';

class RestaurantListScreen extends StatelessWidget {
  const RestaurantListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurants'),
      ),
      body: StreamBuilder<List<Restaurant>>(
        stream: restaurantService.getAllRestaurants(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 5,
              itemBuilder: (context, index) => const ShimmerLoading(
                child: Card(
                  child: SizedBox(height: 120),
                ),
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 60, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Trigger rebuild
                      (context as Element).markNeedsBuild();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final restaurants = snapshot.data ?? [];

          if (restaurants.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.restaurant, size: 60, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'No restaurants available',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: restaurants.length,
            itemBuilder: (context, index) {
              return RestaurantCard(restaurant: restaurants[index]);
            },
          );
        },
      ),
    );
  }
}
