export function InfografLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 48"
      fill="none"
      className={className}
    >
      {/* Red accent mark */}
      <rect x="0" y="10" width="6" height="28" rx="3" fill="#ff0c3c" />
      {/* Brand text — uses currentColor so it adapts to dark/light mode via CSS */}
      <text
        x="20"
        y="34"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="1"
        fill="currentColor"
      >
        INFOGRAF
      </text>
      {/* Since 1992 tagline */}
      <text
        x="152"
        y="36"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
        fontSize="10"
        letterSpacing="0.5"
        fill="currentColor"
        opacity="0.5"
      >
        SINCE 1992
      </text>
    </svg>
  );
}
