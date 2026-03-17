/**
 * Pingi logo — smooth abstract AI mark.
 * Flowing curves instead of sharp lines.
 * Works at any size; defaults to 40×40.
 */
export default function PingiLogo({ size = 40 }: { size?: number }) {
  const id = `pingi-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pingi logo"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        <linearGradient id={`${id}-petal1`} x1="30" y1="20" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        <linearGradient id={`${id}-petal2`} x1="20" y1="60" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        <linearGradient id={`${id}-petal3`} x1="80" y1="20" x2="40" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>

        <linearGradient id={`${id}-petal4`} x1="60" y1="100" x2="60" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        <radialGradient id={`${id}-core`} cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#6366F1" />
        </radialGradient>

        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* background */}
      <circle cx="60" cy="60" r="60" fill={`url(#${id}-bg)`} />

      {/* ambient glow */}
      <circle cx="60" cy="60" r="40" fill={`url(#${id}-glow)`} />

      {/* 4 smooth petals — organic curves radiating from center */}
      <g opacity="0.9">
        {/* top petal */}
        <path
          d="M60 18 C52 32, 48 44, 60 54 C72 44, 68 32, 60 18Z"
          fill={`url(#${id}-petal1)`}
        />
        {/* right petal */}
        <path
          d="M102 60 C88 52, 76 48, 66 60 C76 72, 88 68, 102 60Z"
          fill={`url(#${id}-petal2)`}
        />
        {/* bottom petal */}
        <path
          d="M60 102 C68 88, 72 76, 60 66 C48 76, 52 88, 60 102Z"
          fill={`url(#${id}-petal3)`}
        />
        {/* left petal */}
        <path
          d="M18 60 C32 68, 44 72, 54 60 C44 48, 32 52, 18 60Z"
          fill={`url(#${id}-petal4)`}
        />
      </g>

      {/* 4 diagonal petals — smaller, rotated 45deg */}
      <g opacity="0.55">
        <path
          d="M86 34 C76 40, 72 48, 64 56 C72 52, 80 44, 86 34Z"
          fill={`url(#${id}-petal2)`}
        />
        <path
          d="M86 86 C80 76, 72 72, 64 64 C72 68, 76 80, 86 86Z"
          fill={`url(#${id}-petal1)`}
        />
        <path
          d="M34 86 C44 80, 48 72, 56 64 C48 68, 40 76, 34 86Z"
          fill={`url(#${id}-petal3)`}
        />
        <path
          d="M34 34 C40 44, 48 48, 56 56 C48 52, 44 40, 34 34Z"
          fill={`url(#${id}-petal4)`}
        />
      </g>

      {/* core */}
      <circle cx="60" cy="60" r="11" fill={`url(#${id}-core)`} />
      <circle cx="60" cy="60" r="4" fill="#fff" opacity="0.95" />
    </svg>
  );
}
