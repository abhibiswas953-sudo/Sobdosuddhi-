import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../models/manuscript.dart';

class ProofreadResponse {
  ProofreadResponse({
    required this.issues,
    required this.summaryNote,
  });

  final List<ProofreadIssue> issues;
  final String summaryNote;
}

class ParsedFileResponse {
  ParsedFileResponse({
    required this.text,
    required this.fileName,
    required this.wordCount,
  });

  final String text;
  final String fileName;
  final int wordCount;
}

class ApiService {
  // Backend URL configured at build time via --dart-define=API_BASE_URL=...
  // Zero secret API keys are stored in the Android APK.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue:
        'https://ais-pre-mnjf6spx7vqxsfp7d5lscz-1008845843693.asia-east1.run.app',
  );

  http.Client? _activeUploadClient;

  void cancelActiveUpload() {
    _activeUploadClient?.close();
    _activeUploadClient = null;
  }

  Future<ProofreadResponse> proofread({
    required String text,
    required WritingCategory category,
    required String spellingStandard,
    required String strictness,
  }) async {
    final uri = Uri.parse('$baseUrl/api/proofread');
    final response = await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json; charset=utf-8'},
          body: jsonEncode({
            'text': text,
            'category': category.apiValue,
            'spellingStandard': spellingStandard,
            'strictness': strictness,
          }),
        )
        .timeout(const Duration(seconds: 90));

    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        decoded['error']?.toString() ??
            'প্রুফরিডিং সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      );
    }

    final rawIssues = (decoded['issues'] as List<dynamic>? ?? []);
    final issues = rawIssues
        .whereType<Map<String, dynamic>>()
        .map(ProofreadIssue.fromJson)
        .toList();

    return ProofreadResponse(
      issues: issues,
      summaryNote: decoded['summaryNote']?.toString() ??
          'প্রুফরিডিং সম্পন্ন হয়েছে।',
    );
  }

  Future<ParsedFileResponse> uploadAndParseFile({
    required File file,
    required String fileName,
    void Function(double progress)? onProgress,
  }) async {
    final uri = Uri.parse('$baseUrl/api/manuscripts/parse-file');
    final client = http.Client();
    _activeUploadClient = client;

    try {
      onProgress?.call(0.15);
      final bytes = await file.readAsBytes();
      onProgress?.call(0.45);

      final request = http.MultipartRequest('POST', uri);
      request.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: fileName),
      );

      final streamed = await client.send(request).timeout(
            const Duration(seconds: 60),
          );
      onProgress?.call(0.85);

      final responseBody = await streamed.stream.bytesToString();
      final decoded = jsonDecode(responseBody);

      if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
        throw Exception(
          decoded['error']?.toString() ?? 'ফাইল প্রক্রিয়াকরণে সমস্যা হয়েছে।',
        );
      }

      onProgress?.call(1.0);
      return ParsedFileResponse(
        text: (decoded['text'] ?? '').toString(),
        fileName: (decoded['fileName'] ?? fileName).toString(),
        wordCount: (decoded['wordCount'] as num?)?.toInt() ?? 0,
      );
    } finally {
      if (_activeUploadClient == client) {
        _activeUploadClient = null;
      }
      client.close();
    }
  }

  Future<Uint8List> exportDocxBytes({
    required String title,
    required String categoryLabel,
    required String content,
  }) async {
    final uri = Uri.parse('$baseUrl/api/export/docx');
    final response = await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json; charset=utf-8'},
          body: jsonEncode({
            'title': title,
            'category': categoryLabel,
            'content': content,
          }),
        )
        .timeout(const Duration(seconds: 45));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('DOCX ফাইল তৈরি করা যায়নি।');
    }
    return response.bodyBytes;
  }
}
