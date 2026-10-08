"use client";

import { dict, type Lang } from "@/lib/i18n";
import { useFavorites } from "./favorites";

export function FavoriteButton({ slug, name, lang }: { slug: string; name: string; lang: Lang }) {
  const t = dict(lang).team;
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(slug);
  return (
    <button type="button" className={`btn ${on ? "" : "ghost"}`} aria-pressed={on} onClick={() => toggle(slug)}>
      {on ? t.favOn : t.favOff(name)}
    </button>
  );
}
