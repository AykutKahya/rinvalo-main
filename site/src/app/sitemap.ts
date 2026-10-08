import type { MetadataRoute } from "next";
import { getMatches, getSeason, LEAGUES, seasonTeams } from "@/lib/data";
import { paths } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

const tr = paths("tr");
const en = paths("en");

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = getSeason().updatedAt || undefined;
  // One entry per page, in Turkish, with the English version as its hreflang alternate.
  const page = (trPath: string, enPath: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${trPath}`,
    lastModified: updated,
    priority,
    alternates: { languages: { tr: `${siteUrl}${trPath}`, en: `${siteUrl}${enPath}` } },
  });
  const pages = [
    page(tr.home, en.home, 1),
    page(tr.headlines, en.headlines, 0.8),
    page(tr.leagues, en.leagues, 0.7),
    page(tr.analysis, en.analysis, 0.6),
    page(tr.power, en.power, 0.6),
    page(tr.surprises, en.surprises, 0.6),
    page(tr.accuracy, en.accuracy, 0.5),
    ...LEAGUES.map((l) => page(tr.leagueOf(l.code), en.leagueOf(l.code), 0.7)),
    ...seasonTeams().map((t) => page(tr.teamOf(t.slug), en.teamOf(t.slug), 0.5)),
    ...getMatches().map((m) => page(tr.matchOf(m.id), en.matchOf(m.id), m.status === "finished" ? 0.3 : 0.6)),
  ];
  // English URLs get their own entries too, pointing back the same way.
  return pages.flatMap((p) => [p, { ...p, url: p.alternates!.languages!.en as string }]);
}
