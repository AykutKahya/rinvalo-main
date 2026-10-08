export const TZ = "Europe/Istanbul";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longDayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, weekday: "short" });
const dayNumFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric" });
const dateFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });

/** YYYY-MM-DD in Istanbul time. */
export function dayKey(iso: string | number | Date): string {
  return dayKeyFmt.format(new Date(iso));
}
export const time = (iso: string) => timeFmt.format(new Date(iso));
export const longDay = (iso: string) => longDayFmt.format(new Date(iso));
export const shortDay = (iso: string) => shortDayFmt.format(new Date(iso)).replace(".", "");
export const dayNum = (iso: string) => dayNumFmt.format(new Date(iso));
export const fullDate = (iso: string) => dateFmt.format(new Date(iso));

/** "%61" — Turkish puts the percent sign first. */
export function pct(p: number, digits = 0): string {
  return `%${(p * 100).toFixed(digits).replace(".", ",")}`;
}

export const OUTCOME_LABEL = ["Ev sahibi", "Beraberlik", "Deplasman"] as const;
