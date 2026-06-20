import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { registerRoutes } from "./routes.js";
import { registerDoctorRoutes } from "./doctor.js";
import { freePort, isAddrInUse } from "./lib/freePort.js";
import { initDatabase } from "./db/init.js";
import { disconnectDatabase } from "./db/client.js";
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const CORS_ORIGINS = [
    process.env.CORS_ORIGIN ?? "http://localhost:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175"
].filter((origin, index, list) => list.indexOf(origin) === index);
const isLocalDevOrigin = (origin) => !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL ?? "info",
        transport: process.env.NODE_ENV === "production"
            ? undefined
            : {
                target: "pino-pretty",
                options: { colorize: true, translateTime: "SYS:standard" }
            }
    },
    requestIdHeader: "x-request-id",
    genReqId: (req) => req.headers["x-request-id"] ??
        `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
});
app.addHook("onResponse", async (req, reply) => {
    req.log.info({
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        responseTimeMs: Math.round(reply.elapsedTime)
    }, "request completed");
});
app.setErrorHandler((err, req, reply) => {
    req.log.error({ err, requestId: req.id, url: req.url }, "unhandled error");
    const e = err;
    const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
    reply.code(status).send({
        error: status === 500 ? "internal_error" : "request_failed",
        message: status === 500 ? "Internal server error" : (e.message ?? "Request failed"),
        requestId: req.id
    });
});
await initDatabase(app.log);
await app.register(cors, {
    origin: (origin, cb) => {
        if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
            cb(null, true);
            return;
        }
        if (origin && CORS_ORIGINS.includes(origin)) {
            cb(null, true);
            return;
        }
        cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"]
});
await app.register(helmet, { contentSecurityPolicy: false });
await registerRoutes(app);
await registerDoctorRoutes(app);
async function listen(retried = false) {
    try {
        await app.listen({ port: PORT, host: HOST });
        app.log.info({ port: PORT, host: HOST, nodeEnv: process.env.NODE_ENV ?? "development" }, "CareConnect API listening");
    }
    catch (err) {
        if (!retried && isAddrInUse(err) && process.env.NODE_ENV !== "production") {
            app.log.warn(`Port ${PORT} already in use — stopping old process and retrying…`);
            freePort(PORT);
            await new Promise((r) => setTimeout(r, 400));
            return listen(true);
        }
        app.log.error(err);
        process.exit(1);
    }
}
async function shutdown(signal) {
    app.log.info({ signal }, "shutting down");
    try {
        await app.close();
        await disconnectDatabase(app.log);
        process.exit(0);
    }
    catch (err) {
        app.log.error({ err }, "shutdown error");
        process.exit(1);
    }
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
await listen();
