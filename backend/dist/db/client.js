import { PrismaClient } from "@prisma/client";
import { isMemoryStorage } from "./connectionState.js";
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "production"
            ? [{ emit: "event", level: "error" }, { emit: "event", level: "warn" }]
            : [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
export async function connectDatabase(log) {
    try {
        await prisma.$connect();
        log?.info({}, "database connected");
        return true;
    }
    catch (err) {
        log?.error({ err }, "database connection failed");
        throw err;
    }
}
export async function disconnectDatabase(log) {
    await prisma.$disconnect();
    log?.info({}, "database disconnected");
}
export async function pingDatabase() {
    if (isMemoryStorage())
        return true;
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
