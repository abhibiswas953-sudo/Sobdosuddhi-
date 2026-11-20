import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/manuscript.dart';

class StorageService {
  static const _manuscriptsKey = 'sobdosuddhi_manuscripts_v1';
  static const _revisionsKey = 'sobdosuddhi_revisions_v1';
  static const _prefsKey = 'sobdosuddhi_prefs_v1';

  Future<List<Manuscript>> loadManuscripts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_manuscriptsKey);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    final list = decoded
        .whereType<Map<String, dynamic>>()
        .map(Manuscript.fromJson)
        .toList();
    list.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list;
  }

  Future<void> saveManuscripts(List<Manuscript> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _manuscriptsKey,
      jsonEncode(items.map((e) => e.toJson()).toList()),
    );
  }

  Future<List<ProofreadRevision>> loadRevisions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_revisionsKey);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    final list = decoded
        .whereType<Map<String, dynamic>>()
        .map(ProofreadRevision.fromJson)
        .toList();
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Future<void> saveRevisions(List<ProofreadRevision> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _revisionsKey,
      jsonEncode(items.map((e) => e.toJson()).toList()),
    );
  }

  Future<AppPreferences> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null || raw.isEmpty) return AppPreferences();
    return AppPreferences.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> savePreferences(AppPreferences settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(settings.toJson()));
  }
}
