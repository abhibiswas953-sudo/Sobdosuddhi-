import 'package:flutter/material.dart';
import '../models/manuscript.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    super.key,
    required this.preferences,
    required this.onUpdatePreferences,
  });

  final AppPreferences preferences;
  final Future<void> Function(AppPreferences) onUpdatePreferences;

  void _showInfoSheet(BuildContext context, String title, String body) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 12),
              Text(body, style: Theme.of(ctx).textTheme.bodyMedium),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('বন্ধ করুন'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _editAccountDialog(BuildContext context) async {
    final nameCtrl = TextEditingController(text: preferences.authorName);
    final emailCtrl = TextEditingController(text: preferences.authorEmail);

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('অ্যাকাউন্ট সেটিংস'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'লেখকের নাম'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'ইমেইল ঠিকানা'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('সংরক্ষণ'),
          ),
        ],
      ),
    );
    if (saved == true) {
      await onUpdatePreferences(
        preferences.copyWith(
          authorName:
              nameCtrl.text.trim().isEmpty ? 'লেখক' : nameCtrl.text.trim(),
          authorEmail: emailCtrl.text.trim(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('সেটিংস')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text('ডার্ক মোড'),
                  subtitle: const Text('রাতের বেলায় আরামদায়ক পাঠ ও সম্পাদনা'),
                  value: preferences.darkMode,
                  onChanged: (v) =>
                      onUpdatePreferences(preferences.copyWith(darkMode: v)),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.language_rounded),
                  title: const Text('ইন্টারফেস ভাষা'),
                  subtitle: const Text('বাংলা (প্রাথমিক)'),
                  trailing: Text(
                    'বাংলা',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('সম্পাদকের ফন্টের আকার'),
                      const SizedBox(height: 10),
                      SegmentedButton<double>(
                        segments: const [
                          ButtonSegment(value: 0.88, label: Text('ছোট')),
                          ButtonSegment(value: 1.0, label: Text('স্বাভাবিক')),
                          ButtonSegment(value: 1.15, label: Text('বড়')),
                          ButtonSegment(value: 1.30, label: Text('অতি বড়')),
                        ],
                        selected: {preferences.fontSizeScale},
                        onSelectionChanged: (sel) => onUpdatePreferences(
                          preferences.copyWith(fontSizeScale: sel.first),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.spellcheck_rounded),
                  title: const Text('বাংলা বানান রীতি'),
                  subtitle: Text(
                    preferences.spellingStandard == 'bangla_academy'
                        ? 'বাংলা একাডেমি প্রমিত বানানরীতি'
                        : 'সাহিত্যিক ও ঐতিহ্যবাহী বানান',
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {
                    final next =
                        preferences.spellingStandard == 'bangla_academy'
                            ? 'traditional'
                            : 'bangla_academy';
                    onUpdatePreferences(
                      preferences.copyWith(spellingStandard: next),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.person_outline_rounded),
                  title: const Text('অ্যাকাউন্ট সেটিংস'),
                  subtitle: Text(
                    preferences.authorEmail.isEmpty
                        ? preferences.authorName
                        : '${preferences.authorName} • ${preferences.authorEmail}',
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _editAccountDialog(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: const Text('গোপনীয়তা নীতি'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showInfoSheet(
                    context,
                    'গোপনীয়তা নীতি',
                    'আপনার সকল পান্ডুলিপি আপনার ডিভাইসে নিরাপদে সংরক্ষিত থাকে। প্রুফরিডিংয়ের সময় কেবল এনক্রিপ্টেড HTTPS সংযোগের মাধ্যমে লেখা যাচাই করা হয় এবং কোনো তৃতীয় পক্ষের সাথে ভাগ করা হয় না।',
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.info_outline_rounded),
                  title: const Text('অ্যাপ্লিকেশন সম্পর্কে'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showInfoSheet(
                    context,
                    'Sobdosuddhi 1.0',
                    'বাংলা কবি, গল্পকার, ঔপন্যাসিক ও সম্পাদকদের জন্য নির্মিত আধুনিক বাংলা সাহিত্য প্রুফরিডিং অ্যাপ। এটি মূল সাহিত্যিক ভঙ্গি, ছন্দ ও কাব্যভাষা অক্ষুণ্ণ রেখে শুদ্ধ বানান ও ব্যাকরণে সহায়তা করে।',
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.support_agent_rounded),
                  title: const Text('যোগাযোগ ও সহায়তা'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showInfoSheet(
                    context,
                    'যোগাযোগ ও সহায়তা',
                    'যেকোনো কারিগরি সহায়তা বা পরামর্শের জন্য ইমেইল করুন: support@sobdosuddhi.app',
                  ),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.verified_outlined),
                  title: Text('অ্যাপ সংস্করণ'),
                  trailing: Text(
                    '1.0.0',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
