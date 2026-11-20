enum WritingCategory {
  poetry('কবিতা', 'বাংলা কবিতা'),
  prose('গল্প', 'বাংলা গল্প ও উপন্যাস');

  const WritingCategory(this.apiValue, this.label);
  final String apiValue;
  final String label;

  static WritingCategory fromApi(String? value) {
    if (value == 'কবিতা') return WritingCategory.poetry;
    return WritingCategory.prose;
  }
}

enum IssueSeverity {
  definite,
  warning,
  style;

  static IssueSeverity fromString(String? value) {
    switch (value) {
      case 'definite':
        return IssueSeverity.definite;
      case 'warning':
        return IssueSeverity.warning;
      default:
        return IssueSeverity.style;
    }
  }
}

enum IssueStatus {
  pending,
  accepted,
  rejected;

  static IssueStatus fromString(String? value) {
    switch (value) {
      case 'accepted':
        return IssueStatus.accepted;
      case 'rejected':
        return IssueStatus.rejected;
      default:
        return IssueStatus.pending;
    }
  }
}

class ProofreadIssue {
  ProofreadIssue({
    required this.id,
    required this.original,
    required this.suggestion,
    required this.category,
    required this.severity,
    required this.explanation,
    this.status = IssueStatus.pending,
    this.contextSnippet,
  });

  final String id;
  final String original;
  final String suggestion;
  final String category;
  final IssueSeverity severity;
  final String explanation;
  final IssueStatus status;
  final String? contextSnippet;

  ProofreadIssue copyWith({IssueStatus? status}) {
    return ProofreadIssue(
      id: id,
      original: original,
      suggestion: suggestion,
      category: category,
      severity: severity,
      explanation: explanation,
      status: status ?? this.status,
      contextSnippet: contextSnippet,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'original': original,
        'suggestion': suggestion,
        'category': category,
        'severity': severity.name,
        'explanation': explanation,
        'status': status.name,
        'contextSnippet': contextSnippet,
      };

  factory ProofreadIssue.fromJson(Map<String, dynamic> json) {
    return ProofreadIssue(
      id: (json['id'] ?? '').toString(),
      original: (json['original'] ?? '').toString(),
      suggestion: (json['suggestion'] ?? '').toString(),
      category: (json['category'] ?? 'বানান ভুল').toString(),
      severity: IssueSeverity.fromString(json['severity']?.toString()),
      explanation: (json['explanation'] ?? '').toString(),
      status: IssueStatus.fromString(json['status']?.toString()),
      contextSnippet: json['contextSnippet']?.toString(),
    );
  }
}

class Manuscript {
  Manuscript({
    required this.id,
    required this.title,
    required this.category,
    required this.originalContent,
    required this.currentContent,
    required this.wordCount,
    required this.errorCount,
    required this.issues,
    required this.createdAt,
    required this.updatedAt,
    this.summaryNote,
    this.sourceFileName,
  });

  final String id;
  final String title;
  final WritingCategory category;
  final String originalContent;
  final String currentContent;
  final int wordCount;
  final int errorCount;
  final List<ProofreadIssue> issues;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? summaryNote;
  final String? sourceFileName;

