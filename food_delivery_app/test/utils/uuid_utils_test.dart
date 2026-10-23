import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/utils/uuid_utils.dart';

void main() {
  group('isUuid', () {
    test('accepts canonical uuids', () {
      expect(isUuid('99218036-79fe-4e6f-84f2-673bef993df6'), isTrue);
      expect(isUuid('62F63314-16E4-4347-8248-4BDA8BBA6ABB'), isTrue);
    });

    test('rejects Firebase uids and empty values', () {
      expect(isUuid(null), isFalse);
      expect(isUuid(''), isFalse);
      expect(isUuid('AbCdEf1234567890abcdefghijklmn'), isFalse);
      // truncated / missing a group
      expect(isUuid('99218036-79fe-4e6f-84f2'), isFalse);
    });
  });
}
