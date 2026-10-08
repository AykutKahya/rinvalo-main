const LABEL = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;
const HINT = {
  high: "Son 3 sezonda bu seviyedeki tahminlerin %65'i tuttu.",
  medium: "Son 3 sezonda bu seviyedeki tahminlerin %49'u tuttu.",
  low: "Son 3 sezonda bu seviyedeki tahminlerin %36'sı tuttu.",
} as const;

export type Level = keyof typeof LABEL;

export function ConfidencePill({ level }: { level?: Level }) {
  if (!level) return null;
  return (
    <span className={`conf conf-${level}`} title={HINT[level]}>
      <i aria-hidden="true" />
      {LABEL[level]}
    </span>
  );
}

export function ConfidenceDot({ level }: { level?: Level }) {
  if (!level) return null;
  return <i className={`conf-dot conf-${level}`} title={LABEL[level]} aria-label={LABEL[level]} />;
}

export function confidenceHint(level: Level) {
  return HINT[level];
}
