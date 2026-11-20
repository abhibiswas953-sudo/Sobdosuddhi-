import 'dart:async';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/manuscript.dart';
import '../services/api_service.dart';
import '../services/export_service.dart';
import 'proofread_results_screen.dart';

class EditorScreen extends StatefulWidget {
  const EditorScreen({
    super.key,
    required this.api,
    required this.exporter,
    required this.preferences,
    required this.initialCategory,
    required this.isOffline,
    required this.onSaveManuscript,
    required this.onAddRevision,
    this.initialManuscript,
  });

  final ApiService api;
  final ExportService exporter;
  final AppPreferences preferences;
  final Manuscript? initialManuscript;
  final WritingCategory initialCategory;
  final bool isOffline;
  final Future<void> Function(Manuscript) onSaveManuscript;
  final Future<void> Function(ProofreadRevision) onAddRevision;

  @override
  State<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends State<EditorScreen> {
  late String _id;
  late DateTime _createdAt;
  late WritingCategory _category;
  late final TextEditingController _titleController;
  late final TextEditingController _contentController;

  String _originalContent = '';
  List<ProofreadIssue> _issues = [];
  String _summaryNote = '';

  // Undo / Redo stacks
  final List<String> _undoStack = [];
  final List<String> _redoStack = [];
  bool _suppressHistory = false;

  // File upload state
  String? _selectedFileName;
  int? _selectedFileSize;
  double _uploadProgress = 0;
  bool _isUploading = false;

  // Proofreading & auto-save state
  bool _isProofreading = false;
  bool _isExporting = false;
  String _saveStatus = '';
  Timer? _autoSaveTimer;

  // Find & Replace
  bool _showFindReplace = false;
  final TextEditingController _findController = TextEditingController();
  final TextEditingController _replaceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final m = widget.initialManuscript;
    _id = m?.id ?? 'ms_${DateTime.now().millisecondsSinceEpoch}';
    _createdAt = m?.createdAt ?? DateTime.now();
    _category = m?.category ?? widget.initialCategory;
    _titleController = TextEditingController(text: m?.title ?? '');
    _contentController = TextEditingController(text: m?.currentContent ?? '');
    _originalContent = m?.originalContent ?? '';
    _issues = List<ProofreadIssue>.from(m?.issues ?? []);
    _summaryNote = m?.summaryNote ?? '';
    _selectedFileName = m?.sourceFileName;
    _undoStack.add(_contentController.text);

    _contentController.addListener(_onTextChanged);
    _titleController.addListener(_scheduleAutoSave);
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    _titleController.dispose();
    _contentController.dispose();
    _findController.dispose();
    _replaceController.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    if (!_suppressHistory) {
      final text = _contentController.text;
      if (_undoStack.isEmpty || _undoStack.last != text) {
        _undoStack.add(text);
        if (_undoStack.length > 50) _undoStack.removeAt(0);
        _redoStack.clear();
      }
    }
    _scheduleAutoSave();
    if (mounted) setState(() {});
  }

  void _scheduleAutoSave() {
    _autoSaveTimer?.cancel();
    if (_contentController.text.trim().isEmpty &&
        _titleController.text.trim().isEmpty) {
      return;
    }
    _autoSaveTimer = Timer(const Duration(milliseconds: 1200), () {
      _persistManuscript(silent: true);
    });
  }

