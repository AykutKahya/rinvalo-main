import type { Metadata } from "next";
import { CompareTool } from "@/components/CompareTool";
import { alternates, dict, type Lang } from "@/lib/i18n";

export function compareMetadata(lang: Lang): Metadata {
  const t = dict(lang).compare;
  return { title: t.title, description: t.description, alternates: alternates(lang, "compare") };
}

export function Compare({ lang }: { lang: Lang }) {
  const d = dict(lang);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">{d.analysis.eyebrow}</span>
          <h1>{d.compare.title}</h1>
        </div>
      </div>
      <CompareTool lang={lang} />
    </>
  );
}
