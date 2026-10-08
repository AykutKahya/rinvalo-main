"use client";

import { useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

/** Native share sheet on phones, copy-link everywhere else. */
export function ShareButton({ title, lang }: { title: string; lang: Lang }) {
  const t = dict(lang).share;
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or blocked: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button type="button" className="share-btn" onClick={share} aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {copied ? t.copied : t.button}
    </button>
  );
}
