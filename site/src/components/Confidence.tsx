import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";

/** Hit rates per level over the last three seasons (engine backtest). */
const RATE = { high: 0.65, medium: 0.49, low: 0.36 } as const;

export type Level = keyof typeof RATE;

export function ConfidencePill({ level, lang }: { level?: Level; lang: Lang }) {
  if (!level) return null;
  const t = dict(lang).conf;
  return (
    <span className={`conf conf-${level}`} title={t.hint(fmt(lang).pct(RATE[level]))}>
      <i aria-hidden="true" />
      {t[level]}
    </span>
  );
}

export function ConfidenceDot({ level, lang }: { level?: Level; lang: Lang }) {
  if (!level) return null;
  const label = dict(lang).conf[level];
  return <i className={`conf-dot conf-${level}`} title={label} aria-label={label} />;
}
