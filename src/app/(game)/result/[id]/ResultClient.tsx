"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { GameErrorCard, GameLoading } from "@/components/game/GameShell";
import Stars from "@/components/game/Stars";
import type { AttemptResultResponse } from "@/lib/game/api-types";
import { GameApiError, getAttempt } from "@/lib/game/client";
import { refreshProfile } from "@/lib/game/profile-store";

export default function ResultClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AttemptResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAttempt(id)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Xu và sao vừa đổi sau lượt này → cập nhật kho hồ sơ cho Trang chủ/topbar.
        void refreshProfile();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof GameApiError && e.code === "NOT_FINISHED") {
          // Lượt chưa nộp: quay lại màn chơi (repo gốc redirect ở server).
          router.replace(e.body?.mode === "REVIEW" ? "/" : `/play/${e.body?.levelId ?? ""}`);
          return;
        }
        setError(e instanceof Error ? e.message : "Không tải được kết quả.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (error) return <GameErrorCard title="Không tìm thấy kết quả" message={error} />;
  if (!data) return <GameLoading text="Đang tính sao…" />;

  const { level, world, total, stars, passed, questions, mode, boss, unlockedLevel, nextLevel, coinsEarned } = data;
  const review = mode === "REVIEW";
  const title = review
    ? data.correct === total ? "Ôn xong hết rồi!" : "Cố lên, ôn thêm nhé!"
    : boss ? (stars > 0 ? "Hạ boss rồi! ⚔️" : "Boss vẫn còn đó!")
    : stars === 3 ? "Xuất sắc!" : stars === 2 ? "Giỏi lắm!" : stars === 1 ? "Qua level rồi!" : "Suýt nữa rồi!";

  return (
    <main className="space-bg center-screen">
      <div className="result-card">
        <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
          {world.name} · {review ? "Ôn tập" : `Level ${level.number} · ${level.title}`}
        </p>
        <h1 className="title-kid" style={{ marginTop: 6 }}>{title}</h1>
        {!review && <div className="result-stars"><Stars n={stars} size={64} /></div>}
        <div className="result-score">Em trả lời đúng {data.correct}/{total} câu</div>
        {coinsEarned > 0 && <p className="result-coins">Em nhận được 🪙 +{coinsEarned} xu</p>}
        {!passed && !review && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Cần đúng ít nhất {data.passMark} câu để qua level. Chơi lại nhé, câu hỏi sẽ được đổi!
          </p>
        )}
        {unlockedLevel && <div className="banner-unlock">🔓 Đã mở Level {unlockedLevel.number} · {unlockedLevel.title}</div>}

        <div className="result-list">
          {questions.map((q, i) => {
            const answered = q.correct !== null;
            return (
              <div key={q.id} className="result-item">
                <span>{answered ? (q.correct ? "✅" : "❌") : "⬜"}</span>
                <span>
                  <b>Câu {i + 1}.</b> {q.prompt}
                  {!answered && <em className="muted"> (chưa trả lời)</em>}
                  {answered && !q.correct && (
                    <span style={{ display: "block", marginTop: 4 }}>
                      Đáp án đúng: <b>{q.options[q.correctIndex]}</b>
                      <span className="muted"> — {q.explanation}</span>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="result-actions">
          {review ? (
            <Link href="/" className="btn btn-primary btn-lg">Về các thế giới</Link>
          ) : (
            <>
              <Link href={`/world/${world.slug}`} className="btn btn-light btn-lg">Danh sách level</Link>
              <Link href={`/play/${level.id}`} className="btn btn-light btn-lg">Chơi lại ↻</Link>
              {passed && nextLevel && (
                <Link href={`/play/${nextLevel.id}`} className="btn btn-primary btn-lg">Level {nextLevel.number} ▶</Link>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
