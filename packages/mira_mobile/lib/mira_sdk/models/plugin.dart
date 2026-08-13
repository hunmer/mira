/// 插件相关模型
library;

class Plugin {
  final String id;
  final String pluginName;
  final String name;
  final String version;
  final String description;
  final String author;
  final String status; // active | inactive
  final bool configurable;
  final List<String> dependencies;
  final String main;
  final String libraryId;
  final String createdAt;
  final String updatedAt;
  final String? icon;
  final String? title;
  final String category;
  final List<String> tags;

  const Plugin({
    required this.id,
    required this.pluginName,
    required this.name,
    required this.version,
    required this.description,
    required this.author,
    required this.status,
    required this.configurable,
    required this.dependencies,
    required this.main,
    required this.libraryId,
    required this.createdAt,
    required this.updatedAt,
    this.icon,
    this.title,
    required this.category,
    required this.tags,
  });

  factory Plugin.fromJson(Map<String, dynamic> json) {
    return Plugin(
      id: json['id'].toString(),
      pluginName: json['pluginName'] as String? ?? '',
      name: json['name'] as String? ?? '',
      version: json['version'] as String? ?? '',
      description: json['description'] as String? ?? '',
      author: json['author'] as String? ?? '',
      status: json['status'] as String? ?? 'inactive',
      configurable: json['configurable'] as bool? ?? false,
      dependencies: _stringList(json['dependencies']),
      main: json['main'] as String? ?? '',
      libraryId: json['libraryId']?.toString() ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      icon: json['icon'] as String?,
      title: json['title'] as String?,
      category: json['category'] as String? ?? 'general',
      tags: _stringList(json['tags']),
    );
  }
}

class PluginsByLibrary {
  final String id;
  final String name;
  final String description;
  final List<Plugin> plugins;

  const PluginsByLibrary({
    required this.id,
    required this.name,
    required this.description,
    required this.plugins,
  });

  factory PluginsByLibrary.fromJson(Map<String, dynamic> json) {
    return PluginsByLibrary(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      plugins: _mapList(json['plugins'], Plugin.fromJson),
    );
  }
}

class InstallPluginRequest {
  final String name;
  final String? version;
  final String libraryId;

  const InstallPluginRequest({required this.name, this.version, required this.libraryId});

  Map<String, dynamic> toJson() => {
        'name': name,
        if (version != null) 'version': version,
        'libraryId': libraryId,
      };
}

/// 把动态值安全转为字符串列表（非 List 时返回空）
List<String> _stringList(dynamic value) {
  if (value is List) return value.map((e) => e.toString()).toList();
  return const [];
}

/// 把动态值安全转为指定类型的列表
List<T> _mapList<T>(dynamic value, T Function(Map<String, dynamic>) fromJson) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((e) => fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
  return const [];
}
