import "server-only";
import path from "node:path";

/**
 * Where everything that must survive a deploy lives.
 *
 * Railway — and most small hosts — allow exactly one volume per service
 * ("Each service can only have a single volume"), so the database and the
 * uploaded photographs cannot each have their own mount. They share one
 * directory instead, with the database in a subfolder rather than beside
 * the images.
 *
 * Uploads deliberately do NOT live under public/. Anything in public/ is
 * served as a static file, which would publish the SQLite database to
 * anyone who guessed the filename. They are streamed by the /uploads
 * route handler instead, which only ever serves images from this folder.
 *
 * Point DATA_DIR at the volume mount; it defaults to .data for local
 * development, which is what the repository already ignores.
 */
export const DATA_DIR = path.resolve(
  process.env.DATA_DIR?.trim() || path.join(process.cwd(), ".data"),
);

export const DB_PATH = path.join(DATA_DIR, "arena.db");

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
