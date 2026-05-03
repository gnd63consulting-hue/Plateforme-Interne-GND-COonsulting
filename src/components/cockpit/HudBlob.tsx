/**
 * SVG decorative glow blob à placer dans le coin d'un panneau cockpit.
 * Inspiré de "Statistics Card 2" sur 21st.dev, recoloré amber pour bloom
 * additif sur fond bronze.
 *
 * À placer dans un parent en `position: relative; overflow: hidden`.
 */
export default function HudBlob({
  position = 'top-right',
  size = 'md',
}: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 120 : size === 'lg' ? 200 : 160;
  const posClass = {
    'top-right': 'right-0 top-0',
    'top-left': 'left-0 top-0',
    'bottom-right': 'right-0 bottom-0',
    'bottom-left': 'left-0 bottom-0',
  }[position];

  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute z-0 ${posClass}`}
      width={dim}
      height={dim}
      viewBox="0 0 200 200"
      style={{ mixBlendMode: 'screen' }}
    >
      <defs>
        <filter id={`blob-blur-${position}-${size}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={`blob-blur-tight-${position}-${size}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      {/* Big haze background */}
      <ellipse
        cx="160"
        cy="60"
        rx="60"
        ry="30"
        fill="#FFA060"
        fillOpacity="0.18"
        filter={`url(#blob-blur-${position}-${size})`}
      />
      {/* Hot core */}
      <circle
        cx="170"
        cy="50"
        r="14"
        fill="#FFA060"
        fillOpacity="0.32"
        filter={`url(#blob-blur-tight-${position}-${size})`}
      />
    </svg>
  );
}
