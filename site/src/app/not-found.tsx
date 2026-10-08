import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card empty" style={{ maxWidth: 520, margin: "40px auto" }}>
      <b>Bu sayfa bulunamadı</b>
      <p>Aradığın maç ya da takım bu sezon listemizde yok.</p>
      <Link href="/" className="btn">
        Maçlara dön
      </Link>
    </div>
  );
}
