import Link from "next/link";
import { dict, paths, type Lang } from "@/lib/i18n";

export function NotFound({ lang }: { lang: Lang }) {
  const t = dict(lang).notFound;
  return (
    <div className="card empty" style={{ maxWidth: 520, margin: "40px auto" }}>
      <b>{t.title}</b>
      <Link href={paths(lang).home} className="btn">
        {t.back}
      </Link>
    </div>
  );
}
