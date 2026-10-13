"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ProfileResponse } from "./api-types";
import { getProfile } from "./client";

// Kho hồ sơ game dùng chung cho cả trang (xu, trang phục, tiến độ): một bản trong module, mọi component
// (pill xu ở Trang chủ, topbar game, shop) cùng đăng ký nghe. Không cần Provider nên Trang chủ vẫn là
// Server Component.

type State = { profile: ProfileResponse | null; error: string | null; loading: boolean };

let state: State = { profile: null, error: null, loading: false };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const getSnapshot = () => state;
const SERVER_STATE: State = { profile: null, error: null, loading: true };
const getServerSnapshot = () => SERVER_STATE;

/** Tải lại hồ sơ từ server; các lần gọi chồng nhau dùng chung một request. */
export function refreshProfile(): Promise<void> {
  if (inflight) return inflight;
  emit({ loading: true });
  inflight = getProfile()
    .then((profile) => emit({ profile, error: null, loading: false }))
    .catch((e: Error) => emit({ error: e.message, loading: false }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Cập nhật ngay một phần hồ sơ (vd. xu vừa nhận) để mọi nơi hiển thị không phải chờ tải lại. */
export function patchProfile(patch: Partial<ProfileResponse>) {
  if (!state.profile) return;
  emit({ profile: { ...state.profile, ...patch } });
}

export function useGameProfile() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    // Tải khi gắn vào trang và mỗi lần route được hiện lại (effect chạy lại) để số liệu luôn mới.
    void refreshProfile();
  }, []);
  const refresh = useCallback(() => refreshProfile(), []);
  return { profile: s.profile, error: s.error, loading: s.loading, refresh };
}
