import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

interface ChapterData {
  chapterNumber: number;
  title: string;
  content: string;
}

interface GeneratePdfOptions {
  ebookId: number;
  title: string;
  subject: string;
  language: string;
  tone: string;
  chapters: ChapterData[];
  hasWatermark: boolean;
  watermarkText?: string;
}

// ─── Colour palette ────────────────────────────────────────────────────────────
const C = {
  pageBg: "#0f0f1a",
  coverBg: "#1a1a2e",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentLighter: "#c4b5fd",
  white: "#ffffff",
  textPrimary: "#e5e7eb",
  textSecondary: "#d1d5db",
  textMuted: "#9ca3af",
  textDim: "#6b7280",
  separator: "#374151",
};

const MARGIN = 72;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 80; // leave 80pt for footer

// ─── Page state tracker ────────────────────────────────────────────────────────
// We manage a mutable cursor `y` and call addDecoratedPage() whenever we need
// a new page, so every page always gets the background + accent bar.

function addDecoratedPage(doc: PDFKit.PDFDocument, hasWatermark: boolean, watermarkText: string): number {
  doc.addPage();
  doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
  doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
  if (hasWatermark) {
    drawWatermark(doc, watermarkText, 32);
  }
  return 50; // top cursor after header bar
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  y: number,
  needed: number,
  hasWatermark: boolean,
  watermarkText: string
): number {
  if (y + needed > BOTTOM_LIMIT) {
    return addDecoratedPage(doc, hasWatermark, watermarkText);
  }
  return y;
}

function drawWatermark(doc: PDFKit.PDFDocument, text: string, size: number) {
  doc.save();
  doc.fillColor(C.white).fillOpacity(0.04).font("Helvetica-Bold").fontSize(size);
  doc.rotate(-45, { origin: [PAGE_W / 2, PAGE_H / 2] });
  doc.text(text, 0, PAGE_H / 2 - size / 2, { align: "center", width: PAGE_W });
  doc.restore();
}

// ─── Markdown block types ──────────────────────────────────────────────────────

type BlockType = "h1" | "h2" | "h3" | "paragraph" | "bullet" | "numbered";

interface Segment {
  text: string;
  bold: boolean;
}

interface ContentBlock {
  type: BlockType;
  segments: Segment[];
  index?: number; // for numbered lists
}

/** Split a line into bold/normal segments based on **text** markers */
function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  return segments.filter((s) => s.text.length > 0);
}

/** Strip all inline markdown to plain text */
function segmentsToPlain(segs: Segment[]): string {
  return segs.map((s) => s.text).join("");
}

function parseMarkdownBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  let paraLines: string[] = [];
  let numberedIndex = 0;

  const flushParagraph = () => {
    const text = paraLines.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", segments: parseInline(stripBasicMarkdown(text)) });
    paraLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "h3", segments: [{ text: stripBasicMarkdown(line.slice(4).trim()), bold: false }] });
      numberedIndex = 0;
    } else if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "h2", segments: [{ text: stripBasicMarkdown(line.slice(3).trim()), bold: false }] });
      numberedIndex = 0;
    } else if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "h1", segments: [{ text: stripBasicMarkdown(line.slice(2).trim()), bold: false }] });
      numberedIndex = 0;
    } else if (/^[-*•]\s+/.test(line)) {
      flushParagraph();
      const itemText = line.replace(/^[-*•]\s+/, "").trim();
      if (itemText) blocks.push({ type: "bullet", segments: parseInline(stripBasicMarkdown(itemText)) });
      numberedIndex = 0;
    } else if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      numberedIndex++;
      const itemText = line.replace(/^\d+\.\s+/, "").trim();
      if (itemText) blocks.push({ type: "numbered", segments: parseInline(stripBasicMarkdown(itemText)), index: numberedIndex });
    } else if (line.trim() === "") {
      flushParagraph();
      numberedIndex = 0;
    } else {
      paraLines.push(line);
    }
  }
  flushParagraph();

  return blocks.filter((b) => b.segments.length > 0 && segmentsToPlain(b.segments).trim().length > 0);
}

/** Strip non-bold inline markdown (italic, code, links, strikethrough) */
function stripBasicMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "**$1**") // bold+italic → bold only
    .replace(/\*(.+?)\*/g, "$1")              // italic
    .replace(/_(.+?)_/g, "$1")               // italic underscore
    .replace(/`(.+?)`/g, "$1")               // code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")      // links
    .replace(/~~(.+?)~~/g, "$1")             // strikethrough
    .trim();
}

// ─── Inline text renderer ──────────────────────────────────────────────────────
// PDFKit doesn't support mixed bold/normal in one call, so we split into runs.

