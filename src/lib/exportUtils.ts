function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToTxt(title: string, content: string, suffix = '') {
  const safeTitle = (title || 'পান্ডুলিপি').trim();
  const fileName = `${safeTitle}${suffix ? `_${suffix}` : ''}.txt`;
  // Include UTF-8 BOM for seamless Windows Notepad / MS Word Bengali support
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, fileName);
}

export async function shareManuscript(title: string, content: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: title || 'Sobdosuddhi 1.0 পান্ডুলিপি',
        text: content,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
    }
  }
  await navigator.clipboard.writeText(content);
  return 'copied';
}

export async function exportToDocx(
  title: string,
  category: string,
  content: string,
  suffix = ''
): Promise<void> {
  const response = await fetch('/api/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, content }),
  });

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || 'DOCX ফাইল তৈরি করা যায়নি।');
  }

  const blob = await response.blob();
  const safeTitle = (title || 'পান্ডুলিপি').trim();
  const fileName = `${safeTitle}${suffix ? `_${suffix}` : ''}.docx`;
  triggerBlobDownload(blob, fileName);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Exports a publication-grade Bengali PDF using a hidden print frame so
 * native HarfBuzz complex script shaping preserves every যুক্তাক্ষর & কারচিহ্ন
 * as crisp selectable vector text without using window.open.
 */
export function exportToPdf(title: string, category: string, content: string): void {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const bodyHtml = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<div class="spacer"></div>';
      }
      const isChapter =
        /^(অধ্যায়|অধ্যায়|পর্ব|পরিচ্ছেদ|খণ্ড|#)\s*/.test(trimmed) && trimmed.length <= 120;
      if (isChapter) {
        return `<h2>${escapeHtml(trimmed.replace(/^#+\s*/, ''))}</h2>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title || 'পান্ডুলিপি')} — Sobdosuddhi.1.0</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 24mm 22mm;
    }
    body {
      font-family: 'Noto Serif Bengali', Georgia, serif;
      color: #1f2421;
      line-height: 1.85;
      font-size: 13pt;
      margin: 0;
      padding: 0;
    }
    header {
      text-align: center;
      margin-bottom: 24pt;
      padding-bottom: 12pt;
      border-bottom: 1px solid #d4d1c8;
    }
    h1 {
      font-size: 20pt;
      margin: 0 0 6pt 0;
      color: #1f2421;
      font-weight: 700;
    }
    .meta {
      font-size: 10pt;
      color: #5a635d;
    }
    h2 {
      font-size: 14pt;
      color: #1e4d3b;
      margin: 18pt 0 8pt 0;
      font-weight: 600;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8pt 0;
      white-space: pre-wrap;
    }
    .spacer {
      height: 10pt;
    }
    footer {
      margin-top: 28pt;
      padding-top: 10pt;
      border-top: 1px solid #e5e2da;
      font-size: 9pt;
      color: #6b726e;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title || 'পান্ডুলিপি')}</h1>
    <div class="meta">${escapeHtml(category || 'সাহিত্য')} · Sobdosuddhi.1.0 (শুদ্ধ শব্দে, সুন্দর সাহিত্য)</div>
  </header>
  <main>${bodyHtml}</main>
  <footer>Sobdosuddhi.1.0 দ্বারা প্রুফরিড ও প্রস্তুতকৃত</footer>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  };

  setTimeout(triggerPrint, 450);
}
