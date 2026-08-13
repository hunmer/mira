import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// 下载通知 id（前台进度通知固定用同一个）。
const int kDownloadNotificationId = 0x1001;

/// 前台服务通道：下载进度常驻通知。
const String _kChannelId = 'mira_download';
const String _kChannelName = 'Mira Downloads';
const String _kChannelDesc = '显示当前下载进度';

/// 通知服务（单例），封装 flutter_local_notifications。
///
/// 在 Android 上用「前台服务通知」展示下载进度，下载完成后移除进度
/// 并发一条普通通知提示「下载完成」；全部结束后停止前台服务。
/// iOS 上退化为普通通知（iOS 无前台服务概念），仅在下载完成时提示。
///
/// 进度更新由 [DownloadService] 驱动调用 [updateProgress]，
/// 内部做最小步进 1% 节流，避免高频推送造成通知栏抖动。
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static const _androidFileChannel = MethodChannel('mira/open_file');

  bool _initialized = false;

  /// 是否已启动 Android 前台服务（避免重复 startForegroundService 调用）。
  bool _foregroundActive = false;

  /// 上次推送的进度百分比（0..100），用于节流。
  int _lastPct = -1;

  /// 初始化插件与渠道。App 启动时调用一次。
  Future<void> init() async {
    if (_initialized) return;
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
      macOS: DarwinInitializationSettings(),
      // Windows 桌面端必须提供，否则 initialize() 抛
      // ArgumentError(Windows settings must be set...)。
      windows: WindowsInitializationSettings(
        appName: 'Mira',
        appUserModelId: 'Mira.MiraMobile',
        guid: '0079B38C-AC68-4963-934A-3D7EA6370A96',
      ),
    );
    await _plugin.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _handleNotificationTap,
    );
    // 建立下载通道（低重要性，进度通知不打扰）。
    await _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            _kChannelId,
            _kChannelName,
            description: _kChannelDesc,
            importance: Importance.low,
            showBadge: false,
          ),
        );
    _initialized = true;

    final launchDetails = await _plugin.getNotificationAppLaunchDetails();
    if (launchDetails?.didNotificationLaunchApp ?? false) {
      await _handleNotificationTap(launchDetails!.notificationResponse!);
    }
  }

  Future<void> _handleNotificationTap(NotificationResponse response) async {
    final path = response.payload;
    if (!Platform.isAndroid || path == null || path.isEmpty) return;
    await _androidFileChannel.invokeMethod<void>('open', path);
  }

  /// Android 13+ 需运行时申请通知权限；iOS 需请求授权。
  /// 在首次发起下载前调用。失败不阻断下载。
  Future<bool> requestPermissions() async {
    if (!_initialized) return false;
    if (Platform.isAndroid) {
      final android = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      final granted = await android?.requestNotificationsPermission();
      return granted ?? false;
    }
    if (Platform.isIOS || Platform.isMacOS) {
      // iOS / macOS 同属 Darwin，请求通知授权。
      final granted = await _plugin
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(alert: true, badge: true);
      return granted ?? false;
    }
    return true;
  }

  /// 构建进度型 Android 通知详情（前台服务期间用）。
  AndroidNotificationDetails _progressAndroidDetails({
    required int pct,
    required bool indeterminate,
  }) {
    return AndroidNotificationDetails(
      _kChannelId,
      _kChannelName,
      channelDescription: _kChannelDesc,
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true, // 前台服务期间不可滑动清除
      showProgress: true,
      maxProgress: 100,
      progress: indeterminate ? 0 : pct,
      indeterminate: indeterminate,
      onlyAlertOnce: true,
    );
  }

  /// 构建进度型 Windows 通知详情（带进度条；pct < 0 表示不确定进度）。
  WindowsNotificationDetails _windowsProgressDetails({
    required int pct,
    required int done,
    required int total,
  }) {
    return WindowsNotificationDetails(
      progressBars: [
        WindowsProgressBar(
          id: 'mira_download_progress',
          status: '$done / $total',
          value: pct < 0 ? null : (pct / 100),
        ),
      ],
    );
  }

  /// 启动 / 更新下载进度通知。
  ///
  /// [activeCount] 当前下载中任务数，[done] 已完成数，[total] 总数。
  /// [overallProgress] 队列整体进度 0..1（null 表示不确定）。[currentName] 正在下载的文件名。
  /// 在 Android 上启动前台服务，使下载进程在后台不被回收。
  Future<void> updateProgress({
    required int activeCount,
    required int done,
    required int total,
    double? overallProgress,
    String? currentName,
  }) async {
    if (!_initialized) return;

    final pct = overallProgress == null
        ? -1
        : (overallProgress * 100).round().clamp(0, 100);
    // 节流：进度变化不足 1% 且非完成态时跳过。
    if (pct >= 0 && pct == _lastPct && activeCount > 0) return;
    _lastPct = pct;

    final title = 'notif.downloadTitle'.tr();
    final body = currentName == null || currentName.isEmpty
        ? 'notif.downloadProgress'.tr(
            namedArgs: {'done': '$done', 'total': '$total'},
          )
        : 'notif.downloadProgressName'.tr(
            namedArgs: {
              'done': '$done',
              'total': '$total',
              'name': currentName,
            },
          );

    final androidDetails = _progressAndroidDetails(
      pct: pct,
      indeterminate: pct < 0,
    );

    if (Platform.isAndroid) {
      final android = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      if (android == null) return;
      if (!_foregroundActive) {
        // 首次启动前台服务（声明 dataSync 类型，需 AndroidManifest 权限）。
        await android.startForegroundService(
          id: kDownloadNotificationId,
          title: title,
          body: body,
          notificationDetails: androidDetails,
          foregroundServiceTypes: {
            AndroidServiceForegroundType.foregroundServiceTypeDataSync,
          },
        );
        _foregroundActive = true;
      } else {
        // 已是前台服务：重新 show 同 id 通知即刷新前台通知内容。
        await _plugin.show(
          id: kDownloadNotificationId,
          title: title,
          body: body,
          notificationDetails: NotificationDetails(android: androidDetails),
        );
      }
    } else {
      // iOS / macOS / Windows / 其它：普通通知展示进度（无前台服务概念）。
      const darwin = DarwinNotificationDetails();
      await _plugin.show(
        id: kDownloadNotificationId,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          iOS: darwin,
          macOS: darwin,
          android: androidDetails,
          windows: _windowsProgressDetails(pct: pct, done: done, total: total),
        ),
      );
    }
  }

  /// 全部下载完成：停止前台服务并提示完成。
  ///
  /// [completed] 本次完成数，[failed] 失败数。
  Future<void> showDownloadComplete({
    required int completed,
    int failed = 0,
    String? filePath,
  }) async {
    if (!_initialized) return;
    _lastPct = -1;

    final body = failed > 0
        ? 'notif.downloadDonePartial'.tr(
            namedArgs: {'ok': '$completed', 'fail': '$failed'},
          )
        : 'notif.downloadDoneAll'.tr(namedArgs: {'count': '$completed'});

    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        _kChannelId,
        _kChannelName,
        channelDescription: _kChannelDesc,
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        showProgress: false,
        ongoing: false,
        autoCancel: true,
      ),
      iOS: const DarwinNotificationDetails(),
      macOS: const DarwinNotificationDetails(),
      windows: const WindowsNotificationDetails(),
    );

    await _stopForeground();
    await _plugin.show(
      id: kDownloadNotificationId,
      title: 'notif.downloadComplete'.tr(),
      body: body,
      notificationDetails: details,
      payload: filePath,
    );
  }

  /// 主动停止前台服务（无完成通知）。
  Future<void> stopForeground() async {
    await _stopForeground();
  }

  Future<void> _stopForeground() async {
    if (!_initialized) return;
    _lastPct = -1;
    if (Platform.isAndroid && _foregroundActive) {
      await _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.stopForegroundService();
      _foregroundActive = false;
    } else {
      // iOS / 其它：移除进度通知。
      await _plugin.cancel(id: kDownloadNotificationId);
    }
  }
}