function renderInlineSegments(
  doc: PDFKit.PDFDocument,
  segments: Segment[],
  x: number,
  y: number,
  fontSize: number,
  color: string,
  maxWidth: number,
  lineGap = 3
): number {
  // For simplicity and reliability, render as plain text with bold markers
  // replaced by the full bold font for the whole block when all-bold,
  // otherwise strip bold markers and render as normal text.
  // This avoids complex multi-run layout calculations.
  const hasBold = segments.some((s) => s.bold);
  const plainText = segmentsToPlain(segments);

  if (hasBold) {
    // Render bold segments inline using continued:true trick
    doc.fillColor(color).fillOpacity(1).fontSize(fontSize);
    let isFirst = true;
    for (const seg of segments) {
      doc.font(seg.bold ? "Helvetica-Bold" : "Helvetica");
      if (isFirst) {
        doc.text(seg.text, x, y, { width: maxWidth, lineGap, continued: segments.indexOf(seg) < segments.length - 1 });
        isFirst = false;
      } else {
        doc.text(seg.text, { width: maxWidth, lineGap, continued: segments.indexOf(seg) < segments.length - 1 });
      }
    }
    // After continued chain, doc.y is updated
    return doc.y + lineGap + 2;
  } else {
    doc.fillColor(color).fillOpacity(1).font("Helvetica").fontSize(fontSize);
    doc.text(plainText, x, y, { width: maxWidth, lineGap });
    return doc.y + lineGap + 2;
  }
}

// ─── Block renderer ────────────────────────────────────────────────────────────

