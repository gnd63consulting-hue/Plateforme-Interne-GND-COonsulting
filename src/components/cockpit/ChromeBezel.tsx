/**
 * Wrapper qui simule la lunette métallique chromée d'un compteur Alfa Romeo.
 * Conic-gradient bronze→cream→bronze sur l'anneau extérieur + inner ring
 * amber-glow pour la réflexion.
 *
 * Usage : <ChromeBezel><SpeedometerGauge .../></ChromeBezel>
 */
export default function ChromeBezel({
  children,
  glow = false,
}: {
  children: React.ReactNode;
  glow?: boolean;
}) {
  const glowClass = glow
    ? 'shadow-[0_0_32px_rgba(232,133,61,0.25),0_8px_24px_rgba(0,0,0,0.4)]'
    : 'shadow-[0_8px_24px_rgba(0,0,0,0.4)]';
  return (
    <div
      className={`relative rounded-full p-[2px] ${glowClass}`}
      style={{
        background:
          'conic-gradient(from 180deg, #3D1F1E, #A0735C, #FDF6EE, #A0735C, #3D1F1E, #A0735C, #FDF6EE, #A0735C, #3D1F1E)',
      }}
    >
      <div
        className="relative rounded-full p-3 ring-1 ring-inset ring-brand/20"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #3D1F1E 0%, #1A0F0E 80%)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
