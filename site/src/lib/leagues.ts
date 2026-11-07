/** The season the site shows. Changing it starts a new season; the bot archives the old one. */
export const SEASON = "2026-27";
export const TSDB_SEASON = `${SEASON.slice(0, 4)}-20${SEASON.slice(5)}`;

/**
 * Fixture ids carry the season from 2027-28 on, so a pairing that repeats next season gets a new
 * id. This season's ids stay as they are: match links and saved picks use them.
 */
export function fixtureId(...parts: (string | number)[]): string {
  const id = parts.join("-");
  return SEASON === "2026-27" ? id : `${id}-${SEASON}`;
}

export type LeagueCode = "super-lig" | "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1" | "eredivisie" | "primeira-liga" | "championship";

export interface League {
  code: LeagueCode;
  name: string;
  country: string;
  /** football-data.co.uk division code, used only for the bundled history files. */
  csv: string;
  /** TheSportsDB league id (free public key). */
  tsdb: number;
  rounds: number;
  /** openfootball season file, used as a fallback source for results. */
  openfootball: string | null;
  /** Table zones: positions [from, to] inclusive. */
  zones: { europe: number; relegation: number };
  accent: string;
}

export const LEAGUES: League[] = [
  {
    code: "super-lig",
    name: "Süper Lig",
    country: "Türkiye",
    csv: "T1",
    tsdb: 4339,
    rounds: 34,
    openfootball: null,
    zones: { europe: 4, relegation: 4 },
    accent: "#e30a17",
  },
  {
    code: "premier-league",
    name: "Premier League",
    country: "İngiltere",
    csv: "E0",
    tsdb: 4328,
    rounds: 38,
    openfootball: `england/master/${SEASON}/1-premierleague.txt`,
    zones: { europe: 4, relegation: 3 },
    accent: "#3d195b",
  },
  {
    code: "la-liga",
    name: "La Liga",
    country: "İspanya",
    csv: "SP1",
    tsdb: 4335,
    rounds: 38,
    openfootball: `espana/master/${SEASON}/1-liga.txt`,
    zones: { europe: 4, relegation: 3 },
    accent: "#ee8707",
  },
  {
    code: "serie-a",
    name: "Serie A",
    country: "İtalya",
    csv: "I1",
    tsdb: 4332,
    rounds: 38,
    openfootball: `italy/master/${SEASON}/1-seriea.txt`,
    zones: { europe: 4, relegation: 3 },
    accent: "#008fd7",
  },
  {
    code: "bundesliga",
    name: "Bundesliga",
    country: "Almanya",
    csv: "D1",
    tsdb: 4331,
    rounds: 34,
    openfootball: `deutschland/master/${SEASON}/1-bundesliga.txt`,
    zones: { europe: 4, relegation: 2 },
    accent: "#d20515",
  },
  {
    code: "ligue-1",
    name: "Ligue 1",
    country: "Fransa",
    csv: "F1",
    tsdb: 4334,
    rounds: 34,
    openfootball: null,
    zones: { europe: 4, relegation: 2 },
    accent: "#091c3e",
  },
  {
    code: "eredivisie",
    name: "Eredivisie",
    country: "Hollanda",
    csv: "N1",
    tsdb: 4337,
    rounds: 34,
    openfootball: null,
    zones: { europe: 3, relegation: 2 },
    accent: "#e4022d",
  },
  {
    code: "primeira-liga",
    name: "Primeira Liga",
    country: "Portekiz",
    csv: "P1",
    tsdb: 4344,
    rounds: 34,
    openfootball: null,
    zones: { europe: 3, relegation: 2 },
    accent: "#00a650",
  },
  {
    code: "championship",
    name: "Championship",
    country: "İngiltere",
    csv: "E1",
    tsdb: 4329,
    rounds: 46,
    openfootball: `england/master/${SEASON}/2-championship.txt`,
    // Top 2 go up automatically; "europe" is the promotion line here.
    zones: { europe: 2, relegation: 3 },
    accent: "#1d2b6b",
  },
];


export function leagueByCode(code: string): League | undefined {
  return LEAGUES.find((l) => l.code === code);
}

const COUNTRY_EN: Record<string, string> = { Türkiye: "Türkiye", İngiltere: "England", İspanya: "Spain", İtalya: "Italy", Almanya: "Germany", Fransa: "France", Hollanda: "Netherlands", Portekiz: "Portugal" };

export function countryOf(l: League, lang: "tr" | "en"): string {
  return lang === "en" ? (COUNTRY_EN[l.country] ?? l.country) : l.country;
}

/** Uppercased team names need their own language: BEŞİKTAŞ keeps its dotted İ, LIVERPOOL does not get one. */
export const nameLang = (league: string) => (league === "super-lig" ? "tr" : "en");


/** UEFA club competitions. Fixtures live in data/cups.json, apart from the domestic season. */
export type CupCode = "ucl" | "uel" | "uecl";

export interface Cup {
  code: CupCode;
  name: string;
  tsdb: number;
  accent: string;
  /** League phase table: direct to the round of 16 / play-off places. */
  zones: { direct: number; playoff: number };
}

export const CUPS: Cup[] = [
  { code: "ucl", name: "Şampiyonlar Ligi", tsdb: 4480, accent: "#0e1e5b", zones: { direct: 8, playoff: 24 } },
  { code: "uel", name: "Avrupa Ligi", tsdb: 4481, accent: "#f26722", zones: { direct: 8, playoff: 24 } },
  { code: "uecl", name: "Konferans Ligi", tsdb: 5071, accent: "#00b050", zones: { direct: 8, playoff: 24 } },
];

const CUP_EN: Record<CupCode, string> = { ucl: "Champions League", uel: "Europa League", uecl: "Conference League" };

export const cupByCode = (code: string) => CUPS.find((c) => c.code === code);
export const isCup = (code: string) => CUPS.some((c) => c.code === code);

/** TheSportsDB round numbers: 1-8 league phase, 32 play-off, 16 round of 16, 125 quarter, 150 semi, 200 final. */
export const CUP_ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8, 32, 16, 125, 150, 200];

/** Display name of a league or cup in the page language. */
export function competitionName(code: string, lang: "tr" | "en"): string {
  const cup = cupByCode(code);
  if (cup) return lang === "en" ? CUP_EN[cup.code] : cup.name;
  return leagueByCode(code)?.name ?? code;
}

/** Name, colour and code of any competition, for lists that mix leagues and cups. */
export function competitions(lang: "tr" | "en") {
  return [...LEAGUES.map((l) => ({ code: l.code as string, name: l.name, accent: l.accent })), ...CUPS.map((c) => ({ code: c.code as string, name: competitionName(c.code, lang), accent: c.accent }))];
}

/** Coloured table places for a league or a cup's league phase (8 direct, 9-24 play-off, 25-36 out). */
export function zonesOf(code: string): { europe: number; relegation: number } {
  const cup = cupByCode(code);
  if (cup) return { europe: cup.zones.direct, relegation: 36 - cup.zones.playoff };
  return leagueByCode(code)?.zones ?? { europe: 0, relegation: 0 };
}
