import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serves admin-uploaded product photographs.
 *
 * They used to sit in public/ and be served statically. They now live on
 * the single persistent volume alongside the database, which cannot be
 * served statically — doing so would publish arena.db to anyone who
 * guessed the name. This handler is the replacement, and it is
 * deliberately narrow:
 *
 *  - the path is rebuilt from its segments and re-checked against the
 *    upload directory, so ../ cannot climb out of it
 *  - only known image extensions are served, so the database and any
 *    stray file are unreachable even by exact name
 *
 * Filenames are content-addressed on upload, so a long cache is safe.
 */
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string[] }> },
) {
  const { file } = await params;
  const name = path.basename((file ?? []).join("/"));
  const ext = path.extname(name).toLowerCase();

  const type = TYPES[ext];
  if (!type) return new NextResponse("Not found", { status: 404 });

  const full = path.join(UPLOAD_DIR, name);
  // Belt and braces: basename already flattens the path, but the
  // containment check is what this rests on, so it is made explicitly.
  if (full !== path.join(UPLOAD_DIR, path.basename(full))) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await fs.readFile(full);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
