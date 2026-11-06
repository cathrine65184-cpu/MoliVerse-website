// Served from the root of the custom domain moliverse.tech, so there is no
// base path. (Static export keeps the previous NEXT_PUBLIC_BASE_PATH plumbing
// harmless: it now resolves to an empty prefix.)
const basePath = "";
// A staging build must never mix one project's URL with another project's key.
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (apiUrl || apiKey) {
  if (!apiUrl || !apiKey) throw new Error("Configure both public staging Supabase settings.");
  let anon = apiKey.startsWith("sb_publishable_");
  if (!anon) try { anon = JSON.parse(Buffer.from(apiKey.split(".")[1], "base64url").toString()).role === "anon"; } catch {}
  if (!anon) throw new Error("Only a public Supabase publishable or anon key is allowed.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
