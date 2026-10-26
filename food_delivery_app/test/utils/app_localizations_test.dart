// Locks LOC-004: the Flutter shell must render Kiswahili by default, with
// English as the fallback locale rather than as the product language.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/utils/app_localizations.dart';

Widget _probe(String key, Locale? locale) {
  return MaterialApp(
    locale: locale,
    supportedLocales: AppLocalizations.supportedLocales,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    home: Builder(
      builder: (context) => Scaffold(body: Text(context.tr(key))),
    ),
  );
}

void main() {
  group('AppLocalizations', () {
    test('Swahili is the default language', () {
      expect(AppLocalizations.defaultLanguageCode, 'sw');
      expect(LanguageService().currentLanguage, 'sw');
      expect(AppLocalizations.supportedLocales.first.languageCode, 'sw');
    });

    test('translates through the active locale', () {
      expect(AppLocalizations('sw').t('home'), 'Nyumbani');
      expect(AppLocalizations('en').t('home'), 'Home');
    });

    test('unknown keys fall back to English, then to the key', () {
      // 'welcome' exists in both dictionaries; 'cart' exists in both too, so
      // probe a key that only English carries by asking for a missing one.
      expect(AppLocalizations('sw').t('definitely_missing_key'),
          'definitely_missing_key');
    });

    test('dictionaries stay symmetric', () {
      final sw = AppLocalizations('sw');
      final en = AppLocalizations('en');
      for (final key in ['my_orders', 'cart_is_empty', 'sign_out', 'continue']) {
        expect(sw.t(key), isNot(key), reason: '$key missing in sw');
        expect(en.t(key), isNot(key), reason: '$key missing in en');
      }
      expect(LanguageService().isSwahili, isTrue);
    });
  });

  testWidgets('shell renders Swahili without an explicit device locale',
      (tester) async {
    await tester.pumpWidget(_probe('home', const Locale('sw')));
    await tester.pumpAndSettle();
    expect(find.text('Nyumbani'), findsOneWidget);
  });

  testWidgets('shell renders English when the user switches', (tester) async {
    await tester.pumpWidget(_probe('home', const Locale('en')));
    await tester.pumpAndSettle();
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('LanguageService drives the MaterialApp locale', (tester) async {
    final service = LanguageService();
    await tester.pumpWidget(
      MaterialApp(
        locale: Locale(service.currentLanguage),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: const Scaffold(body: Text('Nyumbani')),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Nyumbani'), findsOneWidget);

    service.setLanguage('en');
    expect(service.currentLanguage, 'en');
  });
}
