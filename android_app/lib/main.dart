import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'models/manuscript.dart';
import 'screens/main_shell.dart';
import 'screens/splash_screen.dart';
import 'services/api_service.dart';
import 'services/export_service.dart';
import 'services/storage_service.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  runApp(const SobdosuddhiApp());
}

class SobdosuddhiApp extends StatefulWidget {
  const SobdosuddhiApp({super.key});

  @override
  State<SobdosuddhiApp> createState() => _SobdosuddhiAppState();
}

class _SobdosuddhiAppState extends State<SobdosuddhiApp> {
  final StorageService _storage = StorageService();
  final ApiService _api = ApiService();
  late final ExportService _exporter = ExportService(_api);

  bool _showSplash = true;
  AppPreferences _prefs = AppPreferences();
  List<Manuscript> _manuscripts = [];
  List<ProofreadRevision> _revisions = [];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final results = await Future.wait([
      _storage.loadPreferences(),
      _storage.loadManuscripts(),
      _storage.loadRevisions(),
      Future.delayed(const Duration(milliseconds: 1450)),
    ]);

    if (!mounted) return;
    setState(() {
      _prefs = results[0] as AppPreferences;
      _manuscripts = results[1] as List<Manuscript>;
      _revisions = results[2] as List<ProofreadRevision>;
      _showSplash = false;
    });
    _applySystemUi(_prefs.darkMode);
  }

  void _applySystemUi(bool dark) {
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness:
            dark ? Brightness.light : Brightness.dark,
      ),
    );
  }

  Future<void> _updatePreferences(AppPreferences next) async {
    setState(() => _prefs = next);
    _applySystemUi(next.darkMode);
    await _storage.savePreferences(next);
  }

  Future<void> _upsertManuscript(Manuscript item) async {
    final idx = _manuscripts.indexWhere((m) => m.id == item.id);
    final updated = List<Manuscript>.from(_manuscripts);
    if (idx >= 0) {
      updated[idx] = item;
    } else {
      updated.insert(0, item);
    }
    updated.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    setState(() => _manuscripts = updated);
    await _storage.saveManuscripts(updated);
  }

  Future<void> _deleteManuscript(String id) async {
    final updated = _manuscripts.where((m) => m.id != id).toList();
    setState(() => _manuscripts = updated);
    await _storage.saveManuscripts(updated);
  }

  Future<void> _addRevision(ProofreadRevision rev) async {
    final updated = [rev, ..._revisions];
    setState(() => _revisions = updated);
    await _storage.saveRevisions(updated);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sobdosuddhi 1.0',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme(),
      darkTheme: AppTheme.darkTheme(),
      themeMode: _prefs.darkMode ? ThemeMode.dark : ThemeMode.light,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('bn', 'BD'),
        Locale('en', 'US'),
      ],
      home: AnimatedSwitcher(
        duration: const Duration(milliseconds: 350),
        child: _showSplash
            ? const SplashScreen(key: ValueKey('splash'))
            : MainShell(
                key: const ValueKey('shell'),
                api: _api,
                exporter: _exporter,
                preferences: _prefs,
                manuscripts: _manuscripts,
                revisions: _revisions,
                onUpdatePreferences: _updatePreferences,
                onUpsertManuscript: _upsertManuscript,
                onDeleteManuscript: _deleteManuscript,
                onAddRevision: _addRevision,
              ),
      ),
    );
  }
}
