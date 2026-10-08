import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card empty" style={{ maxWidth: 520, margin: "40px auto" }}>
      <b>Bu sayfa bulunamadı</b>
      <Link href="/" className="btn">
        Maçlara dön
      </Link>
    </div>
  );
}
