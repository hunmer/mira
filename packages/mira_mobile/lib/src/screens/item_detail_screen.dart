
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../widgets/glass/mira_ui.dart';

class ItemDetailScreen extends StatelessWidget {
  const ItemDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        leading: MiraIconButton(
          icon: Icon(Icons.arrow_back_ios_new,
              color: isDark ? Colors.white : Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('itemDetail.title'.tr()),
      ),
      body: Material(
        type: MaterialType.transparency,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0).copyWith(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildImageSection(),
              const SizedBox(height: 24),
              _buildTagsSection(),
              const SizedBox(height: 24),
              _buildFolderSection(),
              const SizedBox(height: 24),
              _buildInfoSection(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImageSection() {
    return Center(
      child: Container(
        width: 300,
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          image: const DecorationImage(
            image: NetworkImage(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDpjoXC4Z8SPi1t3few8uWeZX3WmoThul0kQNbVfY_Vf0H8cBAD943_gZZXWcLY0k-VKDAEaY6dUJEm6XGWo_0Zcm3JKSI0eTDuUbBLjtZ8GckkZIdyPMwbp550BA38IljGltT30mhg2oRq6y3XuK5d2tq11H3aoFVCbR75IVEdu5EXIoBeFYZT6bvWge7vGXIRkU5Eq83K0X4FwaX01kNMbRC25zXH924M7lwGHp1ogXRjR1jx79soYjJjLC4n-nnhlZCq19yH7w'),
            fit: BoxFit.cover,
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'png',
                  style: TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
            ),
            Positioned(
              bottom: 8,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildColorDot(Colors.grey[800]!),
                  _buildColorDot(Colors.pink[100]!),
                  _buildColorDot(Colors.brown[400]!),
                  _buildColorDot(Colors.blue),
                  _buildColorDot(Colors.teal[300]!),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildColorDot(Color color) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
    );
  }

  Widget _buildTagsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'itemDetail.tags'.tr(),
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        MiraChip(
          icon: const Icon(Icons.add),
          label: 'itemDetail.setTags'.tr(),
          onTap: () {
            // TODO: Implement tag setting
          },
        ),
      ],
    );
  }

  Widget _buildFolderSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'itemDetail.folder'.tr(),
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.folder, color: Colors.blue),
              const SizedBox(width: 12),
              Text('itemDetail.folderN'.tr(namedArgs: {'n': '2'})),
              const Spacer(),
              MiraButton(
                onPressed: () {
                  // TODO: Implement folder editing
                },
                child: Text('common.edit'.tr()),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'itemDetail.basicInfo'.tr(),
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            MiraButton(
              onPressed: () {
                // TODO: Implement view details
              },
              child: Text('itemDetail.viewDetails'.tr()),
            )
          ],
        ),
        const SizedBox(height: 8),
        _buildInfoRow(isDark, 'itemDetail.size'.tr(), 'itemDetail.unknown'.tr()),
        _buildInfoRow(isDark, 'itemDetail.modifiedDate'.tr(), '2025/07/23 21:06'),
        _buildInfoRow(isDark, 'itemDetail.createdDate'.tr(), '2025/07/16 11:01'),
        _buildInfoRow(isDark, 'itemDetail.dimensions'.tr(), 'x'),
      ],
    );
  }

  Widget _buildInfoRow(bool isDark, String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title,
              style: TextStyle(
                  color: isDark ? Colors.white54 : Colors.black54)),
          Text(value),
        ],
      ),
    );
  }
}
