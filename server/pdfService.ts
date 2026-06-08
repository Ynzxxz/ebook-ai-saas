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
  textDim: "#6b7280",
  separator: "#374151",
};

const MARGIN = 72;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
// Reserve space at the bottom for footer — never render text below this line
const BOTTOM_LIMIT = PAGE_H - 90;

// ─── Page helpers ──────────────────────────────────────────────────────────────

/**
 * Add a new decorated content page and return the starting Y cursor.
 * IMPORTANT: Never call doc.addPage() directly in content rendering —
 * always use this function to ensure consistent decoration.
 */
function addContentPage(doc: PDFKit.PDFDocument, hasWatermark: boolean, wm: string): number {
  doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
  // Fill background FIRST before any text to avoid PDFKit auto-page side effects
  doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
  doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
  if (hasWatermark) drawWatermark(doc, wm, 32);
  return 50;
}

/**
 * Ensure there is at least `needed` points of space below `y`.
 * If not, start a new page and return the new cursor.
 */
function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number, hw: boolean, wm: string): number {
  return y + needed > BOTTOM_LIMIT ? addContentPage(doc, hw, wm) : y;
}

function drawWatermark(doc: PDFKit.PDFDocument, text: string, size: number) {
  doc.save();
  doc.fillColor(C.white).fillOpacity(0.04).font("Helvetica-Bold").fontSize(size);
  doc.rotate(-45, { origin: [PAGE_W / 2, PAGE_H / 2] });
  doc.text(text, 0, PAGE_H / 2 - size / 2, { align: "center", width: PAGE_W });
  doc.restore();
}

// ─── Markdown parser ───────────────────────────────────────────────────────────

type BlockType = "h1" | "h2" | "h3" | "paragraph" | "bullet" | "numbered";

interface ContentBlock {
  type: BlockType;
  /** Plain text — inline markdown already stripped */
  text: string;
  index?: number; // for numbered list items
}

function parseMarkdownBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  let paraLines: string[] = [];
  let numberedIndex = 0;

  const flushPara = () => {
    const t = paraLines.join(" ").trim();
    if (t) blocks.push({ type: "paragraph", text: stripInline(t) });
    paraLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("### ")) {
      flushPara();
      blocks.push({ type: "h3", text: stripInline(line.slice(4).trim()) });
      numberedIndex = 0;
    } else if (line.startsWith("## ")) {
      flushPara();
      blocks.push({ type: "h2", text: stripInline(line.slice(3).trim()) });
      numberedIndex = 0;
    } else if (line.startsWith("# ")) {
      flushPara();
      blocks.push({ type: "h1", text: stripInline(line.slice(2).trim()) });
      numberedIndex = 0;
    } else if (/^[-*•]\s+/.test(line)) {
      flushPara();
      const t = line.replace(/^[-*•]\s+/, "").trim();
      if (t) blocks.push({ type: "bullet", text: stripInline(t) });
      numberedIndex = 0;
    } else if (/^\d+\.\s+/.test(line)) {
      flushPara();
      numberedIndex++;
      const t = line.replace(/^\d+\.\s+/, "").trim();
      if (t) blocks.push({ type: "numbered", text: stripInline(t), index: numberedIndex });
    } else if (line.trim() === "") {
      flushPara();
      numberedIndex = 0;
    } else {
      paraLines.push(line);
    }
  }
  flushPara();

  return blocks.filter((b) => b.text.trim().length > 0);
}

/** Remove all inline markdown syntax, keep plain text */
function stripInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

// ─── Block renderer ────────────────────────────────────────────────────────────
// KEY RULE: Every doc.text() call uses an explicit (x, y) position.
// We NEVER rely on doc.y after a text call that could have triggered
// PDFKit's internal pagination — we always track y ourselves.

