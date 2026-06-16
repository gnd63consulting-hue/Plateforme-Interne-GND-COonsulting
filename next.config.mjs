/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint config présente désormais (.eslintrc.json → next/core-web-vitals),
    // et le lint tourne en CI (.github/workflows/ci.yml).
    // On garde toutefois ignoreDuringBuilds=true pour l'instant : impossible de
    // GARANTIR ici que le lint est 100% clean sur tout le repo, et un lint en
    // erreur ferait échouer CHAQUE build Vercel. Le step lint CI est
    // non-bloquant au premier passage (continue-on-error) pour absorber un
    // éventuel backlog sans casser le pipeline.
    // TODO: re-enable eslint.ignoreDuringBuilds=false once CI lint is green
    // (puis passer le step lint CI en bloquant).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
