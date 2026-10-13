import Link from "next/link";

/** Màn chờ tải dùng chung cho các trang game. */
export function GameLoading({ text = "Đang tải…" }: { text?: string }) {
  return (
    <main className="space-bg center-screen" style={{ minHeight: "100vh" }}>
      <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>{text}</p>
    </main>
  );
}

/** Thẻ báo lỗi dùng chung (thay cho redirect phía server của repo gốc). */
export function GameErrorCard({ title, message, href = "/", label = "Về trang chủ" }: { title: string; message?: string; href?: string; label?: string }) {
  return (
    <main className="space-bg center-screen" style={{ minHeight: "100vh" }}>
      <div className="result-card">
        <h1 className="title-kid">{title}</h1>
        {message && <p className="muted">{message}</p>}
        <div className="result-actions">
          <Link href={href} className="btn btn-primary btn-lg">{label}</Link>
        </div>
      </div>
    </main>
  );
}
