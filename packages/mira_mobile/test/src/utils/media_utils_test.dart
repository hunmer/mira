import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'package:mira_mobile/src/utils/media_utils.dart';

void main() {
  group('MediaUtils', () {
    test('后端扩展名为空时从文件名识别视频', () {
      final file = _file(name: 'clip.mp4');

      expect(MediaUtils.extensionOf(file), 'mp4');
      expect(MediaUtils.isVideo(file), isTrue);
      expect(MediaUtils.isImage(file), isFalse);
    });

    test('扩展名判断忽略大小写和前导点号', () {
      final file = _file(name: 'clip', extension: '.MOV');

      expect(MediaUtils.extensionOf(file), 'mov');
      expect(MediaUtils.isVideo(file), isTrue);
    });

    test('同源 viewer 地址附加 token 并保留查询参数', () {
      final client = MiraClient('http://127.0.0.1:8081')..setToken('secret');
      addTearDown(client.dispose);

      final url = MediaUtils.previewViewerUrl(client, '/plugins/view?fileId=352');

      expect(url, 'http://127.0.0.1:8081/plugins/view?fileId=352&token=secret');
    });

    test('跨域 viewer 地址不附加 token', () {
      final client = MiraClient('http://127.0.0.1:8081')..setToken('secret');
      addTearDown(client.dispose);

      final url = MediaUtils.previewViewerUrl(client, 'https://viewer.example.com/open?fileId=352');

      expect(url, 'https://viewer.example.com/open?fileId=352');
    });
  });
}

FileData _file({required String name, String extension = ''}) {
  return FileData(
    id: 1,
    name: name,
    path: '',
    size: 0,
    extension: extension,
    folderId: 0,
    folderName: '',
    filePath: '',
    thumbPath: '',
    recycled: 0,
    tags: '[]',
    uploader: 0,
    createdAt: 0,
    importedAt: 0,
  );
}
