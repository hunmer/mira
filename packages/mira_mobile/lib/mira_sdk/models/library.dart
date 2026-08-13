/// 素材库相关模型
library;

/// 素材库（/api/libraries 数组元素；该接口无外层包裹，直接是数组）
class Library {
  final String id;
  final String name;
  final String path;
  final String status; // active | inactive | error
  final int fileCount;
  final int size;
  final String description;
  final String createdAt;
  final String updatedAt;
  final String? icon;
  final Map<String, dynamic>? customFields;
  final String? pluginsDir;
  final List<String>? allowedRoles;

  const Library({
    required this.id,
    required this.name,
    required this.path,
    required this.status,
    required this.fileCount,
    required this.size,
    required this.description,
    required this.createdAt,
    required this.updatedAt,
    this.icon,
    this.customFields,
    this.pluginsDir,
    this.allowedRoles,
  });

  factory Library.fromJson(Map<String, dynamic> json) {
    return Library(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      path: json['path'] as String? ?? '',
      status: json['status'] as String? ?? 'inactive',
      fileCount: (json['fileCount'] as num?)?.toInt() ?? 0,
      size: (json['size'] as num?)?.toInt() ?? 0,
      description: json['description'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      icon: json['icon'] as String?,
      customFields: json['customFields'] as Map<String, dynamic>?,
      pluginsDir: json['pluginsDir'] as String?,
      allowedRoles: (json['allowedRoles'] as List<dynamic>?)?.map((e) => e as String).toList(),
    );
  }
}

class CreateLibraryRequest {
  final String name;
  final String path;
  final String description;
  final String? icon;
  final Map<String, dynamic>? customFields;
  final String? pluginsDir;
  final List<String>? allowedRoles;

  const CreateLibraryRequest({
    required this.name,
    required this.path,
    required this.description,
    this.icon,
    this.customFields,
    this.pluginsDir,
    this.allowedRoles,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'path': path,
        'description': description,
        if (icon != null) 'icon': icon,
        if (customFields != null) 'customFields': customFields,
        if (pluginsDir != null) 'pluginsDir': pluginsDir,
        if (allowedRoles != null) 'allowedRoles': allowedRoles,
      };
}

class UpdateLibraryRequest {
  final String? name;
  final String? description;
  final Map<String, dynamic>? customFields;
  final List<String>? allowedRoles;

  const UpdateLibraryRequest({this.name, this.description, this.customFields, this.allowedRoles});

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (name != null) m['name'] = name;
    if (description != null) m['description'] = description;
    if (customFields != null) m['customFields'] = customFields;
    if (allowedRoles != null) m['allowedRoles'] = allowedRoles;
    return m;
  }
}
