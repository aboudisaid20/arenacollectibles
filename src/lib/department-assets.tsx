import "server-only";
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { Category } from "./types";

/**
 * ============================================================
 *  DEPARTMENT IMAGERY
 * ============================================================
 *
 *  HOW TO ADD YOUR OWN PICTURES
 *  ----------------------------
 *  Two per department, in  public/departments , numbered 1 and 2:
 *
 *      1 → shown at rest
 *      2 → shown while the tile is hovered (or pressed, on a phone)
 *
 *  Name them after the department and end with the number:
 *
 *      Cards 1.png              Cards 2.png
 *      Sealed Boxes 1.png       Sealed Boxes 2.png
 *      Signed Memorabilia 1.png Signed Memorabilia 2.png
 *      Supplies 1.png           Supplies 2.png
 *
 *  Matching ignores case, spaces, hyphens and underscores, so
 *  "sealed boxes 1.png" and "Sealed-Boxes-1.png" both work. .jpg, .jpeg,
 *  .png, .webp and .avif are all accepted.
 *
 *  Nothing else to change — the folder is read per request, so a file
 *  shows up on the next refresh. A department with no image falls back to
 *  the artwork of a representative product; with only a "1" it simply
 *  does not change on hover.
 *
 *  Any shape works. They are rendered with object-contain inside a 5:6
 *  well, so the whole picture is always visible — nothing is cropped —
 *  and a shape that does not match the well simply sits centred with the
 *  tile background around it. Portrait suits these tiles best. At least
 *  1200px on the long edge.
 */

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const DIR = path.join(process.cwd(), "public", "departments");

/**
 * Accepted names per department, already normalised.
 *
 * Longest first — "signedmemorabilia" has to be tested before "signed",
 * and "sealedboxes" before "boxes", or a shorter alias would claim the
 * file first.
 */
const ALIASES: Record<Category, string[]> = {
  card: ["cards", "card"],
  wax: ["sealedboxes", "sealedbox", "sealed", "wax", "boxes"],
  signed: ["signedmemorabilia", "memorabilia", "signed"],
  supplies: ["supplies", "supply"],
};

/** Strip everything that varies between how people type a filename. */
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface DepartmentImages {
  /** At rest. */
  rest: string | null;
  /** On hover / press. Null when only one picture was supplied. */
  hover: string | null;
  /** Width / height of the resting picture, or null if unreadable. */
  ratio: number | null;
}

/**
 * Width and height straight from the file header.
 *
 * Only the first few bytes are read — enough for PNG (fixed IHDR) and
 * JPEG (scan to the first SOF marker). Anything else returns null and is
 * treated as square, which is the safe default: it just means no size
 * correction is applied.
 */
function imageSize(file: string): { w: number; h: number } | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(file, "r");
    const head = Buffer.alloc(32);
    fs.readSync(fd, head, 0, 32, 0);

    // PNG: 8-byte signature, then IHDR with width/height at 16..24.
    if (head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    }

    // JPEG: walk the segment chain to a start-of-frame marker.
    if (head[0] === 0xff && head[1] === 0xd8) {
      const { size } = fs.fstatSync(fd);
      const buf = Buffer.alloc(Math.min(size, 256 * 1024));
      fs.readSync(fd, buf, 0, buf.length, 0);
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        // SOF0-SOF15, skipping the four that are not frame headers.
        if (marker >= 0xc0 && marker <= 0xcf &&
            marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch {} }
  }
}

/** Stand-in product whose artwork represents the department. */
export const DEPARTMENT_FALLBACK_SLUG: Record<Category, string> = {
  wax: "1986-fleer-basketball-wax-box-bbce",
  card: "1986-fleer-jordan-rookie-psa-10",
  signed: "ali-signed-everlast-glove",
  supplies: "arena-one-touch-magnetic-35pt",
};

/**
 * Reads the folder and works out which file belongs to which department
 * and which slot.
 *
 * Done by scanning rather than by exact filename so the pictures can be
 * named the way a person would name them. The whole folder is read once
 * per call and the result is a plain map.
 */
export function departmentImages(): Record<Category, DepartmentImages> {
  const out: Record<Category, DepartmentImages> = {
    wax: { rest: null, hover: null, ratio: null },
    card: { rest: null, hover: null, ratio: null },
    signed: { rest: null, hover: null, ratio: null },
    supplies: { rest: null, hover: null, ratio: null },
  };

  let files: string[];
  try {
    files = fs.readdirSync(DIR);
  } catch {
    // No folder yet, or unreadable — every department falls back.
    return out;
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.has(ext)) continue;

    const base = normalise(path.basename(file, path.extname(file)));

    // Trailing 1 or 2 picks the slot. Anything else is treated as "1", so
    // a single unnumbered picture still shows.
    const slot = base.endsWith("2") ? "hover" : "rest";
    const stem = base.replace(/[12]$/, "");

    const category = (Object.keys(ALIASES) as Category[]).find((cat) =>
      ALIASES[cat].some((alias) => stem === alias || stem.includes(alias)),
    );
    if (!category) continue;

    // Spaces and other URL-unsafe characters have to survive the trip.
    out[category][slot] = `/departments/${encodeURIComponent(file)}`;

    // The resting picture sets the shape used for size correction.
    if (slot === "rest") {
      const dim = imageSize(path.join(DIR, file));
      out[category].ratio = dim && dim.h > 0 ? dim.w / dim.h : null;
    }
  }

  return out;
}

/**
 * The pair of pictures for one tile.
 *
 * Both are rendered and cross-faded on opacity rather than swapped on
 * `src`, so the hover image is already decoded when it is needed — a
 * src swap would show a blank frame on first hover.
 *
 * `group-active` is what covers touch: a phone has no hover, but the
 * tile is `:active` while a finger is on it, so pressing reveals the
 * second picture and lifting follows the link.
 *
 * SIZE CORRECTION. In a square well, `object-contain` fits a square
 * picture to the width and a portrait one to the height — so both end up
 * the full height of the tile, and the portrait reads as the larger
 * object because its subject fills its frame edge to edge while a square
 * crop carries its own margin. Portraits are therefore given a vertical
 * inset, which caps their height below the square's and brings the three
 * subjects to roughly the same visual size.
 */
const PORTRAIT_BELOW = 0.9;

export function DepartmentPhotos({ images }: { images: DepartmentImages }) {
  if (!images.rest && !images.hover) return null;
  const rest = images.rest ?? images.hover!;
  const hover = images.hover;

  // Unknown shape is treated as square: no correction, nothing breaks.
  const portrait = images.ratio !== null && images.ratio < PORTRAIT_BELOW;
  const box = portrait ? "absolute inset-y-[9%] inset-x-0" : "absolute inset-0";

  const common = "object-contain transition-opacity duration-500";
  const sizes = "(min-width: 1024px) 34vw, (min-width: 640px) 48vw, 92vw";

  return (
    <div className={box}>
      <Image
        src={rest}
        // Decorative: the department name is rendered as text right below.
        alt=""
        fill
        sizes={sizes}
        className={`${common} ${
          hover ? "group-hover:opacity-0 group-active:opacity-0" : ""
        }`}
      />
      {hover && (
        <Image
          src={hover}
          alt=""
          fill
          sizes={sizes}
          className={`${common} opacity-0 group-hover:opacity-100 group-active:opacity-100`}
        />
      )}
    </div>
  );
}
