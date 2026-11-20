import 'package:flutter/material.dart';
import '../models/manuscript.dart';
import '../services/export_service.dart';

class MyManuscriptsScreen extends StatefulWidget {
  const MyManuscriptsScreen({
    super.key,
    required this.manuscripts,
    required this.exporter,
    required this.onOpenManuscript,
    required this.onCreateNew,
    required this.onRenameManuscript,
    required this.onDeleteManuscript,
  });

  final List<Manuscript> manuscripts;
  final ExportService exporter;
  final void Function(Manuscript) onOpenManuscript;
  final VoidCallback onCreateNew;
  final Future<void> Function(Manuscript, String) onRenameManuscript;
  final Future<void> Function(String) onDeleteManuscript;

  @override
  State<MyManuscriptsScreen> createState() => _MyManuscriptsScreenState();
}

class _MyManuscriptsScreenState extends State<MyManuscriptsScreen> {
  String _search = '';
  bool _newestFirst = true;

  Future<void> _showRenameDialog(Manuscript item) async {
    final controller = TextEditingController(text: item.title);
    final updated = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('নাম পরিবর্তন করুন'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'নতুন শিরোনাম লিখুন'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('সংরক্ষণ'),
          ),
        ],
      ),
    );
    if (updated != null && updated.isNotEmpty) {
      await widget.onRenameManuscript(item, updated);
    }
  }

  Future<void> _confirmDelete(Manuscript item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('পান্ডুলিপি মুছে ফেলবেন?'),
        content: Text(
          '"${item.title}" স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি ফিরিয়ে নেওয়া যাবে না।',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('না'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('মুছে ফেলুন'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await widget.onDeleteManuscript(item.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filtered = widget.manuscripts.where((m) {
      if (_search.trim().isEmpty) return true;
      final q = _search.trim().toLowerCase();
      return m.title.toLowerCase().contains(q) ||
          m.currentContent.toLowerCase().contains(q);
    }).toList();

    filtered.sort(
      (a, b) => _newestFirst
          ? b.updatedAt.compareTo(a.updatedAt)
          : a.updatedAt.compareTo(b.updatedAt),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('আমার পান্ডুলিপি'),
        actions: [
          IconButton(
            tooltip: _newestFirst ? 'পুরনো আগে দেখুন' : 'নতুন আগে দেখুন',
            onPressed: () => setState(() => _newestFirst = !_newestFirst),
            icon: Icon(
              _newestFirst
                  ? Icons.arrow_downward_rounded
                  : Icons.arrow_upward_rounded,
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: widget.onCreateNew,
        icon: const Icon(Icons.add_rounded),
        label: const Text('নতুন লেখা'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search_rounded),
                hintText: 'পান্ডুলিপি খুঁজুন...',
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        _search.isEmpty
                            ? 'কোনো সংরক্ষিত পান্ডুলিপি নেই।'
                            : 'আপনার অনুসন্ধানের সাথে কোনো পান্ডুলিপি মেলেনি।',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final item = filtered[idx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Card(
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            onTap: () => widget.onOpenManuscript(item),
                            title: Text(
                              item.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium,
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                '${item.category.label} • ${toBanglaDigits(item.wordCount)} শব্দ • ${formatBanglaDate(item.updatedAt)}',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            trailing: PopupMenuButton<String>(
                              onSelected: (action) {
                                switch (action) {
                                  case 'open':
                                    widget.onOpenManuscript(item);
                                    break;
                                  case 'rename':
                                    _showRenameDialog(item);
                                    break;
                                  case 'share':
                                    widget.exporter.sharePlainText(
                                      title: item.title,
                                      content: item.currentContent,
                                    );
                                    break;
                                  case 'delete':
                                    _confirmDelete(item);
                                    break;
                                }
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'open',
                                  child: Text('খুলুন ও সম্পাদনা করুন'),
                                ),
                                PopupMenuItem(
                                  value: 'rename',
                                  child: Text('নাম পরিবর্তন'),
                                ),
                                PopupMenuItem(
                                  value: 'share',
                                  child: Text('শেয়ার করুন'),
                                ),
                                PopupMenuItem(
                                  value: 'delete',
                                  child: Text('মুছে ফেলুন'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
