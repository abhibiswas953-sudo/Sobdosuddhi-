import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import '../models/manuscript.dart';
import '../services/api_service.dart';
import '../services/export_service.dart';
import 'editor_screen.dart';
import 'history_screen.dart';
import 'home_screen.dart';
import 'my_manuscripts_screen.dart';
import 'settings_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.api,
    required this.exporter,
    required this.preferences,
    required this.manuscripts,
    required this.revisions,
    required this.onUpdatePreferences,
    required this.onUpsertManuscript,
    required this.onDeleteManuscript,
    required this.onAddRevision,
  });

  final ApiService api;
  final ExportService exporter;
  final AppPreferences preferences;
  final List<Manuscript> manuscripts;
  final List<ProofreadRevision> revisions;
  final Future<void> Function(AppPreferences) onUpdatePreferences;
  final Future<void> Function(Manuscript) onUpsertManuscript;
  final Future<void> Function(String) onDeleteManuscript;
  final Future<void> Function(ProofreadRevision) onAddRevision;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;
  Manuscript? _activeManuscript;
  WritingCategory _draftCategory = WritingCategory.prose;
  int _editorSessionKey = 0;
  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _connSub;

  @override
  void initState() {
    super.initState();
    _initConnectivity();
  }

  Future<void> _initConnectivity() async {
    final initial = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() {
        _isOffline = initial.every((r) => r == ConnectivityResult.none);
      });
    }
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      if (!mounted) return;
      setState(() {
        _isOffline = results.every((r) => r == ConnectivityResult.none);
      });
    });
  }

  @override
  void dispose() {
    _connSub?.cancel();
    super.dispose();
  }

  void _openNewManuscript([WritingCategory category = WritingCategory.prose]) {
    setState(() {
      _activeManuscript = null;
      _draftCategory = category;
      _editorSessionKey++;
      _selectedIndex = 1;
    });
  }

  void _openExistingManuscript(Manuscript item) {
    setState(() {
      _activeManuscript = item;
      _draftCategory = item.category;
      _editorSessionKey++;
      _selectedIndex = 1;
    });
  }

  void _switchTab(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _selectedIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _selectedIndex != 0) {
          setState(() => _selectedIndex = 0);
        }
      },
      child: Scaffold(
        body: Column(
          children: [
            if (_isOffline)
              Material(
                color: Colors.amber.shade900,
                child: SafeArea(
                  bottom: false,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.wifi_off_rounded,
                            size: 16, color: Colors.white),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'ইন্টারনেট সংযোগ বিচ্ছিন্ন। সংরক্ষিত পান্ডুলিপি অফলাইনে পড়া ও সম্পাদনা করা যাবে।',
                            style: TextStyle(color: Colors.white, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            Expanded(
              child: IndexedStack(
                index: _selectedIndex,
                children: [
                  HomeScreen(
                    preferences: widget.preferences,
                    manuscripts: widget.manuscripts,
                    revisions: widget.revisions,
                    onNewManuscript: _openNewManuscript,
                    onOpenManuscript: _openExistingManuscript,
                    onGoToTab: _switchTab,
                  ),
                  EditorScreen(
                    key: ValueKey(_editorSessionKey),
                    api: widget.api,
                    exporter: widget.exporter,
                    preferences: widget.preferences,
                    initialManuscript: _activeManuscript,
                    initialCategory: _draftCategory,
                    isOffline: _isOffline,
                    onSaveManuscript: (saved) async {
                      setState(() => _activeManuscript = saved);
                      await widget.onUpsertManuscript(saved);
                    },
                    onAddRevision: widget.onAddRevision,
                  ),
                  MyManuscriptsScreen(
                    manuscripts: widget.manuscripts,
                    exporter: widget.exporter,
                    onOpenManuscript: _openExistingManuscript,
                    onCreateNew: () => _openNewManuscript(),
                    onRenameManuscript: (item, newTitle) async {
                      await widget.onUpsertManuscript(
                        item.copyWith(
                          title: newTitle,
                          updatedAt: DateTime.now(),
                        ),
                      );
                    },
                    onDeleteManuscript: widget.onDeleteManuscript,
                  ),
                  HistoryScreen(
                    revisions: widget.revisions,
                    exporter: widget.exporter,
                  ),
                  SettingsScreen(
                    preferences: widget.preferences,
                    onUpdatePreferences: widget.onUpdatePreferences,
                  ),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: _switchTab,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'হোম',
            ),
            NavigationDestination(
              icon: Icon(Icons.edit_note_outlined),
              selectedIcon: Icon(Icons.edit_note_rounded),
              label: 'নতুন লেখা',
            ),
            NavigationDestination(
              icon: Icon(Icons.menu_book_outlined),
              selectedIcon: Icon(Icons.menu_book_rounded),
              label: 'আমার পান্ডুলিপি',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history_rounded),
              label: 'ইতিহাস',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings_rounded),
              label: 'সেটিংস',
            ),
          ],
        ),
      ),
    );
  }
}
