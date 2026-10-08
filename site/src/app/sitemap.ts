import type { MetadataRoute } from "next";
import { getMatches, getSeason, LEAGUES, seasonTeams } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = getSeason().updatedAt || undefined;
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${siteUrl}${path}`, lastModified: updated, priority });
  return [
    page("/", 1),
    page("/manset", 0.8),
    page("/ligler", 0.7),
    page("/analiz", 0.6),
    page("/analiz/guc", 0.6),
    page("/analiz/surprizler", 0.6),
    page("/analiz/basari", 0.5),
    ...LEAGUES.map((l) => page(`/lig/${l.code}`, 0.7)),
    ...seasonTeams().map((t) => page(`/takim/${t.slug}`, 0.5)),
    ...getMatches().map((m) => page(`/mac/${m.id}`, m.status === "finished" ? 0.3 : 0.6)),
  ];
}
