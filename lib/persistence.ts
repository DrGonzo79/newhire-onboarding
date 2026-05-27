import fs from "fs";
import path from "path";
import type { NewHire } from "./types";

// ---- Persistence layer --------------------------------------------------
// Prototype-grade durable storage: the in-memory store is snapshotted to a
// JSON file (separate from OrderDesk's orders.json) so new hires survive
// dev-server restarts. The store interface is the swap point — replacing this
// with SQLite/Postgres later means re-implementing loadState/saveState only.

export interface PersistedState {
  newHires: NewHire[];
  seeded: boolean;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "newhires.json");

export function loadState(): PersistedState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.newHires)) return null;
    return parsed;
  } catch (err) {
    console.warn(
      `[newhire/persistence] Failed to load saved hires, starting fresh: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // Write to a temp file then rename so a crash mid-write can't corrupt the
    // snapshot.
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.warn(
      `[newhire/persistence] Failed to save hires: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
