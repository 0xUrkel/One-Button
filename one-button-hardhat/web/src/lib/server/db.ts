import { promises as fs } from "fs";
import path from "path";
import type { LocalDb } from "@/lib/types/social";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "one-button-social.json");

const EMPTY_DB: LocalDb = {
  profiles: {},
  leaderboard: {},
  nonces: {},
  pendingLinks: {},
};

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

export async function readDb(): Promise<LocalDb> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as LocalDb;
}

export async function writeDb(nextDb: LocalDb): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(nextDb, null, 2), "utf8");
}

export async function updateDb(
  updater: (db: LocalDb) => LocalDb | Promise<LocalDb>,
): Promise<LocalDb> {
  const current = await readDb();
  const updated = await updater(current);
  await writeDb(updated);
  return updated;
}

export function getXScope() {
  return "users.read tweet.read offline.access";
}
