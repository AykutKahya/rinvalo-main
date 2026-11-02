"use client";

import { useEffect } from "react";

/** Sends people on while link previews, which run no scripts, still read the page's tags. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => window.location.replace(to), [to]);
  return null;
}
