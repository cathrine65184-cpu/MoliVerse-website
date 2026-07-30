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
  const pdfjs = await import("pdfjs-dist");
  // The worker ships as a static asset rather than a bundled chunk so the
  // export stays a plain static site.
  pdfjs.GlobalWorkerOptions.workerSrc = withBasePath("/pdfjs/pdf.worker.min.mjs");

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(line);
      // Stop early once there is more than the prompt can use anyway.
      if (pages.join("\n").length > MAX_CHARS_PER_FILE) break;
    }
  } finally {
    await doc.destroy();
  }
  return pages.join("\n");
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
