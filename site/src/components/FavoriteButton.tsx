"use client";

import { useFavorites } from "./favorites";

export function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(slug);
  return (
    <button type="button" className={`btn ${on ? "" : "ghost"}`} aria-pressed={on} onClick={() => toggle(slug)}>
      {on ? "★ Favorimde" : `☆ ${name} favorim olsun`}
    </button>
  );
}
