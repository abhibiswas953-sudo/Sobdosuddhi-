import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'api_service.dart';

class ExportService {
  ExportService(this._api);

  final ApiService _api;

  String _safeName(String title) {
    final cleaned = title
        .trim()
        .replaceAll(RegExp(r'[^\u0980-\u09FFa-zA-Z0-9_\-\s]'), '')
        .replaceAll(RegExp(r'\s+'), '_');
    return cleaned.isEmpty ? 'sobdosuddhi_manuscript' : cleaned;
  }

  Future<File> exportTxt({
    required String title,
    required String content,
    bool shareAfter = true,
  }) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${_safeName(title)}.txt');
    final output = '$title\n${'=' * 24}\n\n$content';
    await file.writeAsBytes(utf8.encode(output), flush: true);

    if (shareAfter) {
      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'text/plain')],
        subject: title,
      );
    }
    return file;
  }

  Future<File> exportDocx({
    required String title,
    required String categoryLabel,
    required String content,
    bool shareAfter = true,
  }) async {
    final bytes = await _api.exportDocxBytes(
      title: title,
      categoryLabel: categoryLabel,
      content: content,
    );
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${_safeName(title)}.docx');
    await file.writeAsBytes(bytes, flush: true);

    if (shareAfter) {
      await Share.shareXFiles(
        [
          XFile(
            file.path,
            mimeType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ),
        ],
        subject: title,
      );
    }
    return file;
  }

  Future<File> exportPdf({
    required String title,
    required String categoryLabel,
    required String content,
    bool shareAfter = true,
  }) async {
    final doc = pw.Document();
    final bengaliFont = await PdfGoogleFonts.notoSerifBengaliRegular();
    final bengaliBold = await PdfGoogleFonts.notoSerifBengaliBold();

    final paragraphs = content.split('\n');

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(42),
        build: (context) => [
          pw.Text(
            title,
            style: pw.TextStyle(
              font: bengaliBold,
              fontSize: 20,
              color: PdfColor.fromHex('#1E4D3B'),
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            '$categoryLabel • Sobdosuddhi 1.0',
            style: pw.TextStyle(
              font: bengaliFont,
              fontSize: 10,
              color: PdfColors.grey700,
            ),
          ),
          pw.Divider(height: 24, color: PdfColors.grey400),
          ...paragraphs.map(
            (line) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 6),
              child: pw.Text(
                line.isEmpty ? ' ' : line,
                style: pw.TextStyle(
                  font: bengaliFont,
                  fontSize: 12.5,
                  lineSpacing: 5,
                ),
              ),
            ),
          ),
        ],
      ),
    );

    final bytes = await doc.save();
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${_safeName(title)}.pdf');
    await file.writeAsBytes(bytes, flush: true);

    if (shareAfter) {
      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'application/pdf')],
        subject: title,
      );
    }
    return file;
  }

  Future<void> sharePlainText({
    required String title,
    required String content,
  }) async {
    await Share.share('$title\n\n$content', subject: title);
  }
}
