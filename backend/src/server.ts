import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const CORS_ORIGINS = [
  process.env.CORS_ORIGIN ?? "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter((origin, index, list) => list.indexOf(origin) === index);

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" }
          }
  }
});

await app.register(cors, {
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"]
});
await app.register(helmet, { contentSecurityPolicy: false });
await registerRoutes(app);

app.listen({ port: PORT, host: HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

