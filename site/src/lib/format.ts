import type { Lang } from "./i18n";

/** Turkish pages show Istanbul time, English pages UK time. */
const TZ: Record<Lang, string> = { tr: "Europe/Istanbul", en: "Europe/London" };
const LOCALE: Record<Lang, string> = { tr: "tr-TR", en: "en-GB" };

function build(lang: Lang) {
  const timeZone = TZ[lang];
  const loc = LOCALE[lang];
  const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFmt = new Intl.DateTimeFormat(loc, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const longDayFmt = new Intl.DateTimeFormat(loc, { timeZone, weekday: "long", day: "numeric", month: "long" });
  const shortDayFmt = new Intl.DateTimeFormat(loc, { timeZone, weekday: "short" });
  const dayNumFmt = new Intl.DateTimeFormat(loc, { timeZone, day: "numeric" });
  const dayMonthFmt = new Intl.DateTimeFormat(loc, { timeZone, day: "numeric", month: "short" });
  const dateFmt = new Intl.DateTimeFormat(loc, { timeZone, day: "numeric", month: "long", year: "numeric" });
  const comma = lang === "tr";
  const dec = (x: number, digits = 1) => (comma ? x.toFixed(digits).replace(".", ",") : x.toFixed(digits));
  return {
    /** YYYY-MM-DD in the page's time zone. */
    dayKey: (iso: string | number | Date) => dayKeyFmt.format(new Date(iso)),
    time: (iso: string) => timeFmt.format(new Date(iso)),
    longDay: (iso: string) => longDayFmt.format(new Date(iso)),
    /** "3 Kas" / "3 Nov". */
    dayMonth: (iso: string) => dayMonthFmt.format(new Date(iso)).replace(".", ""),
    shortDay: (iso: string) => shortDayFmt.format(new Date(iso)).replace(".", ""),
    dayNum: (iso: string) => dayNumFmt.format(new Date(iso)),
    fullDate: (iso: string | number | Date) => dateFmt.format(new Date(iso)),
    /** "%61" in Turkish (percent sign first), "61%" in English. */
    // A chance that rounds to 0 or 100 but is neither reads as "<1" / ">99": "%0" sounds impossible.
    pct: (p: number, digits = 0) => {
      const unit = 10 ** -digits / 2 / 100;
      const [lead, x] = p > 0 && p < unit ? ["<", 10 ** -digits / 100] : p < 1 && p > 1 - unit ? [">", 1 - 10 ** -digits / 100] : ["", p];
      return lead + (comma ? `%${dec(x * 100, digits)}` : `${dec(x * 100, digits)}%`);
    },
    /** Decimal with the language's separator. */
    dec,
    int: (n: number) => n.toLocaleString(loc),
  };
}

export type Format = ReturnType<typeof build>;
const CACHE: Partial<Record<Lang, Format>> = {};

export function fmt(lang: Lang): Format {
  return (CACHE[lang] ??= build(lang));
}
