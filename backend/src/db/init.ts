import { connectDatabase } from "./client.js";
import { useMemoryStorage, getStorageMode } from "./connectionState.js";
import { loadProfileState } from "./profileState.js";
import { loadRuntimeState } from "./runtimeState.js";
import { seedDatabase } from "./repositories.js";

export async function initDatabase(log?: {
  info: (o: object, msg: string) => void;
  warn: (o: object, msg: string) => void;
  error: (o: object, msg: string) => void;
}) {
  try {
    await connectDatabase(log);
    await seedDatabase();
    await Promise.all([loadProfileState(), loadRuntimeState()]);
    log?.info({ storage: getStorageMode() }, "database initialized");
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      log?.error({ err }, "database connection failed");
      throw err;
    }
    useMemoryStorage();
    await seedDatabase();
    await Promise.all([loadProfileState(), loadRuntimeState()]);
    log?.warn(
      { err, storage: getStorageMode() },
      "PostgreSQL unavailable — using in-memory store (development only). Run: docker compose up -d postgres"
    );
  }
}
