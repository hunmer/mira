import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'package:mira_mobile/src/services/photo_backup_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final service = PhotoBackupService.instance;

  test('changing scan scope resets waterline', () async {
    final dir = await Directory.systemTemp.createTemp('photo_backup_');
    addTearDown(() => dir.delete(recursive: true));
    final file = File('${dir.path}${Platform.pathSeparator}old.jpg');
    await file.writeAsBytes([1]);
    final oldTime = DateTime(2026, 1, 1);
    await file.setLastModified(oldTime);

    SharedPreferences.setMockInitialValues({
      'photo_backup_last_synced_ms':
          oldTime.add(const Duration(days: 1)).millisecondsSinceEpoch,
    });
    await service.init();
    await service.updateConfig(
      PhotoBackupConfig(
        watchDir: dir.path,
        extensionWhitelist: const ['jpg'],
      ),
    );

    final uploaded = <String>[];
    await service.syncNow(
      upload: (file) async {
        uploaded.add(file.path);
        return const UploadResponse(
          results: [UploadResult(success: true, file: 'old.jpg')],
        );
      },
    );

    expect(uploaded, [file.path]);
  });

  test('empty scan does not advance waterline', () async {
    final dir = await Directory.systemTemp.createTemp('photo_backup_empty_');
    addTearDown(() => dir.delete(recursive: true));
    final waterline = DateTime(2026, 1, 1).millisecondsSinceEpoch;
    final config = PhotoBackupConfig(watchDir: dir.path);
    SharedPreferences.setMockInitialValues({
      'photo_backup_last_synced_ms': waterline,
      'photo_backup_config': jsonEncode(config.toJson()),
    });
    await service.init();
    await service.updateConfig(config);

    await service.syncNow(
      upload: (_) async => const UploadResponse(results: []),
    );

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getInt('photo_backup_last_synced_ms'), waterline);
  });
}
