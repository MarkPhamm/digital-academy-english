import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";

// Kho hồ sơ: Netlify Blobs khi chạy trên Netlify / `netlify dev`; khi chạy `next dev` trần (không có môi trường
// Blobs) thì dùng file JSON trong .netlify/blobs-dev/ (đã gitignore) với cùng ngữ nghĩa etag để code không đổi.

export type Entry = { data: unknown; etag: string };
export type WriteOptions = { onlyIfMatch?: string; onlyIfNew?: boolean };

export interface ProfileStore {
  getWithMetadata(key: string): Promise<Entry | null>;
  setJSON(key: string, data: unknown, options: WriteOptions): Promise<{ modified: boolean }>;
}

class BlobsStore implements ProfileStore {
  private store = getStore({ name: STORE_NAME, consistency: "strong" });
  async getWithMetadata(key: string) {
    const entry = await this.store.getWithMetadata(key, { type: "json" });
    return entry ? { data: entry.data, etag: entry.etag ?? "" } : null;
  }
  async setJSON(key: string, data: unknown, options: WriteOptions) {
    const { modified } = options.onlyIfNew
      ? await this.store.setJSON(key, data, { onlyIfNew: true })
      : await this.store.setJSON(key, data, { onlyIfMatch: options.onlyIfMatch });
    return { modified };
  }
}

class FileStore implements ProfileStore {
  constructor(private dir: string) {}
  private file(key: string) {
    return path.join(this.dir, key.replace(/[^A-Za-z0-9_-]/g, "_") + ".json");
  }
  async getWithMetadata(key: string) {
    try {
      const raw = await readFile(this.file(key), "utf8");
      return { data: JSON.parse(raw), etag: createHash("sha1").update(raw).digest("hex") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async setJSON(key: string, data: unknown, options: WriteOptions) {
    const current = await this.getWithMetadata(key);
    if (options.onlyIfNew && current) return { modified: false };
    if (options.onlyIfMatch !== undefined && current?.etag !== options.onlyIfMatch) return { modified: false };
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(key), JSON.stringify(data), "utf8");
    return { modified: true };
  }
}

export const STORE_NAME = "game-profiles";

let cached: ProfileStore | null = null;

/** Blobs nếu có môi trường Netlify, không thì file store cục bộ (chỉ dành cho phát triển). */
export function getProfileStore(): ProfileStore {
  if (cached) return cached;
  try {
    cached = new BlobsStore();
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn("[game] Không có Netlify Blobs (đang chạy `next dev`?) — dùng kho file .netlify/blobs-dev/");
    cached = new FileStore(path.join(process.cwd(), ".netlify", "blobs-dev", STORE_NAME));
  }
  return cached;
}