  Manuscript copyWith({
    String? title,
    WritingCategory? category,
    String? originalContent,
    String? currentContent,
    int? wordCount,
    int? errorCount,
    List<ProofreadIssue>? issues,
    DateTime? updatedAt,
    String? summaryNote,
    String? sourceFileName,
  }) {
    return Manuscript(
      id: id,
      title: title ?? this.title,
      category: category ?? this.category,
      originalContent: originalContent ?? this.originalContent,
      currentContent: currentContent ?? this.currentContent,
      wordCount: wordCount ?? this.wordCount,
      errorCount: errorCount ?? this.errorCount,
      issues: issues ?? this.issues,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      summaryNote: summaryNote ?? this.summaryNote,
      sourceFileName: sourceFileName ?? this.sourceFileName,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'category': category.apiValue,
        'originalContent': originalContent,
        'currentContent': currentContent,
        'wordCount': wordCount,
        'errorCount': errorCount,
        'issues': issues.map((e) => e.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'summaryNote': summaryNote,
        'sourceFileName': sourceFileName,
      };

  factory Manuscript.fromJson(Map<String, dynamic> json) {
    final rawIssues = (json['issues'] as List<dynamic>? ?? []);
    return Manuscript(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'শিরোনামহীন পান্ডুলিপি').toString(),
      category: WritingCategory.fromApi(json['category']?.toString()),
      originalContent: (json['originalContent'] ?? '').toString(),
      currentContent: (json['currentContent'] ?? '').toString(),
      wordCount: (json['wordCount'] as num?)?.toInt() ?? 0,
      errorCount: (json['errorCount'] as num?)?.toInt() ?? 0,
      issues: rawIssues
          .whereType<Map<String, dynamic>>()
          .map(ProofreadIssue.fromJson)
          .toList(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
      summaryNote: json['summaryNote']?.toString(),
      sourceFileName: json['sourceFileName']?.toString(),
    );
  }
}

class ProofreadRevision {
  ProofreadRevision({
    required this.id,
    required this.manuscriptId,
    required this.manuscriptTitle,
    required this.category,
    required this.contentSnapshot,
    required this.wordCount,
    required this.totalIssues,
    required this.acceptedCount,
    required this.rejectedCount,
    required this.createdAt,
  });

  final String id;
  final String manuscriptId;
  final String manuscriptTitle;
  final WritingCategory category;
  final String contentSnapshot;
  final int wordCount;
  final int totalIssues;
  final int acceptedCount;
  final int rejectedCount;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'manuscriptId': manuscriptId,
        'manuscriptTitle': manuscriptTitle,
        'category': category.apiValue,
        'contentSnapshot': contentSnapshot,
        'wordCount': wordCount,
        'totalIssues': totalIssues,
        'acceptedCount': acceptedCount,
        'rejectedCount': rejectedCount,
        'createdAt': createdAt.toIso8601String(),
      };

  factory ProofreadRevision.fromJson(Map<String, dynamic> json) {
    return ProofreadRevision(
      id: (json['id'] ?? '').toString(),
      manuscriptId: (json['manuscriptId'] ?? '').toString(),
      manuscriptTitle: (json['manuscriptTitle'] ?? '').toString(),
      category: WritingCategory.fromApi(json['category']?.toString()),
      contentSnapshot: (json['contentSnapshot'] ?? '').toString(),
      wordCount: (json['wordCount'] as num?)?.toInt() ?? 0,
      totalIssues: (json['totalIssues'] as num?)?.toInt() ?? 0,
      acceptedCount: (json['acceptedCount'] as num?)?.toInt() ?? 0,
      rejectedCount: (json['rejectedCount'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class AppPreferences {
  AppPreferences({
    this.darkMode = false,
    this.fontSizeScale = 1.0,
    this.spellingStandard = 'bangla_academy',
    this.strictness = 'balanced',
    this.authorName = 'লেখক',
    this.authorEmail = '',
  });

  final bool darkMode;
  final double fontSizeScale; // 0.88, 1.0, 1.15, 1.30
  final String spellingStandard;
  final String strictness;
  final String authorName;
  final String authorEmail;

  AppPreferences copyWith({
    bool? darkMode,
    double? fontSizeScale,
    String? spellingStandard,
    String? strictness,
    String? authorName,
    String? authorEmail,
  }) {
    return AppPreferences(
      darkMode: darkMode ?? this.darkMode,
      fontSizeScale: fontSizeScale ?? this.fontSizeScale,
      spellingStandard: spellingStandard ?? this.spellingStandard,
      strictness: strictness ?? this.strictness,
      authorName: authorName ?? this.authorName,
      authorEmail: authorEmail ?? this.authorEmail,
    );
  }

  Map<String, dynamic> toJson() => {
        'darkMode': darkMode,
        'fontSizeScale': fontSizeScale,
        'spellingStandard': spellingStandard,
        'strictness': strictness,
        'authorName': authorName,
        'authorEmail': authorEmail,
      };

  factory AppPreferences.fromJson(Map<String, dynamic> json) {
    return AppPreferences(
      darkMode: json['darkMode'] == true,
      fontSizeScale: (json['fontSizeScale'] as num?)?.toDouble() ?? 1.0,
      spellingStandard:
          (json['spellingStandard'] ?? 'bangla_academy').toString(),
      strictness: (json['strictness'] ?? 'balanced').toString(),
      authorName: (json['authorName'] ?? 'লেখক').toString(),
      authorEmail: (json['authorEmail'] ?? '').toString(),
    );
  }
}

String toBanglaDigits(Object input) {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input.toString().replaceAllMapped(
        RegExp(r'\d'),
        (match) => digits[int.parse(match.group(0)!)],
      );
}

int countWords(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return 0;
  return trimmed.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
}

int countParagraphs(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return 0;
  return trimmed
      .split(RegExp(r'\n\s*\n'))
      .where((p) => p.trim().isNotEmpty)
      .length;
}

String formatBanglaDate(DateTime date) {
  const months = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];
  return '${toBanglaDigits(date.day)} ${months[date.month - 1]} ${toBanglaDigits(date.year)}';
}

String formatFileSize(int bytes) {
  if (bytes < 1024) return '${toBanglaDigits(bytes)} বাইট';
  if (bytes < 1024 * 1024) {
    return '${toBanglaDigits((bytes / 1024).toStringAsFixed(1))} কেবি';
  }
  return '${toBanglaDigits((bytes / (1024 * 1024)).toStringAsFixed(2))} এমবি';
}
