import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { identify, processFile } from "./process.mjs";
test("server strips metadata and emits an actual thumbnail only after scan", async () => {
  const png = await sharp({ create: { width: 420, height: 330, channels: 3, background: "#a5c486" } })
    .withMetadata({ density: 300 }).png().toBuffer();
  let scanned = false;
  const checked = await processFile(png, "image/png", true, async () => {
    scanned = true;
  });
  assert.ok(scanned);
  const img = await sharp(Buffer.from(checked.data, "base64")).metadata(),
    th = await sharp(Buffer.from(checked.thumb, "base64")).metadata();
  assert.equal(img.format, "webp");
  assert.equal(img.exif, undefined);
  assert.equal(th.width, 240);
  await assert.rejects(processFile(png, "image/jpeg", true, async () => {}));
  await assert.rejects(processFile(png, "image/png", true, async () => {
    throw Error("Scanner offline");
  }));
});
test("spoofed HTML, invalid slides and non-image art rejected", async () => {
  assert.throws(() => identify(Buffer.from("<script>alert(1)</script>")));
  await assert.rejects(
    processFile(
      Buffer.from("PK\x03\x04fake"),
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      false,
      async () => {},
    ),
  );
  await assert.rejects(processFile(Buffer.from("%PDF-1.4\n%%EOF"), "application/pdf", true, async () => {}));
});
