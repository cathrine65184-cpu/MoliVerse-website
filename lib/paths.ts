// next/image with `unoptimized: true` emits src as-is, so static assets need
// the GitHub Pages base path prepended manually.
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
