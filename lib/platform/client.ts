import { supabase } from "@/lib/supabase";
export async function rpc<T>(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw Error(error.message);
  return data as T;
}
export async function media<T>(action: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("platform-media", { body: { action, ...args } });
  if (error) {
    let msg = "Media service unavailable. Nothing was published.";
    try {
      msg = (await error.context.json()).error || msg;
    } catch {}
    throw Error(msg);
  }
  return data as T;
}
export async function readFile(file: File) {
  if (!file.size || file.size > 14 * 1024 * 1024) throw Error("Choose a non-empty file under 14 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    head = String.fromCharCode(...Array.from(bytes));
  if (
    !(head.startsWith("%PDF-") || head.startsWith("PK\x03\x04") ||
      head.startsWith("\x89PNG\r\n\x1a\n") || head.startsWith("\xff\xd8\xff") ||
      head.startsWith("RIFF") && head.slice(8) === "WEBP" || head.slice(4, 8) === "ftyp")
  ) throw Error("Unsupported file signature.");
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(Error("Cannot read this file."));
    r.readAsDataURL(file);
  });
}
