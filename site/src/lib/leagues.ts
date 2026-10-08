export type LeagueCode = "super-lig" | "premier-league" | "la-liga" | "serie-a" | "bundesliga";

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
];

export const SEASON = "2026-27";
export const TSDB_SEASON = "2026-2027";

export function leagueByCode(code: string): League | undefined {
  return LEAGUES.find((l) => l.code === code);
}
