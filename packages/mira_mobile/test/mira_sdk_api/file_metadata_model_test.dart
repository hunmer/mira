import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';

void main() {
  test('FileMetadataDimensions parses dimensions and metadata', () {
    final result = FileMetadataDimensions.fromJson({
      'id': '42',
      'metadata': {'width': 1920, 'height': 1080},
      'width': 1920,
      'height': 1080,
    });

    expect(result.id, 42);
    expect(result.width, 1920);
    expect(result.height, 1080);
    expect(result.metadata?['width'], 1920);
  });

  test('FileMetadataDimensions tolerates missing dimensions', () {
    final result = FileMetadataDimensions.fromJson({'id': 7});

    expect(result.id, 7);
    expect(result.width, isNull);
    expect(result.height, isNull);
    expect(result.metadata, isNull);
  });
}
