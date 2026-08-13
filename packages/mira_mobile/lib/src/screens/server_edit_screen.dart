import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../router/app_router.dart';
import '../widgets/glass/mira_ui.dart';
import '../../mira_sdk/mira_sdk.dart';
import '../models/server_config.dart';
import '../services/server_storage_service.dart';

// 亮色模式下的文字色（暗色模式由下方 helper 切换为白色/半透明白）。
const _textSecondaryLightColor = Color(0xFF64748B);
const _textPrimaryLightColor = Color(0xFF0F172A);

/// 渐变背景上的主文字色：亮色深、暗色白，保证对比度。
Color _textPrimary(bool isDark) =>
    isDark ? Colors.white : _textPrimaryLightColor;

/// 渐变背景上的次要文字色（label / helper）。
Color _textSecondary(bool isDark) =>
    isDark ? Colors.white70 : _textSecondaryLightColor;

class ServerEditScreen extends ConsumerStatefulWidget {
  final ServerConfig? server;

  const ServerEditScreen({super.key, this.server});

  @override
  ConsumerState<ServerEditScreen> createState() => _ServerEditScreenState();
}

class _ServerEditScreenState extends ConsumerState<ServerEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storageService = ServerStorageService.instance;

  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController = GlassLargeTitleController();

  late final TextEditingController _nameController;
  late final TextEditingController _serverUrlController;
  late final TextEditingController _wsUrlController;
  late final TextEditingController _usernameController;
  late final TextEditingController _passwordController;
  late final TextEditingController _tokenController;

  late int _authMethod;
  bool _isEditMode = false;
  bool _isSaving = false;
  bool _isTesting = false;

  @override
  void initState() {
    super.initState();
    _isEditMode = widget.server != null;
    final server = widget.server;

    _nameController = TextEditingController(text: server?.name ?? '');
    _serverUrlController = TextEditingController(text: server?.serverUrl ?? '');
    _wsUrlController = TextEditingController(text: server?.wsUrl ?? '');
    _usernameController = TextEditingController(text: server?.username ?? '');
    _passwordController = TextEditingController(text: server?.password ?? '');
    _tokenController = TextEditingController(text: server?.token ?? '');

    _authMethod = server?.authMethod ?? 0;

    // ws 地址随 http 地址自动同步（端口固定 8018）
    _serverUrlController.addListener(_syncWsUrl);
    // 初始化时若 ws 为空，立即按 http 同步一次
    if (_wsUrlController.text.isEmpty) _syncWsUrl();
  }

  /// 根据服务器地址同步 WebSocket 地址：
  /// http→ws / https→wss，host 同步，端口固定 8018。
  void _syncWsUrl() {
    final http = _serverUrlController.text.trim();
    if (http.isEmpty) {
      _wsUrlController.clear();
      return;
    }
    try {
      final uri = Uri.parse(http);
      final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
      final ws = '$wsScheme://${uri.host}:8018';
      // 避免监听器中触发自身重复通知
      if (_wsUrlController.text != ws) {
        _wsUrlController.text = ws;
      }
    } catch (_) {
      // 解析失败保持原样
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _serverUrlController.removeListener(_syncWsUrl);
    _nameController.dispose();
    _serverUrlController.dispose();
    _wsUrlController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  /// 测试连接（HTTP REST）。
  ///
  /// 流程：MiraClient(baseUrl) → system().getHealth()（拿 authRequired）
  /// → 若需鉴权则 login(u,p) → verify() 校验 token 有效。
  /// 成功后清理临时 client（实际接入由 sessionProvider 在保存后发起）。
  Future<void> _testConnection() async {
    final baseUrl = _serverUrlController.text.trim();
    if (baseUrl.isEmpty ||
        (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) {
      if (mounted) {
        showMiraToast(
          context,
          message: 'server.testFillUrl'.tr(),
          type: MiraToastType.warning,
        );
      }
      return;
    }

    setState(() => _isTesting = true);
    MiraClient? client;
    try {
      client = MiraClient(baseUrl);
      final health = await client.system().getHealth();
      final needAuth = health.authRequired ?? true;

      if (needAuth) {
        if (_authMethod == 1) {
          // Token 模式：直接 setToken 后 verify
          final token = _tokenController.text.trim();
          if (token.isEmpty) {
            throw _TestConnectionException('server.testFillToken'.tr());
          }
          client.setToken(token);
          await client.auth().verify();
        } else {
          final username = _usernameController.text.trim();
          final password = _passwordController.text;
          if (username.isEmpty || password.isEmpty) {
            throw _TestConnectionException('server.testFillCredentials'.tr());
          }
          await client.login(username, password);
          await client.auth().verify();
        }
      }

      if (mounted) {
        showMiraToast(
          context,
          message: 'server.testSuccess'.tr(),
          type: MiraToastType.success,
        );
      }
    } on _TestConnectionException catch (e) {
      if (mounted) {
        showMiraToast(
          context,
          message: e.message,
          type: MiraToastType.warning,
        );
      }
    } catch (e) {
      if (mounted) {
        showMiraToast(
          context,
          message: 'server.connectFailed'.tr(namedArgs: {'error': '$e'}),
          type: MiraToastType.error,
        );
      }
    } finally {
      client?.dispose();
      if (mounted) setState(() => _isTesting = false);
    }
  }

  Future<void> _saveServer() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final server = ServerConfig(
        // ID 自动生成（新建）或保留原值（编辑），用户无需填写
        id: widget.server?.id ?? ServerConfig.generateId(),
        name: _nameController.text,
        serverUrl: _serverUrlController.text,
        wsUrl: _wsUrlController.text,
        authMethod: _authMethod,
        username: _usernameController.text.isNotEmpty
            ? _usernameController.text
            : null,
        password: _passwordController.text.isNotEmpty
            ? _passwordController.text
            : null,
        token: _tokenController.text.isNotEmpty ? _tokenController.text : null,
        createdAt: widget.server?.createdAt,
        isCurrent: widget.server?.isCurrent ?? false,
      );

      if (_isEditMode) {
        await _storageService.updateServer(server);
      } else {
        await _storageService.addServer(server);
      }

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        showMiraToast(
          context,
          message: 'server.saveFailed'.tr(namedArgs: {'error': '$e'}),
          type: MiraToastType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final title = _isEditMode ? 'server.editTitle'.tr() : 'server.addTitle'.tr();
    final topPad = MediaQuery.paddingOf(context).top;
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        title: Text(
          title,
          style: TextStyle(
            color: _textPrimary(isDark),
            fontWeight: FontWeight.w600,
          ),
        ),
        largeTitleController: _titleController,
        leading: glassBackButton(context, onPressed: AppRouter.goBack),
        actions: [
          MiraIconButton(
            icon: _isSaving
                ? const MiraCircularProgressIndicator(size: 20)
                : Icon(Icons.save_outlined, color: _textPrimary(isDark)),
            tooltip: 'common.save'.tr(),
            onPressed: _isTesting || _isSaving ? null : _saveServer,
          ),
        ],
      ),
      body: Material(
        type: MaterialType.transparency,
        // Form 仅提供校验作用域，不关心 sliver 结构；CustomScrollView 复用
        // 大标题控制器自带的 scrollController 以驱动折叠。
        child: Form(
          key: _formKey,
          child: CustomScrollView(
            controller: _titleController.scrollController,
            slivers: [
              // 状态栏 + 预留间距，把大标题推到状态栏下方。
              // 状态栏 + GlassAppBar 工具栏高度，把大标题推到返回按钮栏正下方。
              SliverToBoxAdapter(child: SizedBox(height: topPad + GlassLayout.largeTitleTopOffset)),
              GlassLargeTitle(text: title, controller: _titleController),
              SliverPadding(
                padding: const EdgeInsets.all(16.0).copyWith(bottom: 96),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _buildTextField(
                      label: 'server.nameLabel'.tr(),
                      controller: _nameController,
                      isDark: isDark,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'server.nameRequired'.tr();
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      label: 'server.urlLabel'.tr(),
                      controller: _serverUrlController,
                      isDark: isDark,
                      placeholder: 'http://192.168.1.200:8081',
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'server.urlRequired'.tr();
                        }
                        if (!value.startsWith('http://') &&
                            !value.startsWith('https://')) {
                          return 'server.urlInvalid'.tr();
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      label: 'server.wsLabel'.tr(),
                      controller: _wsUrlController,
                      isDark: isDark,
                      placeholder: 'ws://192.168.1.200:8018',
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'server.wsRequired'.tr();
                        }
                        if (!value.startsWith('ws://') &&
                            !value.startsWith('wss://')) {
                          return 'server.wsInvalid'.tr();
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    _buildLabel('server.authMethod'.tr(), isDark),
                    const SizedBox(height: 8),
                    _buildAuthMethodSelector(),
                    const SizedBox(height: 16),
                    if (_authMethod == 0) ...[
                      _buildTextField(
                        label: 'server.username'.tr(),
                        controller: _usernameController,
                        isDark: isDark,
                        helperText: 'server.usernameHelper'.tr(),
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        label: 'server.password'.tr(),
                        controller: _passwordController,
                        isDark: isDark,
                        obscureText: true,
                        placeholder: 'server.passwordHint'.tr(),
                        helperText: 'server.passwordHelper'.tr(),
                      ),
                    ] else ...[
                      _buildTextField(
                        label: 'server.token'.tr(),
                        controller: _tokenController,
                        isDark: isDark,
                        placeholder: 'server.tokenHint'.tr(),
                        helperText: 'server.tokenHelper'.tr(),
                      ),
                    ],
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomBar: _buildTestButton(isDark),
    );
  }

  Widget _buildLabel(String text, bool isDark) {
    return Text(
      text,
      style: TextStyle(
        color: _textSecondary(isDark),
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required bool isDark,
    String? placeholder,
    String? helperText,
    bool enabled = true,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label, isDark),
        const SizedBox(height: 6),
        MiraTextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscureText,
          hintText: placeholder,
          validator: validator,
        ),
        if (helperText != null) ...[
          const SizedBox(height: 6),
          Text(
            helperText,
            style: TextStyle(color: _textSecondary(isDark), fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _buildAuthMethodSelector() {
    // 复用 glass inline tab bar，选中态外观与主题一致。
    return GlassTabBar.inline(
      tabs: [
        GlassTab(label: 'server.auth'.tr()),
        GlassTab(label: 'server.token'.tr()),
      ],
      selectedIndex: _authMethod,
      onTabSelected: (i) => setState(() => _authMethod = i),
    );
  }

  Widget _buildTestButton(bool isDark) {
    // 作为 GlassScaffold.bottomBar：背景外观由玻璃系统提供，这里只放按钮内容。
    // 亮色渐变上用深色文字，暗色渐变上用白色文字，保证对比度。
    final fg = _textPrimary(isDark);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: MiraButton.loading(
        onPressed: _testConnection,
        loading: _isTesting || _isSaving,
        expanded: true,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_tethering, color: fg),
            SizedBox(width: 8),
            Text(
              'server.testConnection'.tr(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 测试连接时用于区分"输入校验失败"与"网络/鉴权失败"的异常。
class _TestConnectionException implements Exception {
  final String message;
  const _TestConnectionException(this.message);
  @override
  String toString() => message;
}
