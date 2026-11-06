import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { timingSafeEqual } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processFile } from "./process.mjs";
const token = process.env.MEDIA_WORKER_TOKEN;
if (!token || token.length < 32) throw Error("Configure a private worker token (at least 32 characters).");
async function scan(bytes, mime) {
  const dir = await mkdtemp(join(tmpdir(), "moli-scan-"));
  try {
    const path = join(dir, "input");
    await writeFile(path, bytes, { mode: 0o600 });
    const run = (cmd, args) =>
      promisify(execFile)(cmd, args, {
        timeout: 15000,
        maxBuffer: 16384,
        env: { ...process.env, LC_ALL: "C" },
      });
    await run("clamdscan", ["--fdpass", "--no-summary", path]);
    if (mime === "application/pdf") {
      const { stdout } = await run("pdfinfo", [path]);
      const pages = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (!pages || pages > 400 || !/^Encrypted:\s+no/m.test(stdout) || /^JavaScript:\s+yes/m.test(stdout)) {
        throw Error("Unsafe PDF");
      }
    }
    if (mime === "video/mp4") {
      const { stdout } = await run("ffprobe", [
        "-protocol_whitelist",
        "file",
        "-v",
        "error",
        "-show_entries",
        "format=format_name,duration:stream=codec_type",
        "-of",
        "json",
        path,
      ]);
      const video = JSON.parse(stdout);
      if (
        !video.streams?.some((s) => s.codec_type === "video") ||
        !String(video.format?.format_name).includes("mp4") ||
        !(Number(video.format.duration) > 0 && Number(video.format.duration) <= 3600)
      ) throw Error("Invalid video");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
let active = 0;
http.createServer(async (req, res) => {
  const a = Buffer.from(req.headers.authorization || ""), b = Buffer.from("Bearer " + token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.writeHead(403).end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/process") {
    res.writeHead(404).end();
    return;
  }
  if (active >= 2) {
    res.writeHead(429).end();
    return;
  }
  active++;
  try {
    const chunks = [];
    let len = 0;
    for await (const c of req) {
      len += c.length;
      if (len > 14 * 1024 * 1024) throw Error();
      chunks.push(c);
    }
    const result = await processFile(
      Buffer.concat(chunks),
      String(req.headers["content-type"]),
      req.headers["x-art"] === "1",
      scan,
    );
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(
      JSON.stringify(result),
    );
  } catch {
    res.writeHead(422).end("Rejected: invalid file, unsafe file, or scanner unavailable.");
  } finally {
    active--;
  }
}).listen(Number(process.env.PORT || 8789), "127.0.0.1");
