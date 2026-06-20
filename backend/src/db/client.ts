import { PrismaClient } from "@prisma/client";
import { getStorageMode, isMemoryStorage } from "./connectionState.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? [{ emit: "event", level: "error" }, { emit: "event", level: "warn" }]
        : [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type AppLog = {
  info: (o: object, msg: string) => void;
  warn: (o: object, msg: string) => void;
  error: (o: object, msg: string) => void;
};

export async function connectDatabase(log?: AppLog) {
  try {
    await prisma.$connect();
    log?.info({}, "database connected");
    return true;
  } catch (err) {
    log?.error({ err }, "database connection failed");
    throw err;
  }
}

export async function disconnectDatabase(log?: { info: (o: object, msg: string) => void }) {
  await prisma.$disconnect();
  log?.info({}, "database disconnected");
}

export async function pingDatabase(): Promise<boolean> {
  if (isMemoryStorage()) return true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

