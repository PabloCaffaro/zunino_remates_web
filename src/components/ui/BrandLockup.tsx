type BrandLockupProps = {
  subtitle?: string;
  inverse?: boolean;
  compact?: boolean;
};

export function BrandLockup({
  subtitle = "Remates en vivo",
  inverse = false,
  compact = false,
}: BrandLockupProps) {
  const className = [
    "brand-lockup",
    inverse ? "brand-lockup-inverse" : "",
    compact ? "brand-lockup-compact" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={className}>
      <span className="logo-mark" aria-hidden="true">ZR</span>
      <span className="brand-lockup-copy">
        <span className="logo-title">Zunino Remates</span>
        <span className="logo-subtitle">{subtitle}</span>
      </span>
    </span>
  );
}
