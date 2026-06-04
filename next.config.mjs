/** @type {import('next').NextConfig} */
const nextConfig = {
  // 100% static, client-side app — deployable to any free static host
  // (Vercel, Cloudflare Pages, GitHub Pages, Netlify) with zero server cost.
  output: "export",
  // next/image can't optimize on a static host; we don't use it anyway.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
