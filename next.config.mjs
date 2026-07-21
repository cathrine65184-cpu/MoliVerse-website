// Served from the root of the custom domain moliverse.tech, so there is no
// base path. (Static export keeps the previous NEXT_PUBLIC_BASE_PATH plumbing
// harmless: it now resolves to an empty prefix.)
const basePath = "";

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
