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
    openfootball: "england/master/2026-27/1-premierleague.txt",
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
    openfootball: "espana/master/2026-27/1-liga.txt",
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
    openfootball: "italy/master/2026-27/1-seriea.txt",
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
    openfootball: "deutschland/master/2026-27/1-bundesliga.txt",
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
    openfootball: "england/master/2026-27/2-championship.txt",
    // Top 2 go up automatically; "europe" is the promotion line here.
    zones: { europe: 2, relegation: 3 },
    accent: "#1d2b6b",
  },
];

export const SEASON = "2026-27";
export const TSDB_SEASON = "2026-2027";

export function leagueByCode(code: string): League | undefined {
  return LEAGUES.find((l) => l.code === code);
}

const COUNTRY_EN: Record<string, string> = { Türkiye: "Türkiye", İngiltere: "England", İspanya: "Spain", İtalya: "Italy", Almanya: "Germany", Fransa: "France", Hollanda: "Netherlands", Portekiz: "Portugal" };

export function countryOf(l: League, lang: "tr" | "en"): string {
  return lang === "en" ? (COUNTRY_EN[l.country] ?? l.country) : l.country;
}

/** Uppercased team names need their own language: BEŞİKTAŞ keeps its dotted İ, LIVERPOOL does not get one. */
export const nameLang = (league: string) => (league === "super-lig" ? "tr" : "en");
