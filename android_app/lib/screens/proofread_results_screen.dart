import 'package:flutter/material.dart';
import '../models/manuscript.dart';

class ProofreadResultsScreen extends StatefulWidget {
  const ProofreadResultsScreen({
    super.key,
    required this.title,
    required this.originalContent,
    required this.currentContent,
    required this.issues,
    required this.summaryNote,
    required this.onApplyChanges,
  });

  final String title;
  final String originalContent;
  final String currentContent;
  final List<ProofreadIssue> issues;
  final String summaryNote;
  final void Function(String updatedContent, List<ProofreadIssue> updatedIssues)
      onApplyChanges;

  @override
  State<ProofreadResultsScreen> createState() => _ProofreadResultsScreenState();
}

class _ProofreadResultsScreenState extends State<ProofreadResultsScreen>
    with SingleTickerProviderStateMixin {
  late String _workingContent;
  late List<ProofreadIssue> _issues;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _workingContent = widget.currentContent;
    _issues = List<ProofreadIssue>.from(widget.issues);
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _acceptIssue(int index) {
    final issue = _issues[index];
    if (issue.status == IssueStatus.accepted) return;
    setState(() {
      if (issue.original.isNotEmpty && _workingContent.contains(issue.original)) {
        _workingContent =
            _workingContent.replaceFirst(issue.original, issue.suggestion);
      }
      _issues[index] = issue.copyWith(status: IssueStatus.accepted);
    });
    widget.onApplyChanges(_workingContent, _issues);
  }

  void _rejectIssue(int index) {
    final issue = _issues[index];
    setState(() {
      if (issue.status == IssueStatus.accepted &&
          issue.suggestion.isNotEmpty &&
          _workingContent.contains(issue.suggestion)) {
        _workingContent =
            _workingContent.replaceFirst(issue.suggestion, issue.original);
      }
      _issues[index] = issue.copyWith(status: IssueStatus.rejected);
    });
    widget.onApplyChanges(_workingContent, _issues);
  }

  void _acceptAll() {
    var nextText = _workingContent;
    final nextIssues = <ProofreadIssue>[];
    for (final issue in _issues) {
      if (issue.status == IssueStatus.pending) {
        if (issue.original.isNotEmpty && nextText.contains(issue.original)) {
          nextText = nextText.replaceFirst(issue.original, issue.suggestion);
        }
        nextIssues.add(issue.copyWith(status: IssueStatus.accepted));
      } else {
        nextIssues.add(issue);
      }
    }
    setState(() {
      _workingContent = nextText;
      _issues = nextIssues;
    });
    widget.onApplyChanges(_workingContent, _issues);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('সকল অপেক্ষমাণ সংশোধনী গ্রহণ করা হয়েছে।')),
    );
  }

  Future<void> _restoreOriginal() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('মূল লেখা ফিরিয়ে আনবেন?'),
        content: const Text(
          'সব গৃহীত সংশোধনী বাতিল করে মূল পান্ডুলিপি ফিরিয়ে আনা হবে।',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('ফিরিয়ে আনুন'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      _workingContent = widget.originalContent;
      _issues =
          _issues.map((e) => e.copyWith(status: IssueStatus.pending)).toList();
    });
    widget.onApplyChanges(_workingContent, _issues);
  }

  Color _severityColor(IssueSeverity s) {
    switch (s) {
      case IssueSeverity.definite:
        return const Color(0xFFC62828);
      case IssueSeverity.warning:
        return const Color(0xFFB45309);
      case IssueSeverity.style:
        return const Color(0xFF1D4ED8);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pendingCount =
        _issues.where((e) => e.status == IssueStatus.pending).length;
    final acceptedCount =
        _issues.where((e) => e.status == IssueStatus.accepted).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('প্রুফরিডিং ফলাফল'),
        actions: [
          if (pendingCount > 0)
            TextButton(
              onPressed: _acceptAll,
              child: const Text('সব গ্রহণ'),
            ),
          IconButton(
            tooltip: 'মূল লেখা ফিরিয়ে আনুন',
            onPressed: _restoreOriginal,
            icon: const Icon(Icons.restore_rounded),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'সংশোধনী (${toBanglaDigits(_issues.length)})'),
            const Tab(text: 'মূল বনাম সংশোধিত'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSuggestionsTab(theme, pendingCount, acceptedCount),
          _buildComparisonTab(theme),
        ],
      ),
    );
  }

  Widget _buildSuggestionsTab(
    ThemeData theme,
    int pendingCount,
    int acceptedCount,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.title, style: theme.textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(widget.summaryNote, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 10),
                Text(
                  'মোট: ${toBanglaDigits(_issues.length)} • গৃহীত: ${toBanglaDigits(acceptedCount)} • অপেক্ষমাণ: ${toBanglaDigits(pendingCount)}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (_issues.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(Icons.verified_rounded,
                      size: 42, color: theme.colorScheme.primary),
                  const SizedBox(height: 10),
                  Text('কোনো উল্লেখযোগ্য ভুল পাওয়া যায়নি!',
                      style: theme.textTheme.titleMedium),
                  const SizedBox(height: 4),
                  const Text(
                    'আপনার পান্ডুলিপির বানান, যতিচিহ্ন এবং বাক্যগঠন অত্যন্ত শুদ্ধ রয়েছে।',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ...List.generate(_issues.length, (idx) {
            final issue = _issues[idx];
            final color = _severityColor(issue.severity);
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              issue.category,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: color,
                              ),
                            ),
                          ),
                          if (issue.status != IssueStatus.pending)
                            Text(
                              issue.status == IssueStatus.accepted
                                  ? 'গৃহীত'
                                  : 'প্রত্যাখ্যাত',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: issue.status == IssueStatus.accepted
                                    ? const Color(0xFF1B7A4E)
                                    : theme.colorScheme.outline,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              issue.original,
                              style: TextStyle(
                                color: color,
                                decoration: TextDecoration.lineThrough,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const Icon(Icons.arrow_forward_rounded, size: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1B7A4E).withOpacity(0.14),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              issue.suggestion,
                              style: const TextStyle(
                                color: Color(0xFF1B7A4E),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        issue.explanation,
                        style: theme.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: issue.status == IssueStatus.accepted
                                  ? null
                                  : () => _acceptIssue(idx),
                              icon: const Icon(Icons.check_rounded, size: 18),
                              label: const Text('গ্রহণ করুন'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: issue.status == IssueStatus.rejected
                                  ? null
                                  : () => _rejectIssue(idx),
                              icon: const Icon(Icons.close_rounded, size: 18),
                              label: const Text('প্রত্যাখ্যান'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildComparisonTab(ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'মূল পান্ডুলিপি (অপরিবর্তিত)',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: const Color(0xFFC62828),
                  ),
                ),
                const Divider(height: 20),
                SelectableText(
                  widget.originalContent,
                  style: theme.textTheme.bodyLarge,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'সংশোধিত পান্ডুলিপি',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: const Color(0xFF1B7A4E),
                  ),
                ),
                const Divider(height: 20),
                SelectableText(
                  _workingContent,
                  style: theme.textTheme.bodyLarge,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
