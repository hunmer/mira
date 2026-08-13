import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'package:mira_mobile/src/providers/file_filter_provider.dart';
import 'package:mira_mobile/src/providers/files_provider.dart';
import 'package:mira_mobile/src/providers/session_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('persists and restores all active filter fields', () async {
    final notifier = FileFilterNotifier();
    notifier.setSelectedFolders({1, 2});
    notifier.setSelectedTags({'portrait', 'favorite'});
    notifier.setTitle('summer');
    notifier.setCategory('image');
    notifier.setCustomSize(min: 1024, max: 2048);

    await Future<void>.delayed(Duration.zero);

    final restored = FileFilterNotifier();
    await restored.init();
    expect(restored.state, notifier.state);
  });

  test('clear removes the persisted filter', () async {
    final notifier = FileFilterNotifier();
    notifier.setSpecial(SpecialFilter.untagged);
    notifier.clear();

    await Future<void>.delayed(Duration.zero);

    final restored = FileFilterNotifier();
    await restored.init();
    expect(restored.state, const FileFilterState());
  });

  test('invalid persisted data falls back to the default filter', () async {
    SharedPreferences.setMockInitialValues({'file_filter': '{invalid'});

    final notifier = FileFilterNotifier();
    await notifier.init();

    expect(notifier.state, const FileFilterState());
  });

  test(
    'switching libraries clears filters but selecting the same one does not',
    () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final filter = container.read(fileFilterProvider.notifier);
      final session = container.read(sessionProvider.notifier);
      const first = Library(
        id: '1',
        name: 'First',
        path: '/first',
        status: 'active',
        fileCount: 0,
        size: 0,
        description: '',
        createdAt: '',
        updatedAt: '',
      );
      const second = Library(
        id: '2',
        name: 'Second',
        path: '/second',
        status: 'active',
        fileCount: 0,
        size: 0,
        description: '',
        createdAt: '',
        updatedAt: '',
      );

      session.selectLibrary(first);
      filter.setTitle('keep');
      session.selectLibrary(first);
      expect(container.read(fileFilterProvider).title, 'keep');

      session.selectLibrary(second);
      expect(container.read(fileFilterProvider), const FileFilterState());
    },
  );

  test('file sorting defaults and resets to imported time descending', () {
    final notifier = FileSortNotifier();

    expect(notifier.state, const FileSortState());
    notifier.setSort(
      const FileSortState(
        field: FileSortField.name,
        order: FileSortOrder.ascending,
      ),
    );
    expect(notifier.state.isDefault, isFalse);

    notifier.reset();
    expect(notifier.state, const FileSortState());
    expect(notifier.state.isDefault, isTrue);
  });
}
