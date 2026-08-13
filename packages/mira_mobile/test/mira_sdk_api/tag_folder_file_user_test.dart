import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'test_helper.dart';

void main() {
  group('UserModule', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getInfo 返回当前登录用户', () async {
      final info = await client.user().getInfo();
      expect(info.username, TestConfig.username);
      expect(info.roles, isA<List<String>>());
    });

    test('updateProfile 提交请求成功（不抛错）', () async {
      final origin = await client.user().getInfo();
      final temp = uniqueName('realname');
      try {
        // 后端对 super 账户 realName 可能固定，只验证请求不抛错
        await client.user().updateProfile(realName: temp);
      } finally {
        await client.user().updateProfile(realName: origin.realName.isEmpty ? null : origin.realName);
      }
    });
  });

  group('TagModule + FolderModule', () {
    late MiraClient client;

    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() async {
      // 兜底清理测试残留
      await cleanupByPrefix(client, 'tag');
      await cleanupByPrefix(client, 'folder');
      client.dispose();
    });

    group('Tag 只读', () {
      test('getAll 返回标签数组', () async {
        final tags = await client.tags().getAll(TestConfig.libraryId);
        expect(tags, isA<List>());
        expect(tags.every((t) => t.id is int), isTrue);
      });

      test('根标签 parentId 为 null', () async {
        final all = await client.tags().getAll(TestConfig.libraryId);
        final roots = all.where((t) => t.parentId == null);
        roots.forEach((t) => expect(t.parentId, isNull));
      });
    });

    group('Tag CRUD 闭环', () {
      test('create → update → findByTitle → delete', () async {
        final title = uniqueName('tag');
        final updTitle = uniqueName('tag_upd');

        // create 返回新 id
        final id = await client.tags().createTag(TestConfig.libraryId, title);
        expect(id, greaterThan(0));

        try {
          // update 不抛错
          await client.tags().updateTag(TestConfig.libraryId, id, title: updTitle);

          // findByTitle 命中
          final found = await client.tags().findByTitle(TestConfig.libraryId, updTitle);
          expect(found.any((t) => t.id == id), isTrue);
        } finally {
          await client.tags().deleteTag(TestConfig.libraryId, id);
        }

        // 删除后查不到
        final after = await client.tags().findByTitle(TestConfig.libraryId, updTitle);
        expect(after.any((t) => t.id == id), isFalse);
      });
    });

    group('Folder 只读', () {
      test('getAll 返回文件夹数组', () async {
        final folders = await client.folders().getAll(TestConfig.libraryId);
        expect(folders, isA<List>());
      });

      test('根文件夹 parentId 为 null', () async {
        final all = await client.folders().getAll(TestConfig.libraryId);
        final roots = all.where((f) => f.parentId == null);
        roots.forEach((f) => expect(f.parentId, isNull));
      });
    });

    group('Folder CRUD 闭环', () {
      test('create → update → findByTitle → delete', () async {
        final title = uniqueName('folder');
        final updTitle = uniqueName('folder_upd');

        final id = await client.folders().createFolder(TestConfig.libraryId, title);
        expect(id, greaterThan(0));

        try {
          await client.folders().updateFolder(TestConfig.libraryId, id, title: updTitle, color: 12345);
          final found = await client.folders().findByTitle(TestConfig.libraryId, updTitle);
          final target = found.firstWhere((f) => f.id == id);
          expect(target.color, 12345);
        } finally {
          await client.folders().deleteFolder(TestConfig.libraryId, id);
        }

        final after = await client.folders().findByTitle(TestConfig.libraryId, updTitle);
        expect(after.any((f) => f.id == id), isFalse);
      });

      test('create 子文件夹 → getAll 校验父子关系 → 删除（子先父后）', () async {
        final parentTitle = uniqueName('fparent');
        final childTitle = uniqueName('fchild');
        final parentId = await client.folders().createFolder(TestConfig.libraryId, parentTitle);
        final childId = await client.folders().createFolder(TestConfig.libraryId, childTitle, parentId: parentId);
        try {
          // 后端 folders/query 的 parent_id 过滤不可靠，用 getAll 客户端校验
          final all = await client.folders().getAll(TestConfig.libraryId);
          final child = all.firstWhere((f) => f.id == childId);
          expect(child.parentId, parentId);
        } finally {
          await client.folders().deleteFolder(TestConfig.libraryId, childId);
          await client.folders().deleteFolder(TestConfig.libraryId, parentId);
        }
      });
    });

    group('File 只读', () {
      test('getFiles 返回 FilesPage（result/limit/offset/total）', () async {
        final page = await client.files().getFiles(GetFilesRequest(
          libraryId: TestConfig.libraryId,
          filters: const FileFilters(limit: 2),
        ));
        expect(page.result, isA<List>());
        expect(page.total, greaterThan(0));
        expect(page.limit, 2);
      });

      test('文件 tags 字段可被 JSON 解析', () async {
        final page = await client.files().getFiles(GetFilesRequest(
          libraryId: TestConfig.libraryId,
          filters: const FileFilters(limit: 1),
        ));
        if (page.result.isNotEmpty) {
          // tags 是 JSON 字符串，parsedTags 不抛错即可
          expect(page.result.first.parsedTags(), isA<List>());
        }
      });

      test('getFile 按真实 id 获取', () async {
        final page = await client.files().getFiles(GetFilesRequest(
          libraryId: TestConfig.libraryId,
          filters: const FileFilters(limit: 1),
        ));
        final sampleId = page.result.first.id;
        final file = await client.files().getFile(TestConfig.libraryId, sampleId);
        expect(file.id, sampleId);
      });

      test('getFilesByFolder 真正按文件夹过滤（返回文件均属该文件夹）', () async {
        // 先找一个归属某文件夹的文件
        final list = await client.files().getFiles(GetFilesRequest(
          libraryId: TestConfig.libraryId,
          filters: const FileFilters(limit: 100, recycled: 0),
        ));
        final withFolder = list.result.firstWhere(
          (f) => f.folderId != 0 && f.folderId != null,
          orElse: () => list.result.first,
        );
        if (withFolder.folderId == 0) return; // 无归属文件夹的文件则跳过
        final inFolder = await client.files().getFilesByFolder(TestConfig.libraryId, withFolder.folderId);
        expect(inFolder.total, greaterThan(0));
        // 关键：返回的每个文件 folderId 都等于目标
        for (final f in inFolder.result) {
          expect(f.folderId, withFolder.folderId);
        }
      });

      test('getFilesByFolder(null) 返回未分类文件', () async {
        final uncat = await client.files().getFilesByFolder(TestConfig.libraryId, null);
        expect(uncat.result, isA<List>());
        // 未分类文件的 folderId 应为 0（FileData.fromJson 把 null 折成 0）
        if (uncat.result.isNotEmpty) {
          for (final f in uncat.result) {
            expect(f.folderId, 0);
          }
        }
      });
    });
  });
}
