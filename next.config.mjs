/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ Lint NON bloquant au build : le repo a un backlog lint préexistant
    // (react/no-unescaped-entities + une eslint-disable @typescript-eslint/no-explicit-any
    // dont le plugin n'est pas chargé) qui ferait échouer next build.
    // Lint tourne en CI (non bloquant). TODO: nettoyer le backlog puis passer à false.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
