// App-shell smoke test.
//
// This replaced the `flutter create` counter test, which pumped `MyApp()` and
// asserted a counter this app has never had — and needed Firebase, so it threw
// while building `RoleAwareAuthWrapper`. `ShimmerLoading` is covered instead:
// it is real shared UI (used by the home, discovery and listing screens) and
// pulls in no Firebase or providers.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/widgets/shimmer_loading.dart';

void main() {
  group('ShimmerLoading', () {
    testWidgets('occupies the requested placeholder size', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(child: ShimmerLoading(width: 200, height: 40)),
          ),
        ),
      );

      expect(tester.getSize(find.byType(ShimmerLoading)), const Size(200, 40));

      // The shimmer animates forever; rebuild an empty tree so its ticker is
      // disposed before the test ends.
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('RestaurantCardShimmer builds its placeholder card', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: RestaurantCardShimmer())),
      );

      expect(find.byType(Card), findsOneWidget);
      expect(find.byType(ShimmerLoading), findsNWidgets(5));

      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('accepts a custom placeholder child', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ShimmerLoading(child: Text('Loading restaurants')),
          ),
        ),
      );
      expect(find.text('Loading restaurants'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });
}
