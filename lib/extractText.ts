// MoliVerse — courseware text extraction.
//
// Teachers upload PDFs, Word docs and spreadsheets; the AI needs the words
// inside them, not just a filename. Parsing runs in the teacher's browser
// (the same place the Mentor Studio already does its face and audio work),
// so the heavy parsers stay out of the initial bundle and the file itself
// never needs a round trip just to be read.
//
// The extracted text is stored alongside the file and pasted into the model
// prompt. That is deliberately the simple version: at a handful of courses
// per teacher it comfortably fits the context window, and swapping in vector
// retrieval later only changes how `text` is selected, not how it is produced.

import { withBasePath } from "@/lib/paths";

/** Roughly a quarter of DeepSeek's window — plenty of room for the lesson prompt. */
export const MAX_CHARS_PER_FILE = 12000;

/** Collapse the whitespace that PDF and slide extraction tends to produce. */
function tidy(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clamp(text: string): string {
  return text.length > MAX_CHARS_PER_FILE ? text.slice(0, MAX_CHARS_PER_FILE) : text;
}

async function fromPdf(file: File): Promise<string> {
  return (await fromPdfDetailed(file)).pages.map(page => page.text).join("\n\n");
}

async function fromPdfDetailed(file: File): Promise<{ pages: Array<{ page: number; text: string }>; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist");
  // The worker ships as a static asset rather than a bundled chunk so the
  // export stays a plain static site.
  pdfjs.GlobalWorkerOptions.workerSrc = withBasePath("/pdfjs/pdf.worker.min.mjs");

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = doc.numPages;
  const pages: Array<{ page: number; text: string }> = [];
  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push({ page: i, text: tidy(line) });
      // Stop early once there is more than the prompt can use anyway.
      if (pages.reduce((sum, item) => sum + item.text.length, 0) > 120000) break;
    }
  } finally {
    await doc.destroy();
  }
  return { pages, pageCount };
}

export type StoryDocumentExtraction = { text: string; pageTexts?: Array<{ page: number; text: string }>; pageCount?: number; partial: boolean; error?: string };

/** Reliable source ingestion for the story-card flow: pasted text, TXT and text-layer PDFs only. */
export async function extractStoryDocument(file: File): Promise<StoryDocumentExtraction> {
  const name = file.name.toLowerCase();
  try {
    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      const result = await fromPdfDetailed(file);
      const pageTexts = result.pages.filter(page => page.text);
      const text = tidy(pageTexts.map(page => page.text).join("\n\n")).slice(0, 120000);
      if (!text) return { text: "", pageTexts: [], pageCount: result.pageCount, partial: false, error: "No selectable text was found. Scanned-page OCR is not supported yet; paste an excerpt instead." };
      return { text, pageTexts, pageCount: result.pageCount, partial: result.pages.length < result.pageCount || text.length >= 120000 };
    }
    if (name.endsWith(".txt") || file.type === "text/plain") {
      const raw = tidy(await file.text());
      return { text: raw.slice(0, 120000), partial: raw.length > 120000 };
    }
    return { text: "", partial: false, error: "This source reader currently supports TXT and text-layer PDF files. You can also paste an excerpt." };
  } catch (error) {
    console.error(`story source extraction failed for ${file.name}`, error);
    return { text: "", partial: false, error: "The file could not be parsed. Paste the relevant excerpt instead." };
  }
}

async function fromWord(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function fromSheet(file: File): Promise<string> {
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  // One CSV block per sheet, labelled — enough structure for the model to
  // tell a vocabulary list from a lesson plan.
  return book.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(book.Sheets[name]);
    return csv.trim() ? `【${name}】\n${csv}` : "";
  })
    .filter(Boolean)
    .join("\n\n");
}

/** True when we have a parser for this file — used to skip images and video. */
export function isExtractable(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  );
}

/**
 * Pull readable text out of a courseware file.
 *
 * Returns "" for anything unreadable — a scanned PDF with no text layer, a
 * legacy .doc, an unexpected parser failure. An empty result is normal and
 * simply means this file adds nothing to the knowledge base; callers should
 * carry on rather than failing the upload.
 */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    let raw = "";
    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      raw = await fromPdf(file);
    } else if (name.endsWith(".docx")) {
      raw = await fromWord(file);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      raw = await fromSheet(file);
    } else if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".md")) {
      raw = await file.text();
    } else {
      return "";
    }
    return clamp(tidy(raw));
  } catch (err) {
    console.error(`courseware extraction failed for ${file.name}`, err);
    return "";
  }
}
