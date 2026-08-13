import 'package:flutter/material.dart';
import 'app_router.dart';

import '../src/widgets/glass/mira_ui.dart';

class RouterController {
  static final RouterController _instance = RouterController._internal();

  factory RouterController() {
    return _instance;
  }

  RouterController._internal();

  BuildContext? get context => AppRouter.navigatorKey.currentContext;

  void navigateToHome() {
    AppRouter.navigateTo('/');
  }

  void navigateToSettings() {
    AppRouter.navigateTo('/settings');
  }

  void navigateToServerList() {
    AppRouter.navigateTo('/server_list');
  }

  void goBack() {
    AppRouter.goBack();
  }

  void replaceWithHome() {
    AppRouter.replaceWith('/');
  }

  void navigateAndClearStackToHome() {
    AppRouter.navigateAndClearStack('/');
  }

  Future<dynamic> navigateToRoute(String routeName, {Object? arguments}) {
    return AppRouter.navigateTo(routeName, arguments: arguments);
  }

  Future<dynamic> replaceWithRoute(String routeName, {Object? arguments}) {
    return AppRouter.replaceWith(routeName, arguments: arguments);
  }

  Future<dynamic> navigateAndClearStackToRoute(String routeName, {Object? arguments}) {
    return AppRouter.navigateAndClearStack(routeName, arguments: arguments);
  }

  void showSnackBar(String message, {Color? backgroundColor}) {
    final context = AppRouter.navigatorKey.currentContext;
    if (context != null) {
      showMiraToast(
        context,
        message: message,
        type: backgroundColor != null &&
                (backgroundColor.r * 255.0).round() > 150
            ? MiraToastType.error
            : MiraToastType.info,
      );
    }
  }

  Future<bool?> showConfirmDialog(String title, String content) async {
    final context = AppRouter.navigatorKey.currentContext;
    if (context != null) {
      return showMiraConfirmDialog(
        context,
        title: title,
        message: content,
      );
    }
    return null;
  }
}