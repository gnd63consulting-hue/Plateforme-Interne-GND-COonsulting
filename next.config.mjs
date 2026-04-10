/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // No ESLint config shipped yet; skip during Vercel builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