function renderBlock(
  doc: PDFKit.PDFDocument,
  block: ContentBlock,
  y: number,
  hw: boolean,
  wm: string
): number {
  const { text } = block;
  if (!text) return y;

  switch (block.type) {
    // ── Headings ──────────────────────────────────────────────────────────────
    case "h1": {
      y = ensureSpace(doc, y, 40, hw, wm);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(16);
      const h = doc.heightOfString(text, { width: CONTENT_W });
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
      return y + h + 16;
    }
    case "h2": {
      y = ensureSpace(doc, y, 34, hw, wm);
      // Accent side bar
      doc.rect(MARGIN, y + 1, 3, 14).fillColor(C.accent).fillOpacity(1).fill();
      doc.fillColor(C.accentLight).fillOpacity(1).font("Helvetica-Bold").fontSize(13);
      const h = doc.heightOfString(text, { width: CONTENT_W - 12 });
      doc.text(text, MARGIN + 10, y, { width: CONTENT_W - 12, lineGap: 2 });
      return y + h + 14;
    }
    case "h3": {
      y = ensureSpace(doc, y, 28, hw, wm);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W });
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
      return y + h + 12;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────────
    case "paragraph": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W, lineGap: 4 });
      // Si le paragraphe ne rentre pas sur la page actuelle, créer une nouvelle page
      // Cela garantit que le paragraphe complet reste sur une seule page
      if (y + h > BOTTOM_LIMIT) {
        y = addContentPage(doc, hw, wm);
      }
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 4 });
      // Use measured height, not doc.y, to avoid PDFKit cursor drift
      return y + h + 12;
    }

    // ── Bullet list item ──────────────────────────────────────────────────────
    case "bullet": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W - 18, lineGap: 3 });
      y = ensureSpace(doc, y, h + 6, hw, wm);
      // Draw bullet dot
      doc.fillColor(C.accent).fillOpacity(1).circle(MARGIN + 5, y + 6, 2.5).fill();
      // Draw text
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN + 14, y, { width: CONTENT_W - 18, lineGap: 3 });
      return y + h + 6;
    }

    // ── Numbered list item ────────────────────────────────────────────────────
    case "numbered": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W - 26, lineGap: 3 });
      y = ensureSpace(doc, y, h + 6, hw, wm);
      // Number label
      const numStr = `${block.index ?? "1"}.`;
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      doc.text(numStr, MARGIN, y, { width: 20, lineGap: 3 });
      // Item text — positioned to the right of the number
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN + 24, y, { width: CONTENT_W - 26, lineGap: 3 });
      return y + h + 6;
    }
  }
}

// ─── Content cleaner ───────────────────────────────────────────────────────────