  Future<Manuscript> _persistManuscript({bool silent = false}) async {
    final text = _contentController.text;
    final title = _titleController.text.trim().isEmpty
        ? 'শিরোনামহীন পান্ডুলিপি'
        : _titleController.text.trim();
    if (_originalContent.isEmpty && text.isNotEmpty) {
      _originalContent = text;
    }

    final item = Manuscript(
      id: _id,
      title: title,
      category: _category,
      originalContent: _originalContent.isEmpty ? text : _originalContent,
      currentContent: text,
      wordCount: countWords(text),
      errorCount: _issues.length,
      issues: _issues,
      createdAt: _createdAt,
      updatedAt: DateTime.now(),
      summaryNote: _summaryNote,
      sourceFileName: _selectedFileName,
    );

    await widget.onSaveManuscript(item);
    if (mounted) {
      setState(() => _saveStatus = 'স্বয়ংক্রিয়ভাবে সংরক্ষিত');
      if (!silent) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('পান্ডুলিপি সংরক্ষণ করা হয়েছে।')),
        );
      }
    }
    return item;
  }

  void _undo() {
    if (_undoStack.length <= 1) return;
    _suppressHistory = true;
    final current = _undoStack.removeLast();
    _redoStack.add(current);
    _contentController.text = _undoStack.last;
    _contentController.selection = TextSelection.fromPosition(
      TextPosition(offset: _contentController.text.length),
    );
    _suppressHistory = false;
    setState(() {});
  }

  void _redo() {
    if (_redoStack.isEmpty) return;
    _suppressHistory = true;
    final next = _redoStack.removeLast();
    _undoStack.add(next);
    _contentController.text = next;
    _contentController.selection = TextSelection.fromPosition(
      TextPosition(offset: _contentController.text.length),
    );
    _suppressHistory = false;
    setState(() {});
  }

  void _replaceAllOccurrences() {
    final query = _findController.text;
    if (query.isEmpty) return;
    final replacement = _replaceController.text;
    final current = _contentController.text;
    if (!current.contains(query)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('খোঁজা শব্দটি পাওয়া যায়নি।')),
      );
      return;
    }
    _contentController.text = current.replaceAll(query, replacement);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('সকল মিলিত শব্দ প্রতিস্থাপিত হয়েছে।')),
    );
  }

  Future<void> _pickAndUploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['docx', 'doc', 'pdf', 'txt'],
      );
      if (result == null || result.files.isEmpty) return;
      final picked = result.files.single;
      if (picked.path == null) return;

      final file = File(picked.path!);
      setState(() {
        _selectedFileName = picked.name;
        _selectedFileSize = picked.size;
        _isUploading = true;
        _uploadProgress = 0.1;
      });

      final ext = picked.extension?.toLowerCase() ?? '';
      if (ext == 'txt') {
        final content = await file.readAsString();
        if (!mounted) return;
        setState(() {
          _uploadProgress = 1.0;
          _isUploading = false;
          _originalContent = content;
        });
        _contentController.text = content;
        if (_titleController.text.trim().isEmpty) {
          _titleController.text =
              picked.name.replaceAll(RegExp(r'\.[^.]+$'), '');
        }
        await _persistManuscript(silent: true);
        return;
      }

      if (widget.isOffline) {
        throw Exception(
          'DOCX, DOC বা PDF ফাইল পড়তে ইন্টারনেট সংযোগ প্রয়োজন।',
        );
      }

      final parsed = await widget.api.uploadAndParseFile(
        file: file,
        fileName: picked.name,
        onProgress: (p) {
          if (mounted) setState(() => _uploadProgress = p);
        },
      );

      if (!mounted) return;
      setState(() {
        _isUploading = false;
        _originalContent = parsed.text;
      });
      _contentController.text = parsed.text;
      if (_titleController.text.trim().isEmpty) {
        _titleController.text =
            picked.name.replaceAll(RegExp(r'\.[^.]+$'), '');
      }
      await _persistManuscript(silent: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'ফাইল লোড হয়েছে (${toBanglaDigits(parsed.wordCount)} শব্দ)।',
            ),
          ),
        );
      }
    } catch (err) {
      if (!mounted) return;
      setState(() => _isUploading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            err.toString().replaceFirst('Exception: ', ''),
          ),
        ),
      );
    }
  }

  void _cancelUpload() {
    widget.api.cancelActiveUpload();
    setState(() {
      _isUploading = false;
      _uploadProgress = 0;
    });
  }

  void _removeSelectedFile() {
    setState(() {
      _selectedFileName = null;
      _selectedFileSize = null;
      _uploadProgress = 0;
    });
  }

  Future<void> _runProofread() async {
    final text = _contentController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('অনুগ্রহ করে প্রথমে কিছু বাংলা লেখা যুক্ত করুন।'),
        ),
      );
      return;
    }
    if (widget.isOffline) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('প্রুফরিডিংয়ের জন্য ইন্টারনেট সংযোগ প্রয়োজন।'),
        ),
      );
      return;
    }

    setState(() => _isProofreading = true);
    try {
      final result = await widget.api.proofread(
        text: text,
        category: _category,
        spellingStandard: widget.preferences.spellingStandard,
        strictness: widget.preferences.strictness,
      );
      if (!mounted) return;
      setState(() {
        _originalContent = text;
        _issues = result.issues;
        _summaryNote = result.summaryNote;
        _isProofreading = false;
      });
      final saved = await _persistManuscript(silent: true);
      await widget.onAddRevision(
        ProofreadRevision(
          id: 'rev_${DateTime.now().millisecondsSinceEpoch}',
          manuscriptId: saved.id,
          manuscriptTitle: saved.title,
          category: saved.category,
          contentSnapshot: saved.currentContent,
          wordCount: saved.wordCount,
          totalIssues: _issues.length,
          acceptedCount: 0,
          rejectedCount: 0,
          createdAt: DateTime.now(),
        ),
      );
      if (!mounted) return;
      _openResultsScreen();
    } catch (err) {
      if (!mounted) return;
      setState(() => _isProofreading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err.toString().replaceFirst('Exception: ', '')),
        ),
      );
    }
  }

  void _openResultsScreen() {
    final title = _titleController.text.trim().isEmpty
        ? 'শিরোনামহীন পান্ডুলিপি'
        : _titleController.text.trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProofreadResultsScreen(
          title: title,
          originalContent: _originalContent.isEmpty
              ? _contentController.text
              : _originalContent,
          currentContent: _contentController.text,
          issues: _issues,
          summaryNote: _summaryNote,
          onApplyChanges: (updatedContent, updatedIssues) {
            setState(() {
              _issues = updatedIssues;
              _contentController.text = updatedContent;
            });
            _persistManuscript(silent: true);
          },
        ),
      ),
    );
  }

  void _showExportSheet() {
    final title = _titleController.text.trim().isEmpty
        ? 'শিরোনামহীন পান্ডুলিপি'
        : _titleController.text.trim();
    final content = _contentController.text;
    if (content.trim().isEmpty) return;

    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('DOCX হিসেবে ডাউনলোড ও শেয়ার'),
              subtitle: const Text('মাইক্রোসফট ওয়ার্ড ডকুমেন্ট (.docx)'),
              onTap: () async {
                Navigator.pop(ctx);
                await _runExport(() => widget.exporter.exportDocx(
                      title: title,
                      categoryLabel: _category.label,
                      content: content,
                    ));
              },
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('PDF হিসেবে ডাউনলোড ও শেয়ার'),
              subtitle: const Text('বাংলা ইউনিকোড প্রিন্ট-রেডি পিডিএফ'),
              onTap: () async {
                Navigator.pop(ctx);
                await _runExport(() => widget.exporter.exportPdf(
                      title: title,
                      categoryLabel: _category.label,
                      content: content,
                    ));
              },
            ),
            ListTile(
              leading: const Icon(Icons.text_snippet_outlined),
              title: const Text('TXT ফাইল হিসেবে শেয়ার'),
              subtitle: const Text('সাধারণ ইউনিকোড টেক্সট (.txt)'),
              onTap: () async {
                Navigator.pop(ctx);
                await _runExport(() => widget.exporter.exportTxt(
                      title: title,
                      content: content,
                    ));
              },
            ),
            ListTile(
              leading: const Icon(Icons.share_rounded),
              title: const Text('সরাসরি শেয়ার করুন'),
              subtitle: const Text('হোয়াটসঅ্যাপ, ইমেইল বা অন্য অ্যাপে পাঠান'),
              onTap: () async {
                Navigator.pop(ctx);
                await widget.exporter.sharePlainText(
                  title: title,
                  content: content,
                );
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _runExport(Future<File> Function() task) async {
    setState(() => _isExporting = true);
    try {
      await task();
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = _contentController.text;
    final words = countWords(text);
    final chars = text.length;
    final paragraphs = countParagraphs(text);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('নতুন লেখা'),
            if (_saveStatus.isNotEmpty)
              Text(
                _saveStatus,
                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'পূর্বাবস্থা (Undo)',
            onPressed: _undoStack.length > 1 ? _undo : null,
            icon: const Icon(Icons.undo_rounded),
          ),
          IconButton(
            tooltip: 'পুনরায় (Redo)',
            onPressed: _redoStack.isNotEmpty ? _redo : null,
            icon: const Icon(Icons.redo_rounded),
          ),
          IconButton(
            tooltip: 'খুঁজুন ও বদলান',
            onPressed: () =>
                setState(() => _showFindReplace = !_showFindReplace),
            icon: const Icon(Icons.find_replace_rounded),
          ),
          IconButton(
            tooltip: 'কপি করুন',
            onPressed: text.isEmpty
                ? null
                : () {
                    Clipboard.setData(ClipboardData(text: text));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('লেখা কপি করা হয়েছে।')),
                    );
                  },
            icon: const Icon(Icons.copy_rounded),
          ),
          IconButton(
            tooltip: 'এক্সপোর্ট ও শেয়ার',
            onPressed:
                (_isExporting || text.isEmpty) ? null : _showExportSheet,
            icon: _isExporting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.ios_share_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                children: [
                  TextField(
                    controller: _titleController,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      hintText: 'পান্ডুলিপির শিরোনাম লিখুন...',
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: SegmentedButton<WritingCategory>(
                          segments: const [
                            ButtonSegment(
                              value: WritingCategory.poetry,
                              label: Text('বাংলা কবিতা'),
                            ),
                            ButtonSegment(
                              value: WritingCategory.prose,
                              label: Text('গল্প ও উপন্যাস'),
                            ),
                          ],
                          selected: {_category},
                          onSelectionChanged: (sel) {
                            setState(() => _category = sel.first);
                            _scheduleAutoSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.upload_file_rounded, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _selectedFileName == null
                                      ? 'ডিভাইস থেকে ফাইল আপলোড (DOCX, DOC, PDF, TXT)'
                                      : '$_selectedFileName ${_selectedFileSize != null ? "(${formatFileSize(_selectedFileSize!)})" : ""}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              if (_isUploading)
                                TextButton(
                                  onPressed: _cancelUpload,
                                  child: const Text('বাতিল'),
                                )
                              else if (_selectedFileName != null)
                                IconButton(
                                  tooltip: 'ফাইল সরান',
                                  onPressed: _removeSelectedFile,
                                  icon: const Icon(Icons.close_rounded,
                                      size: 18),
                                )
                              else
                                TextButton(
                                  onPressed: _pickAndUploadFile,
                                  child: const Text('নির্বাচন'),
                                ),
                            ],
                          ),
                          if (_isUploading) ...[
                            const SizedBox(height: 8),
                            LinearProgressIndicator(value: _uploadProgress),
                          ],
                        ],
                      ),
                    ),
                  ),
                  if (_showFindReplace) ...[
                    const SizedBox(height: 10),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _findController,
                                    decoration: const InputDecoration(
                                      hintText: 'খুঁজুন...',
                                      isDense: true,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    controller: _replaceController,
                                    decoration: const InputDecoration(
                                      hintText: 'প্রতিস্থাপন...',
                                      isDense: true,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: FilledButton.tonal(
                                onPressed: _replaceAllOccurrences,
                                child: const Text('সব প্রতিস্থাপন করুন'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  TextField(
                    controller: _contentController,
                    maxLines: null,
                    minLines: 12,
                    keyboardType: TextInputType.multiline,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontSize: 16 * widget.preferences.fontSizeScale,
                    ),
                    decoration: const InputDecoration(
                      hintText:
                          'এখানে আপনার বাংলা কবিতা, গল্প বা উপন্যাস লিখুন অথবা পেস্ট করুন...',
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'শব্দ: ${toBanglaDigits(words)} • অক্ষর: ${toBanglaDigits(chars)} • অনুচ্ছেদ: ${toBanglaDigits(paragraphs)}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontSize: 12,
                        ),
                      ),
                      if (_issues.isNotEmpty)
                        TextButton(
                          onPressed: _openResultsScreen,
                          child: Text(
                            'ফলাফল (${toBanglaDigits(_issues.length)})',
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(
                  top: BorderSide(
                    color: theme.dividerColor.withOpacity(0.25),
                  ),
                ),
              ),
              child: Row(
                children: [
                  OutlinedButton(
                    onPressed: () => _persistManuscript(silent: false),
                    child: const Text('সংরক্ষণ'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _isProofreading ? null : _runProofread,
                      icon: _isProofreading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.auto_fix_high_rounded),
                      label: Text(
                        _isProofreading
                            ? 'যাচাই চলছে...'
                            : 'প্রুফরিড শুরু করুন',
                      ),
                    ),
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
