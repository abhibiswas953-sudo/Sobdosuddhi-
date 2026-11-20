import 'package:flutter/material.dart';
import '../models/manuscript.dart';
import '../services/export_service.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({
    super.key,
    required this.revisions,
    required this.exporter,
  });

  final List<ProofreadRevision> revisions;
  final ExportService exporter;

  void _showRevisionPreview(BuildContext context, ProofreadRevision rev) {
    final theme = Theme.of(context);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(rev.manuscriptTitle, style: theme.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(
                '${rev.category.label} • ${toBanglaDigits(rev.wordCount)} শব্দ • ${toBanglaDigits(rev.totalIssues)}টি পরামর্শ • ${formatBanglaDate(rev.createdAt)}',
                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
              const Divider(height: 24),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: SelectableText(
                    rev.contentSnapshot,
                    style: theme.textTheme.bodyLarge,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    exporter.sharePlainText(
                      title: rev.manuscriptTitle,
                      content: rev.contentSnapshot,
                    );
                  },
                  icon: const Icon(Icons.share_rounded),
                  label: const Text('এই সংস্করণটি শেয়ার করুন'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('ইতিহাস')),
      body: revisions.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.history_toggle_off_rounded,
                      size: 44,
                      color: theme.colorScheme.primary.withOpacity(0.5),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'এখনো কোনো প্রুফরিডিং ইতিহাস নেই।',
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: revisions.length,
              itemBuilder: (context, idx) {
                final rev = revisions[idx];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      title: Text(
                        rev.manuscriptTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium,
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${rev.category.label} • ${toBanglaDigits(rev.totalIssues)}টি পরামর্শ • ${formatBanglaDate(rev.createdAt)}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontSize: 12,
                          ),
                        ),
                      ),
                      trailing: const Icon(Icons.visibility_outlined),
                      onTap: () => _showRevisionPreview(context, rev),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
