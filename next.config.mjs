import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  // 100% static, client-side app — deployable to any free static host
  // (Vercel, Cloudflare Pages, GitHub Pages, Netlify) with zero server cost.
  // Only enable static export during production build, NOT during `next dev`
  // (output:export breaks the dev server's chunk serving).
  ...(phase === PHASE_PRODUCTION_BUILD ? { output: "export" } : {}),
  // next/image can't optimize on a static host; we don't use it anyway.
  images: { unoptimized: true },
  reactStrictMode: true,
});

export default nextConfig;
