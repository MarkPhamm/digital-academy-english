import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang · Digital Academy" };

/** 404 chung cho mọi đường dẫn không khớp route nào. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl font-bold">404</p>
      <h1 className="text-2xl font-bold">Không tìm thấy trang này</h1>
      <p className="text-white/70">Đường dẫn em mở không có trên Đảo Digital Academy.</p>
      <Link href="/" className="mt-2 rounded-full bg-amber-400 px-6 py-3 font-bold text-[#030442] hover:bg-amber-300">
        Về trang chủ
      </Link>
    </main>
  );
}
