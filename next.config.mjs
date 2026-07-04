// GitHub Pages serves the site from /MoliVerse-website, so the base path is
// only applied when building inside GitHub Actions.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath: isGithubActions ? "/MoliVerse-website" : "",
};

export default nextConfig;
