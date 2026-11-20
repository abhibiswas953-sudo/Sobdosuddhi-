import 'package:flutter/material.dart';
import '../models/manuscript.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.preferences,
    required this.manuscripts,
    required this.revisions,
    required this.onNewManuscript,
    required this.onOpenManuscript,
    required this.onGoToTab,
  });

  final AppPreferences preferences;
  final List<Manuscript> manuscripts;
  final List<ProofreadRevision> revisions;
  final void Function([WritingCategory]) onNewManuscript;
  final void Function(Manuscript) onOpenManuscript;
  final void Function(int) onGoToTab;

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'শুভ সকাল';
    if (hour < 17) return 'শুভ দুপুর';
    if (hour < 20) return 'শুভ সন্ধ্যা';
    return 'শুভ রাত্রি';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalWords = manuscripts.fold<int>(0, (sum, m) => sum + m.wordCount);
    final totalErrors = manuscripts.fold<int>(0, (sum, m) => sum + m.errorCount);
    final recent = manuscripts.take(5).toList();

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.asset(
                        'assets/icon/app_icon.png',
                        width: 40,
                        height: 40,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Sobdosuddhi 1.0',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontSize: 17,
                            ),
                          ),
                          Text(
                            'বাংলা লেখার নির্ভরযোগ্য প্রুফরিডার।',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => onGoToTab(4),
                      tooltip: 'সেটিংস',
                      icon: const Icon(Icons.tune_rounded),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        theme.colorScheme.primary,
                        theme.colorScheme.primary.withOpacity(0.84),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_greeting()}, ${preferences.authorName}',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          color: Colors.white,
                          fontSize: 21,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'কবিতা, গল্প কিংবা উপন্যাসের মূল সাহিত্যিক ভঙ্গি অক্ষুণ্ণ রেখে শুদ্ধ বানান ও ব্যাকরণ যাচাই করুন।',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withOpacity(0.9),
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF1E4D3B),
                          ),
                          onPressed: () => onNewManuscript(),
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('নতুন পান্ডুলিপি প্রুফরিড করুন'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('দ্রুত প্রুফরিডিং টুল',
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _QuickToolCard(
                            icon: Icons.auto_awesome_rounded,
                            title: 'বাংলা কবিতা',
                            subtitle: 'ছন্দ ও কাব্যভাষা সুরক্ষিত',
                            onTap: () =>
                                onNewManuscript(WritingCategory.poetry),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _QuickToolCard(
                            icon: Icons.menu_book_rounded,
                            title: 'বাংলা গল্প ও উপন্যাস',
                            subtitle: 'বানান, যতি ও বাক্যগঠন',
                            onTap: () => onNewManuscript(WritingCategory.prose),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ব্যবহারের পরিসংখ্যান',
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 10),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.1,
                      children: [
                        _StatTile(
                          label: 'সংরক্ষিত পান্ডুলিপি',
                          value: toBanglaDigits(manuscripts.length),
                          icon: Icons.description_outlined,
                        ),
                        _StatTile(
                          label: 'মোট শব্দ যাচাই',
                          value: toBanglaDigits(totalWords),
                          icon: Icons.text_fields_rounded,
                        ),
                        _StatTile(
                          label: 'চিহ্নিত ভুল',
                          value: toBanglaDigits(totalErrors),
                          icon: Icons.fact_check_outlined,
                        ),
                        _StatTile(
                          label: 'প্রুফরিড ইতিহাস',
                          value: toBanglaDigits(revisions.length),
                          icon: Icons.history_rounded,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => onGoToTab(2),
                        icon: const Icon(Icons.folder_outlined, size: 18),
                        label: const Text('আমার পান্ডুলিপি'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => onGoToTab(3),
                        icon: const Icon(Icons.history_rounded, size: 18),
                        label: const Text('প্রুফরিডিং ইতিহাস'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('সাম্প্রতিক ডকুমেন্ট',
                        style: theme.textTheme.titleMedium),
                    if (manuscripts.isNotEmpty)
                      TextButton(
                        onPressed: () => onGoToTab(2),
                        child: const Text('সব দেখুন'),
                      ),
                  ],
                ),
              ),
            ),
            if (recent.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Icon(
                            Icons.edit_document,
                            size: 40,
                            color: theme.colorScheme.primary.withOpacity(0.6),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'এখনো কোনো পান্ডুলিপি সংরক্ষিত নেই',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'নতুন লেখা শুরু করুন অথবা ডিভাইস থেকে DOCX, PDF বা TXT ফাইল আপলোড করুন।',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            else
              SliverList.builder(
                itemCount: recent.length,
                itemBuilder: (context, index) {
                  final item = recent[index];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
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
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => onOpenManuscript(item),
                      ),
                    ),
                  );
                },
              ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
          ],
        ),
      ),
    );
  }
}

class _QuickToolCard extends StatelessWidget {
  const _QuickToolCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
                child: Icon(icon, size: 20, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    value,
                    style: theme.textTheme.titleLarge?.copyWith(fontSize: 18),
                  ),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