function renderBlock(
  doc: PDFKit.PDFDocument,
  block: ContentBlock,
  y: number,
  hasWatermark: boolean,
  watermarkText: string
): number {
  const plain = segmentsToPlain(block.segments);

  switch (block.type) {
    case "h1": {
      y = ensureSpace(doc, y, 36, hasWatermark, watermarkText);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(16);
      doc.text(plain, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 14;
      break;
    }
    case "h2": {
      y = ensureSpace(doc, y, 32, hasWatermark, watermarkText);
      // Accent bar
      doc.rect(MARGIN, y + 2, 3, 13).fillColor(C.accent).fillOpacity(1).fill();
      doc.fillColor(C.accentLight).fillOpacity(1).font("Helvetica-Bold").fontSize(13);
      doc.text(plain, MARGIN + 10, y, { width: CONTENT_W - 10 });
      y = doc.y + 12;
      break;
    }
    case "h3": {
      y = ensureSpace(doc, y, 26, hasWatermark, watermarkText);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      doc.text(plain, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 10;
      break;
    }
    case "paragraph": {
      // Estimate height; if it won't fit, start new page
      doc.font("Helvetica").fontSize(11);
      const estH = doc.heightOfString(plain, { width: CONTENT_W, lineGap: 3 });
      if (y + estH > BOTTOM_LIMIT && estH < BOTTOM_LIMIT - 60) {
        y = addDecoratedPage(doc, hasWatermark, watermarkText);
      }
      y = renderInlineSegments(doc, block.segments, MARGIN, y, 11, C.textSecondary, CONTENT_W, 3);
      y += 4; // extra spacing between paragraphs
      break;
    }
    case "bullet": {
      y = ensureSpace(doc, y, 20, hasWatermark, watermarkText);
      // Bullet dot
      doc.fillColor(C.accent).fillOpacity(1).circle(MARGIN + 5, y + 5, 2.5).fill();
      // Text
      doc.font("Helvetica").fontSize(11);
      const estH = doc.heightOfString(plain, { width: CONTENT_W - 18, lineGap: 3 });
      if (y + estH > BOTTOM_LIMIT) {
        y = addDecoratedPage(doc, hasWatermark, watermarkText);
        doc.fillColor(C.accent).fillOpacity(1).circle(MARGIN + 5, y + 5, 2.5).fill();
      }
      y = renderInlineSegments(doc, block.segments, MARGIN + 14, y, 11, C.textSecondary, CONTENT_W - 18, 3);
      y += 2;
      break;
    }
    case "numbered": {
      y = ensureSpace(doc, y, 20, hasWatermark, watermarkText);
      const numStr = `${block.index ?? ""}. `;
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      doc.text(numStr, MARGIN, y, { width: 22, continued: false });
      const savedY = y;
      doc.font("Helvetica").fontSize(11);
      const estH = doc.heightOfString(plain, { width: CONTENT_W - 24, lineGap: 3 });
      if (savedY + estH > BOTTOM_LIMIT) {
        y = addDecoratedPage(doc, hasWatermark, watermarkText);
        doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
        doc.text(numStr, MARGIN, y, { width: 22 });
      }
      y = renderInlineSegments(doc, block.segments, MARGIN + 24, savedY, 11, C.textSecondary, CONTENT_W - 24, 3);
      y += 2;
      break;
    }
  }

  return y;
}

// ─── Content cleaner ───────────────────────────────────────────────────────────

function cleanChapterContent(content: string, chapterTitle: string, ebookTitle: string): string {
  let cleaned = content.trim();

  // Remove leading heading that duplicates the chapter title
  for (const prefix of [`### ${chapterTitle}`, `## ${chapterTitle}`, `# ${chapterTitle}`, chapterTitle]) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }
  // Remove ebook title if repeated
  if (cleaned.startsWith(`# ${ebookTitle}`)) cleaned = cleaned.slice(`# ${ebookTitle}`.length).trim();
  // Remove "Chapitre X :" prefix
  cleaned = cleaned.replace(/^Chapitre\s+\d+\s*[:\-–]\s*/i, "").trim();
  // Collapse excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function generateEbookPdf(options: GeneratePdfOptions): Promise<{ key: string; url: string }> {
  const {
    ebookId,
    title,
    subject,
    language,
    tone,
    chapters,
    hasWatermark,
    watermarkText = "Generated by EbookAI Studio",
  } = options;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: false,
      info: { Title: title, Subject: subject, Creator: "EbookAI Studio", Producer: "EbookAI Studio" },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", async () => {
      try {
        const buf = Buffer.concat(chunks);
        const fileKey = `ebooks/${ebookId}/ebook-${ebookId}.pdf`;
        const { key, url } = await storagePut(fileKey, buf, "application/pdf");
        resolve({ key, url });
      } catch (err) {
        reject(err);
      }
    });

    // ── Cover ────────────────────────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.coverBg).fillOpacity(1).fill();
    doc.rect(0, 0, PAGE_W, 8).fillColor(C.accent).fillOpacity(1).fill();

    // Decorative circle
    doc.circle(PAGE_W / 2, 160, 52).fillColor(C.accent).fillOpacity(0.12).fill();
    doc.circle(PAGE_W / 2, 160, 52).strokeColor(C.accent).strokeOpacity(0.35).lineWidth(1).stroke();

    // Title
    doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(30);
    doc.text(title, MARGIN, 220, { align: "center", width: CONTENT_W });
    const titleH = doc.heightOfString(title, { width: CONTENT_W });
    const lineY = 220 + titleH + 18;

    // Accent underline
    doc.moveTo(PAGE_W / 2 - 40, lineY).lineTo(PAGE_W / 2 + 40, lineY).strokeColor(C.accent).strokeOpacity(1).lineWidth(2).stroke();

    // Subject
    doc.fillColor(C.accentLight).fillOpacity(1).font("Helvetica").fontSize(13);
    doc.text(subject, MARGIN, lineY + 18, { align: "center", width: CONTENT_W });

    // Meta
    const toneLabels: Record<string, string> = {
      professional: "Professionnel", casual: "Décontracté",
      academic: "Académique", creative: "Créatif", motivational: "Motivant",
    };
    doc.fillColor(C.textDim).fillOpacity(1).font("Helvetica").fontSize(10);
    doc.text(
      `${language}  ·  ${toneLabels[tone] || tone}  ·  ${chapters.length} chapitre${chapters.length > 1 ? "s" : ""}`,
      MARGIN, lineY + 68, { align: "center", width: CONTENT_W }
    );

    // Branding
    doc.fillColor(C.separator).fontSize(9).text("EbookAI Studio", MARGIN, PAGE_H - 90, { align: "center", width: CONTENT_W });

    if (hasWatermark) drawWatermark(doc, watermarkText, 48);

    // ── Table of Contents ────────────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
    doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();

    doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(20).text("Table des matières", MARGIN, 50);
    doc.moveTo(MARGIN, 80).lineTo(PAGE_W - MARGIN, 80).strokeColor(C.accent).strokeOpacity(1).lineWidth(0.8).stroke();

    let tocY = 98;
    for (const ch of chapters) {
      if (tocY > BOTTOM_LIMIT) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
        doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
        tocY = 50;
      }
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10).text(`${ch.chapterNumber}.`, MARGIN, tocY, { width: 24 });
      doc.fillColor(C.textPrimary).fillOpacity(1).font("Helvetica").fontSize(11).text(ch.title, MARGIN + 28, tocY, { width: CONTENT_W - 28 });
      const h = doc.heightOfString(ch.title, { width: CONTENT_W - 28 });
      tocY += Math.max(h, 14) + 10;
    }

    // ── Chapters ─────────────────────────────────────────────────────────────
    for (const ch of chapters) {
      // Chapter start page
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
      doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
      if (hasWatermark) drawWatermark(doc, watermarkText, 32);

      // Chapter header
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10).text(`CHAPITRE ${ch.chapterNumber}`, MARGIN, 40);
      doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(20).text(ch.title, MARGIN, 58, { width: CONTENT_W });
      const chTitleH = doc.heightOfString(ch.title, { width: CONTENT_W });
      const sepY = 58 + chTitleH + 12;
      doc.moveTo(MARGIN, sepY).lineTo(PAGE_W - MARGIN, sepY).strokeColor(C.accent).strokeOpacity(1).lineWidth(0.5).stroke();

      let y = sepY + 18;

      // Clean and parse content
      const cleanedContent = cleanChapterContent(ch.content, ch.title, title);
      const blocks = parseMarkdownBlocks(cleanedContent);

      for (const block of blocks) {
        y = renderBlock(doc, block, y, hasWatermark, watermarkText);
      }

      // Page number at bottom
      doc.fillColor(C.textDim).fillOpacity(1).font("Helvetica").fontSize(9);
      doc.text(`${ch.chapterNumber}`, MARGIN, PAGE_H - 50, { align: "center", width: CONTENT_W });
    }

    doc.end();
  });
}