function cleanChapterContent(content: string, chapterTitle: string, ebookTitle: string): string {
  let c = content.trim();
  // Remove leading heading that duplicates the chapter title
  for (const prefix of [`### ${chapterTitle}`, `## ${chapterTitle}`, `# ${chapterTitle}`, chapterTitle]) {
    if (c.startsWith(prefix)) { c = c.slice(prefix.length).trim(); break; }
  }
  if (c.startsWith(`# ${ebookTitle}`)) c = c.slice(`# ${ebookTitle}`.length).trim();
  c = c.replace(/^Chapitre\s+\d+\s*[:\-–]\s*/i, "").trim();
  // Collapse 3+ blank lines to 2
  c = c.replace(/\n{3,}/g, "\n\n");
  return c;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function generateEbookPdf(options: GeneratePdfOptions): Promise<{ key: string; url: string }> {
  const {
    ebookId, title, subject, language, tone, chapters,
    hasWatermark, watermarkText = "Generated by EbookAI Studio",
  } = options;

  return new Promise((resolve, reject) => {
    // autoFirstPage: false — we control every page ourselves
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: false,
      bufferPages: false,
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
      } catch (err) { reject(err); }
    });

    // ── Cover page ────────────────────────────────────────────────────────────
    doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.coverBg).fillOpacity(1).fill();
    doc.rect(0, 0, PAGE_W, 8).fillColor(C.accent).fillOpacity(1).fill();

    // Decorative circle
    doc.circle(PAGE_W / 2, 160, 52).fillColor(C.accent).fillOpacity(0.12).fill();
    doc.circle(PAGE_W / 2, 160, 52).strokeColor(C.accent).strokeOpacity(0.35).lineWidth(1).stroke();

    // Title block — measure first, then draw
    doc.font("Helvetica-Bold").fontSize(30);
    const titleH = doc.heightOfString(title, { width: CONTENT_W });
    doc.fillColor(C.white).fillOpacity(1).text(title, MARGIN, 220, { align: "center", width: CONTENT_W });

    const lineY = 220 + titleH + 18;
    doc.moveTo(PAGE_W / 2 - 40, lineY).lineTo(PAGE_W / 2 + 40, lineY)
      .strokeColor(C.accent).strokeOpacity(1).lineWidth(2).stroke();

    // Subject
    doc.font("Helvetica").fontSize(13);
    const subjectH = doc.heightOfString(subject, { width: CONTENT_W });
    doc.fillColor(C.accentLight).fillOpacity(1).text(subject, MARGIN, lineY + 18, { align: "center", width: CONTENT_W });

    // Metadata
    const toneLabels: Record<string, string> = {
      professional: "Professionnel", casual: "Décontracté",
      academic: "Académique", creative: "Créatif", motivational: "Motivant",
    };
    const metaY = lineY + 18 + subjectH + 20;
    doc.font("Helvetica").fontSize(10);
    doc.fillColor(C.textDim).fillOpacity(1).text(
      `${language}  ·  ${toneLabels[tone] || tone}  ·  ${chapters.length} chapitre${chapters.length > 1 ? "s" : ""}`,
      MARGIN, metaY, { align: "center", width: CONTENT_W }
    );

    // Branding footer
    doc.font("Helvetica").fontSize(9);
    doc.fillColor(C.separator).fillOpacity(1).text("EbookAI Studio", MARGIN, PAGE_H - 90, { align: "center", width: CONTENT_W });

    if (hasWatermark) drawWatermark(doc, watermarkText, 48);

    // ── Table of Contents ─────────────────────────────────────────────────────
    doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
    doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();

    doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(20);
    doc.text("Table des matières", MARGIN, 50, { width: CONTENT_W });
    doc.moveTo(MARGIN, 82).lineTo(PAGE_W - MARGIN, 82)
      .strokeColor(C.accent).strokeOpacity(1).lineWidth(0.8).stroke();

    let tocY = 98;
    for (const ch of chapters) {
      doc.font("Helvetica").fontSize(11);
      const rowH = Math.max(doc.heightOfString(ch.title, { width: CONTENT_W - 28 }), 14);
      if (tocY + rowH > BOTTOM_LIMIT) {
        doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
        doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
        doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
        tocY = 50;
      }
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10);
      doc.text(`${ch.chapterNumber}.`, MARGIN, tocY, { width: 24 });
      doc.fillColor(C.textPrimary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(ch.title, MARGIN + 28, tocY, { width: CONTENT_W - 28 });
      tocY += rowH + 10;
    }

    // ── Chapters ──────────────────────────────────────────────────────────────
    let isFirstChapter = true;
    for (const ch of chapters) {
      // Only add a new page for the first chapter; subsequent chapters continue on the same page
      let startY: number;
      if (isFirstChapter) {
        startY = addContentPage(doc, hasWatermark, watermarkText);
        isFirstChapter = false;
      } else {
        // Check if there's enough space for chapter header; if not, add a new page
        const spaceNeeded = 100; // Approximate space for chapter header + content
        if (doc.y + spaceNeeded > BOTTOM_LIMIT) {
          startY = addContentPage(doc, hasWatermark, watermarkText);
        } else {
          // Add some spacing between chapters on the same page
          startY = doc.y + 24;
        }
      }

      // Chapter label
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10);
      doc.text(`CHAPITRE ${ch.chapterNumber}`, MARGIN, startY - 4, { width: CONTENT_W });

      // Chapter title
      doc.font("Helvetica-Bold").fontSize(20);
      const chTitleH = doc.heightOfString(ch.title, { width: CONTENT_W });
      doc.fillColor(C.white).fillOpacity(1).text(ch.title, MARGIN, startY + 12, { width: CONTENT_W });

      const sepY = startY + 12 + chTitleH + 10;
      doc.moveTo(MARGIN, sepY).lineTo(PAGE_W - MARGIN, sepY)
        .strokeColor(C.accent).strokeOpacity(1).lineWidth(0.5).stroke();

      let y = sepY + 18;

      // Parse and render content blocks
      const cleanedContent = cleanChapterContent(ch.content, ch.title, title);
      const blocks = parseMarkdownBlocks(cleanedContent);

      for (const block of blocks) {
        y = renderBlock(doc, block, y, hasWatermark, watermarkText);
      }

      // Page number — draw on the last page of this chapter
      doc.fillColor(C.textDim).fillOpacity(1).font("Helvetica").fontSize(9);
      doc.text(`${ch.chapterNumber}`, MARGIN, PAGE_H - 50, { align: "center", width: CONTENT_W });
    }

    doc.end();
  });
}
