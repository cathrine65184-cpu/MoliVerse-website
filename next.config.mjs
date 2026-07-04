// GitHub Pages serves the site from /MoliVerse-website, so the base path is
// only applied when building inside GitHub Actions.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const basePath = isGithubActions ? "/MoliVerse-website" : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath,
  // Unoptimized next/image does not prepend basePath to src, so components
  // read it from this env var and prefix image URLs themselves.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
