import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { liveProduct } from "@/lib/store";
import {
  addProductImage, removeProductImage, moveProductImage,
  productImages, MAX_PRODUCT_IMAGES,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Product image upload. Admin only.
 *
 * Anything arriving here is attacker-controlled, so:
 *  - the session is re-checked (middleware does not cover API routes)
 *  - the type is taken from an allowlist, never from the filename
 *  - the stored filename is generated, never the client's (a name like
 *    "../../server.js" must not be able to escape the upload directory)
 *  - size is capped before anything is written to disk
 *
 * Files land in the DATA_DIR volume, not public/. That works locally and
 * host; on a read-only filesystem (Vercel) swap the write below for S3 /
 * Vercel Blob and return the resulting URL — nothing else changes.
 */

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

// Outside public/ on purpose — see storage.ts. Served by the /uploads
// route handler, which is what keeps the database beside it unreachable.
import { UPLOAD_DIR } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const slug = String(form.get("slug") ?? "");
  const file = form.get("file");

  if (!liveProduct(slug)) {
    return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "Images must be 6 MB or smaller." },
      { status: 413 },
    );
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "bad_type", message: "Use JPG, PNG, WebP or AVIF." },
      { status: 415 },
    );
  }

  if (productImages(slug).length >= MAX_PRODUCT_IMAGES) {
    return NextResponse.json(
      {
        error: "too_many",
        message: `That product already has ${MAX_PRODUCT_IMAGES} photos. Remove one first.`,
      },
      { status: 409 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Verify the magic bytes actually match the declared type — the
  // Content-Type header is client-supplied and trivially spoofed.
  if (!looksLikeImage(bytes, file.type)) {
    return NextResponse.json(
      { error: "bad_type", message: "That file is not the image type it claims to be." },
      { status: 415 },
    );
  }

  // Generated name: slug for readability, uuid so re-uploads bust caches
  // and so nothing the client sent can influence the path.
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 60);
  const filename = `${safeSlug}-${randomUUID().slice(0, 8)}${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const dest = path.join(UPLOAD_DIR, filename);

  // Belt and braces: the resolved path must still be inside the folder.
  if (!dest.startsWith(UPLOAD_DIR + path.sep)) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 });
  }

  await fs.writeFile(dest, bytes);

  const url = `/uploads/${filename}`;
  if (!addProductImage(slug, url)) {
    // Written to disk already, but not recorded — the cap is the only
    // way this fails, and the orphan is harmless.
    return NextResponse.json(
      {
        error: "too_many",
        message: `That product already has ${MAX_PRODUCT_IMAGES} photos. Remove one first.`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, url, images: productImages(slug) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("slug") ?? "");
  if (!liveProduct(slug)) {
    return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  }
  // `url` removes one photo; without it the whole set is cleared. The
  // files are left on disk rather than risking a delete driven by a
  // database value.
  const url = searchParams.get("url");
  removeProductImage(slug, url && url.startsWith("/uploads/") ? url : null);
  return NextResponse.json({ ok: true, images: productImages(slug) });
}

/** Magic-byte sniff for the four allowed formats. */
function looksLikeImage(b: Buffer, mime: string): boolean {
  if (b.length < 12) return false;
  switch (mime) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return (
        b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
        b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
      );
    case "image/webp":
      return b.subarray(0, 4).toString("ascii") === "RIFF" &&
        b.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/avif":
      return b.subarray(4, 8).toString("ascii") === "ftyp";
    default:
      return false;
  }
}

/**
 * Reorders one photograph within a product.
 *
 * `dir` is -1 or 1. The first image is what shop tiles and cart lines
 * show, so moving one to the front is how you choose the main photo.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("slug") ?? "");
  const url = String(searchParams.get("url") ?? "");
  const dir = Number(searchParams.get("dir"));

  if (!liveProduct(slug)) {
    return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  }
  if (!url.startsWith("/uploads/") || (dir !== -1 && dir !== 1)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  moveProductImage(slug, url, dir as -1 | 1);
  return NextResponse.json({ ok: true, images: productImages(slug) });
}
