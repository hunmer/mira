import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';

void main() {
  test('FileFilters serializes sorting parameters', () {
    expect(
      const FileFilters(
        sort: 'imported_at',
        order: 'desc',
        limit: 30,
        offset: 0,
      ).toJson(),
      {'sort': 'imported_at', 'order': 'desc', 'limit': 30, 'offset': 0},
    );
  });

  group('PreviewViewersResponse', () {
    test('解析查看器及可选图标', () {
      final response = PreviewViewersResponse.fromJson({
        'libraryId': '1779810479725',
        'fileId': 352,
        'viewers': [
          {
            'viewerId': 'viewer-1',
            'pluginId': 'plugin-1',
            'pluginName': 'preview-plugin',
            'serverPluginName': 'preview-server-plugin',
            'title': 'Preview',
            'iframeUrl': '/plugins/preview?fileId=352',
            'priority': 10,
            'icon': 'image',
          },
        ],
      });

      expect(response.libraryId, '1779810479725');
      expect(response.fileId, '352');
      expect(response.viewers, hasLength(1));
      expect(response.viewers.single.viewerId, 'viewer-1');
      expect(response.viewers.single.priority, 10);
      expect(response.viewers.single.icon, 'image');
    });

    test('无匹配插件时解析为空列表', () {
      final response = PreviewViewersResponse.fromJson({
        'libraryId': '1779810479725',
        'fileId': '352',
        'viewers': <dynamic>[],
      });

      expect(response.viewers, isEmpty);
    });
  });

  test('getPreviewViewers 发送认证 POST 请求并解析响应', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final client = MiraClient(
      'http://${server.address.host}:${server.port}',
    ).setToken('test-token');

    try {
      final requestFuture = server.first;
      final responseFuture = client.files().getPreviewViewers(
        '1779810479725',
        352,
        clientId: 'mobile',
      );
      final request = await requestFuture;
      final requestBody =
          jsonDecode(await utf8.decoder.bind(request).join())
              as Map<String, dynamic>;

      expect(request.method, 'POST');
      expect(request.uri.path, '/api/files/getPreviewViewers');
      expect(request.headers.contentType?.mimeType, 'application/json');
      expect(
        request.headers.value(HttpHeaders.authorizationHeader),
        'Bearer test-token',
      );
      expect(requestBody, {
        'libraryId': '1779810479725',
        'fileId': '352',
        'clientId': 'mobile',
      });

      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = ContentType.json
        ..write(
          jsonEncode({
            'data': {
              'libraryId': '1779810479725',
              'fileId': '352',
              'viewers': <dynamic>[],
            },
          }),
        );
      await request.response.close();

      final response = await responseFuture;
      expect(response.libraryId, '1779810479725');
      expect(response.fileId, '352');
      expect(response.viewers, isEmpty);
    } finally {
      client.dispose();
      await server.close(force: true);
    }
  });
}
