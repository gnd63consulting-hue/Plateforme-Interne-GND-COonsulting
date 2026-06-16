/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint vérifié clean (next lint = 0 erreur / 0 warning, 16/06) → on bloque
    // au build. Config : .eslintrc.json (next/core-web-vitals). CI : lint bloquant.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
