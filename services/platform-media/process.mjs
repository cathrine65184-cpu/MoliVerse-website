import sharp from "sharp";
import yauzl from "yauzl";
const ppt = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export function identify(b) {
  if (b.length > 14 * 1024 * 1024 || !b.length) throw Error("File size must be 1 byte to 14 MB.");
  if (b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (b.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (
    b.toString("ascii", 0, 5) === "%PDF-" &&
    b.toString("ascii", Math.max(0, b.length - 2048)).includes("%%EOF")
  ) return "application/pdf";
  if (b.toString("hex", 0, 4) === "504b0304") return ppt;
  if (
    b.toString("ascii", 4, 8) === "ftyp" && /^(isom|iso2|mp4[12]|avc1|M4V )$/.test(b.toString("ascii", 8, 12))
  ) return "video/mp4";
  throw Error("Unsupported file signature.");
}
async function slides(b) {
  await new Promise((resolve, reject) =>
    yauzl.fromBuffer(b, { lazyEntries: true }, (err, z) => {
      if (err) return reject(err);
      let count = 0, total = 0, pres = false, types = false;
      z.on("error", reject);
      z.on("end", () => pres && types ? resolve() : reject(Error("Not a PPTX presentation.")));
      z.on("entry", (e) => {
        count++;
        total += e.uncompressedSize;
        if (
          count > 2500 || total > 80 * 1024 * 1024 || (e.generalPurposeBitFlag & 1) ||
          /(vbaProject|embeddings\/|activeX\/|\.\.\/|\.exe$)/i.test(e.fileName)
        ) {
          z.close();
          return reject(Error("Unsafe or oversized presentation."));
        }
        pres ||= e.fileName === "ppt/presentation.xml";
        types ||= e.fileName === "[Content_Types].xml";
        z.readEntry();
      });
      z.readEntry();
    })
  );
}
export async function processFile(bytes, declared, art, scan) {
  const mime = identify(bytes);
  if (mime !== declared || art && !mime.startsWith("image/")) {
    throw Error("File format does not match this upload.");
  }
  if (mime === ppt) await slides(bytes);
  await scan(bytes, mime); // Required for every file; scanner failure is not a clean verdict.
  if (!mime.startsWith("image/")) return { mime, data: bytes.toString("base64") };
  const image = sharp(bytes, { limitInputPixels: 16000000, failOn: "warning" });
  const m = await image.metadata();
  if (!m.width || !m.height || m.width > 5000 || m.height > 5000 || m.pages > 1) {
    throw Error("Use a still image up to 5000 px and 16 megapixels.");
  }
  // Fresh encoding, with no withMetadata call. Strip EXIF, GPS, XMP and ICC.
  const cleaned = await image.rotate().resize({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true,
  }).webp().toBuffer();
  const thumb = await sharp(cleaned).resize({
    width: 240,
    height: 240,
    fit: "inside",
    withoutEnlargement: true,
  }).webp().toBuffer();
  return { mime: "image/webp", data: cleaned.toString("base64"), thumb: thumb.toString("base64") };
}
