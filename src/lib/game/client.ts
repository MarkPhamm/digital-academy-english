"use client";
import {
  type AnswerBody,
  type AnswerResponse,
  type ApiErrorBody,
  type ApiErrorCode,
  type AttemptResultResponse,
  type BuySkinBody,
  type EquipSkinBody,
  type FinishResponse,
  GAME_API_BASE,
  type ProfileResponse,
  type SkinsResponse,
  type StartAttemptBody,
  type StartAttemptResponse,
} from "./api-types";

/** Lỗi từ `/api/game/*`: giữ status và mã lỗi để giao diện xử lý (403 khoá, 409 thiếu xu…). */
export class GameApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: ApiErrorCode,
    public body?: ApiErrorBody,
  ) {
    super(message);
  }
}

export async function gameFetch<T>(path: string, init: RequestInit = {}, fallback = "Có lỗi rồi, em thử lại nhé."): Promise<T> {
  const r = await fetch(GAME_API_BASE + path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  let j: unknown = null;
  try {
    j = await r.json();
  } catch {
    // body rỗng hoặc không phải JSON
  }
  if (!r.ok) {
    const body = (j ?? {}) as ApiErrorBody;
    throw new GameApiError(body.error ?? fallback, r.status, body.code, body);
  }
  return j as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const getProfile = () => gameFetch<ProfileResponse>("/profile");
export const startAttempt = (body: StartAttemptBody) => gameFetch<StartAttemptResponse>("/attempts", post(body), "Không bắt đầu được lượt chơi");
export const answerAttempt = (id: string, body: AnswerBody) => gameFetch<AnswerResponse>(`/attempts/${id}/answer`, post(body), "Lỗi chấm bài");
export const finishAttempt = (id: string) => gameFetch<FinishResponse>(`/attempts/${id}/finish`, { method: "POST" });
export const getAttempt = (id: string) => gameFetch<AttemptResultResponse>(`/attempts/${id}`);
export const buySkin = (body: BuySkinBody) => gameFetch<SkinsResponse>("/skins/buy", post(body));
export const equipSkin = (body: EquipSkinBody) => gameFetch<SkinsResponse>("/skins/equip", post(body));
