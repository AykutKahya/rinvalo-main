const LABEL = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;
const HINT = {
  high: "Modeller aynı sonucu gösteriyor ve fark büyük. Geçmiş testte bu maçların %65'i tuttu.",
  medium: "Bir taraf önde ama fark net değil. Geçmiş testte bu maçların %49'u tuttu.",
  low: "Sonuç çok açık değil ya da modeller/piyasa ayrışıyor. Geçmiş testte bu maçların %36'sı tuttu.",
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
