/**
 * File storage for assignment uploads.
 *
 * - Files are stored under a random key (`<32 hex>.<ext>`); the original name
 *   is kept only in the DB for display.
 * - The type is decided from the file's magic bytes, never from the client's
 *   MIME type or extension alone.
 * - Files are served only through `/api/files/[key]`, which authorises the
 *   viewer (owner, teacher of the owner's class, or admin).
 *
 * Adapters: `LocalDiskStorage` (default; `UPLOAD_DIR`, mount a persistent
 * volume on Railway). To add S3-compatible storage, implement
 * `StorageAdapter` (put/get/delete by key — e.g. with @aws-sdk/client-s3
 * PutObject/GetObject/DeleteObject against R2/MinIO/S3) and return it from
 * `storage()` when e.g. `S3_BUCKET` is set. Keys and the DB schema stay the same.
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type FileKind = "pdf" | "jpg" | "png" | "webp" | "heic" | "docx";

export const MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const KEY_RE = /^[a-f0-9]{32}\.(pdf|jpg|png|webp|heic|docx)$/;

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

function ascii(b: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function includesAscii(b: Uint8Array, needle: string, limit = b.length): boolean {
  const n = needle.length;
  const max = Math.min(b.length, limit) - n;
  outer: for (let i = 0; i <= max; i++) {
    for (let j = 0; j < n; j++) if (b[i + j] !== needle.charCodeAt(j)) continue outer;
    return true;
  }
  return false;
}

/** Detect the file type from its first bytes. Returns null for anything not allowed. */
export function sniffFileType(bytes: Uint8Array): FileKind | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
    return null;
  }
  // DOCX = ZIP containing word/… parts. File names in ZIP headers are stored uncompressed.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    if (includesAscii(bytes, "word/") && includesAscii(bytes, "[Content_Types].xml")) return "docx";
    return null;
  }
  return null;
}

export function randomKey(kind: FileKind): string {
  return `${randomBytes(16).toString("hex")}.${kind}`;
}

/** Keep a display-safe file name (no path, no control chars, ≤ 120 chars). */
export function safeFileName(name: string, kind: FileKind): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f\u007f"<>|]/g, "").trim();
  const clean = base.slice(0, 120) || `file.${kind}`;
  return clean;
}

export interface StorageAdapter {
  put(key: string, data: Uint8Array, mime: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}
  private file(key: string): string {
    if (!isValidKey(key)) throw new Error("invalid storage key");
    return path.join(this.root, key.slice(0, 2), key);
  }
  async put(key: string, data: Uint8Array, _mime?: string): Promise<void> {
    void _mime; // local disk keeps bytes only; MIME is re-sniffed on read
    const f = this.file(key);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, data, { flag: "wx" });
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      const f = this.file(key);
      await stat(f);
      return await readFile(f);
    } catch {
      return null;
    }
  }
  async delete(key: string): Promise<void> {
    try {
      await rm(this.file(key), { force: true });
    } catch {
      /* already gone */
    }
  }
}

let instance: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (!instance) instance = new LocalDiskStorage(path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./.uploads"));
  return instance;
}

export type UploadCheck = { ok: true; kind: FileKind; mime: string; bytes: Uint8Array } | { ok: false; error: string };

/** Validate an uploaded File: size and magic bytes. */
export async function checkUpload(file: File | null | undefined): Promise<UploadCheck> {
  if (!file || typeof file === "string" || file.size === 0) return { ok: false, error: "กรุณาเลือกไฟล์ใบงานก่อนกดส่ง" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "ไฟล์มีขนาดเกิน 10 MB กรุณาลดขนาดรูปหรือบันทึกเป็น PDF แล้วส่งใหม่" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffFileType(bytes);
  if (!kind) return { ok: false, error: "รองรับเฉพาะไฟล์ PDF, JPG, PNG, WEBP, HEIC หรือ DOCX กรุณาตรวจสอบไฟล์แล้วส่งใหม่" };
  return { ok: true, kind, mime: MIME[kind], bytes };
}
